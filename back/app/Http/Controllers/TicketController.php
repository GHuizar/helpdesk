<?php

namespace App\Http\Controllers;

use App\Contracts\DepartamentoRepositoryInterface;
use App\Contracts\RoleRepositoryInterface;
use App\Http\Requests\StoreTicketRequest;
use App\Models\User;
use App\Services\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Tickets (plantilla, incremento 2): catalogo de tipos, mis tickets, listado
 * para staff, y creacion (self por el usuario, o manual por operador/admin).
 */
class TicketController extends Controller
{
    public function __construct(
        private readonly TicketService $service,
        private readonly RoleRepositoryInterface $roles,
        private readonly DepartamentoRepositoryInterface $deptos,
    ) {}

    /** Catalogo de tipos de ticket (activos). */
    public function tipos(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->service->tipos(),
        ]);
    }

    /** Catalogo de departamentos (desde la BD central). */
    public function departamentos(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->deptos->all(),
        ]);
    }

    /** Tickets del usuario autenticado. */
    public function myTickets(Request $request): JsonResponse
    {
        $nomina = (int) $request->user()->nomina;

        return response()->json([
            'status' => 'success',
            'data' => $this->service->misTickets($nomina),
        ]);
    }

    /** Listado de tickets + resumen. Operador: solo los asignados; admin: todos. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $filters = [
            'estado' => $request->query('estado'),
            'search' => $request->query('search'),
            'viewer' => (int) $user->nomina, // para el badge de "mensajes nuevos" (notis no leidas de este usuario)
        ];

        // Un operador solo ve los tickets que tiene asignados.
        $responsable = null;
        if ($this->roles->getRole((int) $user->nomina) === 'operador') {
            $responsable = (int) $user->nomina;
            $filters['responsable'] = $responsable;
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->service->todos($filters),
            'resumen' => $this->service->resumen($responsable),
        ]);
    }

    /** Crea un ticket (self o manual). */
    public function store(StoreTicketRequest $request): JsonResponse
    {
        $user = $request->user();
        $isStaff = $this->roles->hasRole((int) $user->nomina, ['admin', 'operador']);
        $manual = $isStaff && $request->boolean('manual');

        if ($manual) {
            // Alta manual por operador/admin: la identidad la captura el operador.
            $data = [
                'nomina' => $request->input('nomina'),
                'nombre' => $request->input('nombre'),
                'puesto' => $request->input('puesto'),
                'departamento' => $request->input('departamento'),
                'correo' => $request->input('correo'),
                'es_invitado' => 0,
                'tipo_id' => $request->input('tipo_id'),
                'problema' => $request->input('problema'),
                'creado_por_nomina' => (int) $user->nomina,
                'rustdesk' => $request->input('rustdesk'), // dato por usuario (se guarda aparte si hay nomina)
            ];
        } else {
            // Self: identidad PRELLENADA del usuario pero EDITABLE (puede corregir y completar
            // lo que le falte). La nomina se mantiene la del usuario autenticado (ancla de
            // propiedad para "mis tickets"), no se toma del cliente.
            $nombreUser = trim(($user->name ?? '') . ' ' . ($user->apellidopaterno ?? '') . ' ' . ($user->apellidomaterno ?? ''));
            $nombre = $request->filled('nombre') ? $request->input('nombre') : ($nombreUser !== '' ? $nombreUser : ('Nomina ' . $user->nomina));
            $data = [
                'nomina' => (int) $user->nomina,
                'nombre' => $nombre,
                'puesto' => $request->input('puesto'),
                'departamento' => $request->input('departamento'),
                'correo' => $request->filled('correo') ? $request->input('correo') : ($user->email ?? null),
                'es_invitado' => 0,
                'tipo_id' => $request->input('tipo_id'),
                'problema' => $request->input('problema'),
                'creado_por_nomina' => (int) $user->nomina,
            ];
        }

        $ticket = $this->service->crear($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket creado correctamente.',
            'data' => $ticket,
        ], 201);
    }

    // ----------------------------------------------------------------------
    //  Detalle: chat, notas internas, timeline y maquina de estados
    // ----------------------------------------------------------------------

    /** Detalle de un ticket + timeline (acceso: dueno o staff). */
    public function show(Request $request, int $id): JsonResponse
    {
        [$ticket, $isStaff] = $this->loadAccesible($request, $id);

        return response()->json([
            'status' => 'success',
            'data' => $ticket,
            'eventos' => $this->service->eventos($id),
            'archivos' => $this->service->archivos($id),
            'puede_staff' => $isStaff,
        ]);
    }

    /** Mensajes del ticket (las notas internas solo para staff). */
    public function mensajes(Request $request, int $id): JsonResponse
    {
        [, $isStaff] = $this->loadAccesible($request, $id);

        // Al ver la conversacion, sus notificaciones quedan leidas: limpia el badge de "mensajes
        // nuevos" del listado y marca (sin borrar) las entradas de la campanita de este ticket.
        $this->service->marcarTicketVisto($id, (int) $request->user()->nomina);

        return response()->json([
            'status' => 'success',
            'data' => $this->service->mensajes($id, $isStaff),
        ]);
    }

    /** Envia un mensaje al chat (o nota interna si es staff y lo pide). Acepta una imagen adjunta opcional. */
    public function enviarMensaje(Request $request, int $id): JsonResponse
    {
        [, $isStaff] = $this->loadAccesible($request, $id);

        $validated = $request->validate([
            'cuerpo' => ['required_without:imagen', 'nullable', 'string', 'max:5000'],
            'es_interno' => ['sometimes', 'boolean'],
            'imagen' => ['sometimes', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'], // 10 MB, solo imagenes
        ]);

        $esInterno = $isStaff && $request->boolean('es_interno');

        // Imagen adjunta del chat (opcional): se guarda en el storage privado del ticket.
        $rutaImagen = null;
        if ($request->hasFile('imagen')) {
            $rutaImagen = $request->file('imagen')->store("tickets/{$id}/chat", 'local');
        }

        $mensaje = $this->service->enviarMensaje($id, $this->actor($request), $validated['cuerpo'] ?? '', $isStaff, $esInterno, $rutaImagen);

        return response()->json([
            'status' => 'success',
            'data' => $mensaje,
        ], 201);
    }

    /** Sirve la imagen adjunta de un mensaje del chat (inline, con control de acceso). */
    public function imagenMensaje(Request $request, int $id, int $mensajeId): StreamedResponse
    {
        [, $isStaff] = $this->loadAccesible($request, $id);

        $msg = $this->service->mensaje($id, $mensajeId);
        abort_if(! $msg || ! $msg->imagen, 404, 'Imagen no encontrada.');
        abort_if((int) $msg->es_interno === 1 && ! $isStaff, 403); // imagen de nota interna: solo staff
        abort_unless(Storage::disk('local')->exists($msg->imagen), 404, 'Imagen no encontrada.');

        return Storage::disk('local')->response($msg->imagen);
    }

    /** Cambio de estado por STAFF (en_curso / pausado / cancelado / finalizado). */
    public function cambiarEstado(Request $request, int $id): JsonResponse
    {
        // Solo admin o el operador ASIGNADO a este ticket pueden cambiar su estado.
        [, $puedeStaff] = $this->loadAccesible($request, $id);
        abort_unless($puedeStaff, 403, 'No puedes gestionar este ticket.');

        $request->validate([
            'estado' => ['required', 'in:en_curso,cancelado,finalizado'],
            'justificacion' => ['nullable', 'string', 'max:500'],
        ]);

        $ticket = $this->service->cambiarEstado(
            $id,
            $this->actor($request),
            $request->input('estado'),
            $request->input('justificacion'),
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Estado actualizado.',
            'data' => $ticket,
        ]);
    }

    /** El USUARIO (dueno) valida el cierre: finalizado -> validado. */
    public function validar(Request $request, int $id): JsonResponse
    {
        $this->ensureOwner($request, $id);
        $ticket = $this->service->validarCierre($id, $this->actor($request));

        return response()->json([
            'status' => 'success',
            'message' => 'Cierre validado. Gracias.',
            'data' => $ticket,
        ]);
    }

    /** El USUARIO (dueno) reabre el ticket: finalizado -> abierto. */
    public function reabrir(Request $request, int $id): JsonResponse
    {
        $this->ensureOwner($request, $id);
        $ticket = $this->service->reabrir($id, $this->actor($request), $request->input('motivo'));

        return response()->json([
            'status' => 'success',
            'message' => 'El ticket se reabrio.',
            'data' => $ticket,
        ]);
    }

    // ----------------------------------------------------------------------
    //  Adjuntos (solo usuarios logueados; owner o staff)
    // ----------------------------------------------------------------------

    /** Sube un archivo de evidencia al ticket. */
    public function subirArchivo(Request $request, int $id): JsonResponse
    {
        $this->loadAccesible($request, $id);

        $request->validate([
            'archivo' => ['required', 'file', 'max:102400'], // 100 MB; cualquier tipo (incluye video)
        ]);

        $file = $request->file('archivo');
        $ruta = $file->store("tickets/{$id}", 'local');

        $this->service->registrarArchivo($id, [
            'nombre_original' => $file->getClientOriginalName(),
            'ruta' => $ruta,
            'mime' => $file->getClientMimeType(),
            'tamano' => $file->getSize(),
            'subido_por_nomina' => (int) $request->user()->nomina,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Archivo adjuntado.',
            'data' => $this->service->archivos($id),
        ], 201);
    }

    /** Lista los adjuntos del ticket (metadata: id, nombre, mime, quien lo subio). Para el visor. */
    public function archivos(Request $request, int $id): JsonResponse
    {
        $this->loadAccesible($request, $id);

        return response()->json([
            'status' => 'success',
            'data' => $this->service->archivos($id),
        ]);
    }

    /** Descarga un archivo del ticket. */
    public function descargarArchivo(Request $request, int $id, int $archivoId): StreamedResponse
    {
        $this->loadAccesible($request, $id);

        $archivo = $this->service->archivo($id, $archivoId);
        abort_if(! $archivo || ! Storage::disk('local')->exists($archivo->ruta), 404, 'Archivo no encontrado.');

        return Storage::disk('local')->download($archivo->ruta, $archivo->nombre_original);
    }

    // ----------------------------------------------------------------------
    //  Asignacion de responsable
    // ----------------------------------------------------------------------

    /** Catalogo de operadores/admins (para asignar responsable). */
    public function operadores(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->roles->staff(),
        ]);
    }

    /** Asigna o reasigna el responsable del ticket (solo admin, via ruta). */
    public function reasignar(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'responsable_nomina' => ['nullable', 'integer'],
        ]);

        $nomina = $request->input('responsable_nomina');
        $nombre = null;
        if ($nomina !== null) {
            $u = User::find((int) $nomina);
            $nombre = $u ? trim(($u->name ?? '') . ' ' . ($u->apellidopaterno ?? '')) : null;
        }

        $ticket = $this->service->reasignar($id, $this->actor($request), $nomina !== null ? (int) $nomina : null, $nombre);

        return response()->json([
            'status' => 'success',
            'message' => 'Responsable actualizado.',
            'data' => $ticket,
        ]);
    }

    /** Staff edita los datos del solicitante (p. ej. ticket de invitado ya identificado). */
    public function actualizarDatos(Request $request, int $id): JsonResponse
    {
        [, $puedeStaff] = $this->loadAccesible($request, $id);
        abort_unless($puedeStaff, 403, 'No puedes editar este ticket.');

        $request->validate([
            'nombre' => ['required', 'string', 'max:180'],
            'nomina' => ['nullable', 'integer'],
            'puesto' => ['nullable', 'string', 'max:180'],
            'departamento' => ['nullable', 'string', 'max:180'],
            'correo' => ['nullable', 'email', 'max:180'],
        ]);

        $ticket = $this->service->actualizarDatos(
            $id,
            $this->actor($request),
            $request->only(['nombre', 'nomina', 'puesto', 'departamento', 'correo']),
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Datos del solicitante actualizados.',
            'data' => $ticket,
        ]);
    }

    /** Guarda el codigo de RustDesk del solicitante (por nomina). Cualquier staff con acceso al ticket. */
    public function actualizarRustdesk(Request $request, int $id): JsonResponse
    {
        [, $puedeStaff] = $this->loadAccesible($request, $id);
        abort_unless($puedeStaff, 403, 'No puedes editar este ticket.');

        $request->validate([
            'rustdesk' => ['nullable', 'integer', 'min:0'],
        ]);

        $val = $request->input('rustdesk');
        $ticket = $this->service->actualizarRustdesk($id, $this->actor($request), ($val === null || $val === '') ? null : (int) $val);

        return response()->json([
            'status' => 'success',
            'message' => 'RustDesk actualizado.',
            'data' => $ticket,
        ]);
    }

    // ----------------------------------------------------------------------
    //  Helpers de acceso
    // ----------------------------------------------------------------------

    /**
     * Carga el ticket y valida acceso. Devuelve [ticket, puedeStaff].
     *  - admin: acceso total (puedeStaff = true).
     *  - operador: solo si es el responsable ASIGNADO (puedeStaff = true).
     *  - dueno (solicitante): acceso de lectura/respuesta (puedeStaff = false).
     */
    private function loadAccesible(Request $request, int $id): array
    {
        $ticket = $this->service->detalle($id);
        abort_if(! $ticket, 404, 'El ticket no existe.');

        $user = $request->user();
        $rol = $this->roles->getRole((int) $user->nomina);
        $isAdmin = $rol === 'admin';
        $isAssignedOperador = $rol === 'operador'
            && $ticket->responsable_nomina !== null
            && (int) $ticket->responsable_nomina === (int) $user->nomina;
        $isOwner = $ticket->nomina !== null && (int) $ticket->nomina === (int) $user->nomina;

        $puedeStaff = $isAdmin || $isAssignedOperador;
        abort_unless($puedeStaff || $isOwner, 403, 'No tienes acceso a este ticket.');

        return [$ticket, $puedeStaff];
    }

    /** Exige que el actor sea el dueno del ticket (para validar/reabrir). */
    private function ensureOwner(Request $request, int $id): void
    {
        $ticket = $this->service->detalle($id);
        abort_if(! $ticket, 404, 'El ticket no existe.');
        $user = $request->user();
        abort_unless(
            $ticket->nomina !== null && (int) $ticket->nomina === (int) $user->nomina,
            403,
            'Solo el solicitante puede validar o reabrir el ticket.'
        );
    }

    /** Datos del actor para mensajes/eventos. */
    private function actor(Request $request): array
    {
        $user = $request->user();
        $nombre = trim(($user->name ?? '') . ' ' . ($user->apellidopaterno ?? '') . ' ' . ($user->apellidomaterno ?? ''));

        return [
            'nomina' => (int) $user->nomina,
            'nombre' => $nombre !== '' ? $nombre : ('Nomina ' . $user->nomina),
        ];
    }
}
