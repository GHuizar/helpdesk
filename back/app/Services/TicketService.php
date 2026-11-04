<?php

namespace App\Services;

use App\Contracts\LogRepositoryInterface;
use App\Contracts\NotificacionRepositoryInterface;
use App\Contracts\TicketRepositoryInterface;
use App\Contracts\UserRepositoryInterface;
use App\Contracts\UsuarioDatoRepositoryInterface;
use App\Mail\TicketNotificacionMail;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Logica de negocio de tickets.
 * - Creacion: folio (TK-000001) + responsable automatico por tipo.
 * - Detalle: mensajes (chat + notas internas) y eventos (timeline).
 * - Maquina de estados con justificacion obligatoria en pausa/cancelacion y
 *   doble confirmacion de cierre (operador finaliza -> usuario valida o reabre).
 */
class TicketService
{
    /** Transiciones permitidas para STAFF (operador/admin) por estado actual. */
    private const TRANSICIONES_STAFF = [
        'abierto'    => ['en_curso', 'cancelado'],
        'en_curso'   => ['cancelado', 'finalizado'],
        'cancelado'  => [],
        'finalizado' => [],   // desde finalizado decide el USUARIO (validar/reabrir)
        'validado'   => [],
    ];

    /** Estados que exigen justificacion del operador. */
    private const REQUIERE_JUSTIFICACION = ['cancelado'];

    public function __construct(
        private readonly TicketRepositoryInterface $tickets,
        private readonly LogRepositoryInterface $logs,
        private readonly NotificacionRepositoryInterface $notifs,
        private readonly UserRepositoryInterface $users,
        private readonly UsuarioDatoRepositoryInterface $usuarioDatos,
    ) {}

    /** Registra una accion en la bitacora global (best-effort). */
    private function log(?int $nomina, ?string $nombre, string $accion, $entidadId, ?string $detalle = null): void
    {
        $this->logs->add([
            'actor_nomina' => $nomina,
            'actor_nombre' => $nombre,
            'accion' => $accion,
            'entidad' => 'ticket',
            'entidad_id' => (string) $entidadId,
            'detalle' => $detalle,
        ]);
    }

    /**
     * Notifica al destinatario: crea la notificacion in-app (campanita) y, si $conCorreo es true,
     * ademas envia un correo (best-effort; un fallo de SMTP no rompe la accion). No notifica si el
     * destino es nulo o es el propio actor (no te notificas a ti mismo).
     * $email: correo explicito del destinatario (p. ej. el del solicitante en el ticket);
     * si es null, se resuelve por nomina desde la BD central.
     * $conCorreo: false para dejar SOLO la campanita, sin correo (p. ej. en cada mensaje del chat).
     */
    private function notificar(?int $destino, ?int $actorNomina, int $ticketId, ?string $folio, string $tipo, string $titulo, ?string $cuerpo = null, ?string $email = null, bool $conCorreo = true): void
    {
        if ($destino === null || $destino === $actorNomina) {
            return;
        }

        $cuerpoCorto = $cuerpo !== null ? mb_substr($cuerpo, 0, 200) : null;

        $this->notifs->crear([
            'user_nomina' => $destino,
            'ticket_id' => $ticketId,
            'folio' => $folio,
            'tipo' => $tipo,
            'titulo' => $titulo,
            'cuerpo' => $cuerpoCorto,
        ]);

        if ($conCorreo) {
            $this->enviarCorreoNotif($email ?: $this->users->emailPorNomina($destino), $ticketId, $folio, $titulo, $cuerpoCorto);
        }
    }

    /**
     * Envia el correo de notificacion (best-effort). Usado por notificar() y por el correo de
     * "primer contacto" (que NO crea campanita nueva). Un error de SMTP no interrumpe la accion.
     */
    private function enviarCorreoNotif(?string $correo, int $ticketId, ?string $folio, string $titulo, ?string $cuerpo): void
    {
        if (! $correo) {
            Log::warning("[correo] ticket {$ticketId}: sin destinatario, no se envia.");
            return;
        }
        try {
            $url = rtrim((string) config('services.frontend.url'), '/') . '/tickets/' . $ticketId;
            // Nombre del responsable (operador que atiende), para incluirlo en el correo.
            $t = $this->tickets->find($ticketId);
            $responsable = ($t && trim((string) ($t->responsable_nombre ?? '')) !== '') ? trim($t->responsable_nombre) : null;
            Mail::to($correo)->send(new TicketNotificacionMail($titulo, $cuerpo, $folio, $url, $responsable));
            Log::warning("[correo] ticket {$ticketId}: ENVIADO a {$correo}.");
        } catch (\Throwable $e) {
            Log::warning("[correo] ticket {$ticketId}: FALLO a {$correo}: " . $e->getMessage());
        }
    }

    public function tipos(): Collection
    {
        return $this->tickets->tiposActivos();
    }

    public function misTickets(int $nomina): Collection
    {
        return $this->tickets->listByNomina($nomina);
    }

    public function todos(array $filters = []): Collection
    {
        return $this->tickets->listAll($filters);
    }

    public function resumen(?int $responsable = null): array
    {
        return $this->tickets->countsByEstado($responsable);
    }

    public function detalle(int $id): ?object
    {
        $ticket = $this->tickets->find($id);
        // Dato por usuario (por nomina): codigo de RustDesk, se reutiliza en todos sus tickets.
        if ($ticket && $ticket->nomina !== null) {
            $ticket->rustdesk = $this->usuarioDatos->rustdesk((int) $ticket->nomina);
        } elseif ($ticket) {
            $ticket->rustdesk = null;
        }

        return $ticket;
    }

    public function porFolio(string $folio): ?object
    {
        return $this->tickets->findByFolio($folio);
    }

    public function archivos(int $id): Collection
    {
        return $this->tickets->listArchivos($id);
    }

    public function archivo(int $id, int $archivoId): ?object
    {
        return $this->tickets->findArchivo($id, $archivoId);
    }

    /** Registra la metadata de un archivo ya guardado en disco. No genera evento (timeline limpio). */
    public function registrarArchivo(int $id, array $meta): void
    {
        $this->tickets->addArchivo([
            'ticket_id' => $id,
            'nombre_original' => $meta['nombre_original'],
            'ruta' => $meta['ruta'],
            'mime' => $meta['mime'] ?? null,
            'tamano' => $meta['tamano'] ?? 0,
            'subido_por_nomina' => $meta['subido_por_nomina'] ?? null,
            'created_at' => now(),
        ]);
        $this->tickets->updateEstado($id, ['updated_at' => now()]);
        $this->log($meta['subido_por_nomina'] ?? null, null, 'archivo', $id, 'Adjunto: ' . ($meta['nombre_original'] ?? ''));
    }

    public function mensajes(int $id, bool $incluirInternos): Collection
    {
        return $this->tickets->listMensajes($id, $incluirInternos);
    }

    /**
     * Al abrir un ticket, marca como leidas sus notificaciones para ese usuario. Esto vacia el
     * badge de "mensajes nuevos" del listado (que cuenta notis no leidas) y deja las entradas del
     * centro de notificaciones (campanita) marcadas como leidas, sin borrarlas.
     */
    public function marcarTicketVisto(int $ticketId, int $nomina): void
    {
        $this->notifs->marcarLeidasDeTicket($nomina, $ticketId);
    }

    public function eventos(int $id): Collection
    {
        return $this->tickets->listEventos($id);
    }

    /**
     * Crea un ticket a partir de datos ya resueltos (identidad + contenido).
     */
    public function crear(array $data): ?object
    {
        $tipoId = (int) $data['tipo_id'];
        $responsable = $this->tickets->responsableForTipo($tipoId);

        $id = $this->tickets->create([
            'nomina' => $data['nomina'] ?? null,
            'nombre' => $data['nombre'],
            'puesto' => $data['puesto'] ?? null,
            'departamento' => $data['departamento'] ?? null,
            'correo' => $data['correo'] ?? null,
            'es_invitado' => $data['es_invitado'] ?? 0,
            'tipo_id' => $tipoId,
            'problema' => $data['problema'],
            'estado' => 'abierto',
            'responsable_nomina' => $responsable,
            'creado_por_nomina' => $data['creado_por_nomina'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $folio = 'TK-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
        $this->tickets->setFolio($id, $folio);

        $this->tickets->addEvento([
            'ticket_id' => $id,
            'tipo' => 'creado',
            'estado_nuevo' => 'abierto',
            'actor_nomina' => $data['creado_por_nomina'] ?? null,
            'actor_nombre' => $data['nombre'] ?? null,
            'descripcion' => 'Ticket creado',
            'created_at' => now(),
        ]);

        $this->log($data['creado_por_nomina'] ?? null, $data['nombre'] ?? null, 'ticket_creado', $folio, 'Ticket creado');

        // Aviso a soporte: notifica al responsable asignado automaticamente por el tipo de ticket.
        if ($responsable !== null) {
            $this->notificar($responsable, $data['creado_por_nomina'] ?? null, $id, $folio, 'asignado', "Nuevo ticket {$folio}", 'Se te asigno un nuevo ticket. Revisalo y atiendelo.');
        }

        // RustDesk es un dato POR USUARIO (por nomina): se guarda aparte, no en el ticket.
        // Best-effort: un fallo aqui (p. ej. tabla aun no creada) NO debe abortar la creacion del ticket.
        if (! empty($data['rustdesk']) && ($data['nomina'] ?? null) !== null) {
            try {
                $this->usuarioDatos->upsertRustdesk((int) $data['nomina'], (int) $data['rustdesk']);
            } catch (\Throwable $e) {
                Log::warning("[rustdesk] no se pudo guardar en creacion del ticket {$id}: " . $e->getMessage());
            }
        }

        return $this->tickets->find($id);
    }

    /**
     * Agrega un mensaje al chat (o nota interna si $esInterno).
     * @param array{nomina:?int,nombre:?string} $actor
     */
    public function enviarMensaje(int $id, array $actor, string $cuerpo, bool $esStaff, bool $esInterno, ?string $imagen = null): object
    {
        $ticket = $this->tickets->find($id);

        // Resumen para log/notificacion: si el mensaje es solo imagen (sin texto), usa un placeholder.
        $resumen = trim($cuerpo) !== '' ? trim($cuerpo) : '📷 Imagen';

        // "Contacto" en el timeline: la PRIMERA vez que un OPERADOR/ADMIN escribe un
        // mensaje publico (no el usuario, no notas internas, no mensajes posteriores).
        $yaHuboContactoStaff = $this->tickets->listMensajes($id, false)
            ->contains(fn ($m) => (int) $m->es_staff === 1);
        $esPrimerContacto = $esStaff && ! $esInterno && ! $yaHuboContactoStaff;

        $msgId = $this->tickets->addMensaje([
            'ticket_id' => $id,
            'autor_nomina' => $actor['nomina'] ?? null,
            'autor_nombre' => $actor['nombre'] ?? null,
            'es_staff' => $esStaff ? 1 : 0,
            'es_interno' => $esInterno ? 1 : 0,
            'cuerpo' => $cuerpo,
            'imagen' => $imagen,
            'created_at' => now(),
        ]);

        if ($esPrimerContacto) {
            $this->tickets->addEvento([
                'ticket_id' => $id,
                'tipo' => 'contacto',
                'actor_nomina' => $actor['nomina'] ?? null,
                'actor_nombre' => $actor['nombre'] ?? null,
                'descripcion' => 'Contacto',
                'created_at' => now(),
            ]);
        }

        // Si un operador/admin responde por chat y el ticket sigue 'abierto', pasa a 'en_curso'
        // automaticamente (no hace falta "tomarlo" aparte).
        if ($esStaff && ! $esInterno && $ticket && $ticket->estado === 'abierto') {
            $upd = ['estado' => 'en_curso', 'updated_at' => now()];
            // Quien responde y toma el ticket queda como responsable, aunque ya lo tuviera otro.
            if (($actor['nomina'] ?? null) !== null) {
                $upd['responsable_nomina'] = $actor['nomina'];
            }
            $this->tickets->updateEstado($id, $upd);
            $this->tickets->addEvento([
                'ticket_id' => $id,
                'tipo' => 'estado',
                'estado_anterior' => 'abierto',
                'estado_nuevo' => 'en_curso',
                'actor_nomina' => $actor['nomina'] ?? null,
                'actor_nombre' => $actor['nombre'] ?? null,
                'descripcion' => 'En curso (soporte respondio)',
                'created_at' => now(),
            ]);
            $this->log($actor['nomina'] ?? null, $actor['nombre'] ?? null, 'estado', $id, 'abierto -> en_curso (respuesta de soporte)');
        } else {
            $this->tickets->updateEstado($id, ['updated_at' => now()]);
        }

        $extracto = mb_substr($resumen, 0, 140);
        $this->log($actor['nomina'] ?? null, $actor['nombre'] ?? null, $esInterno ? 'nota' : 'mensaje', $id, ($esInterno ? 'Nota: ' : 'Mensaje: ') . $extracto);

        // Notificacion in-app (campanita) al otro lado de la conversacion; las notas internas no
        // notifican. Los mensajes NO envian correo (conCorreo: false). El unico correo del chat es
        // el "primer contacto": cuando un operador escribe su PRIMER mensaje publico, se avisa por
        // correo al solicitante (aunque el usuario ya hubiera escrito antes).
        if (! $esInterno && $ticket) {
            $folio = $ticket->folio ?? "#{$id}";
            if ($esStaff) {
                $this->notificar($ticket->nomina !== null ? (int) $ticket->nomina : null, $actor['nomina'] ?? null, $id, $ticket->folio ?? null, 'mensaje', "Nuevo mensaje de soporte en {$folio}", $resumen, $ticket->correo ?? null, false);
                if ($esPrimerContacto) {
                    $correoSolicitante = $ticket->correo ?: ($ticket->nomina !== null ? $this->users->emailPorNomina((int) $ticket->nomina) : null);
                    $this->enviarCorreoNotif($correoSolicitante, $id, $ticket->folio ?? null, "Soporte atendio tu ticket {$folio}", mb_substr($resumen, 0, 200));
                }
            } else {
                $this->notificar($ticket->responsable_nomina !== null ? (int) $ticket->responsable_nomina : null, $actor['nomina'] ?? null, $id, $ticket->folio ?? null, 'mensaje', "Nuevo mensaje en {$folio}", $resumen, null, false);
            }
        }

        return (object) [
            'id' => $msgId,
            'autor_nomina' => $actor['nomina'] ?? null,
            'autor_nombre' => $actor['nombre'] ?? null,
            'es_staff' => $esStaff,
            'es_interno' => $esInterno,
            'cuerpo' => $cuerpo,
            'imagen' => $imagen,
            'created_at' => now()->toDateTimeString(),
        ];
    }

    /** Un mensaje puntual del ticket (para servir su imagen adjunta). */
    public function mensaje(int $id, int $mensajeId): ?object
    {
        return $this->tickets->findMensaje($id, $mensajeId);
    }

    /**
     * Cambio de estado por STAFF. Valida la transicion y la justificacion.
     * @param array{nomina:?int,nombre:?string} $actor
     */
    public function cambiarEstado(int $id, array $actor, string $nuevoEstado, ?string $justificacion): object
    {
        $ticket = $this->tickets->find($id);
        if (! $ticket) {
            throw ValidationException::withMessages(['ticket' => ['El ticket no existe.']]);
        }

        $actual = $ticket->estado;
        $permitidos = self::TRANSICIONES_STAFF[$actual] ?? [];
        if (! in_array($nuevoEstado, $permitidos, true)) {
            throw ValidationException::withMessages([
                'estado' => ["No se puede pasar de '{$actual}' a '{$nuevoEstado}'."],
            ]);
        }

        if (in_array($nuevoEstado, self::REQUIERE_JUSTIFICACION, true) && trim((string) $justificacion) === '') {
            throw ValidationException::withMessages([
                'justificacion' => ['Debes indicar una justificacion para pausar o cancelar.'],
            ]);
        }

        $update = ['estado' => $nuevoEstado, 'updated_at' => now()];
        $descripcion = $justificacion ?: null;
        $reasignadoDe = null; // responsable anterior, si al tomar el ticket cambia de dueno
        if ($nuevoEstado === 'finalizado') {
            $update['finalizado_at'] = now();
        }
        if ($nuevoEstado === 'en_curso') {
            // Quien TOMA el ticket queda como responsable, aunque ya lo tuviera otro operador.
            $actorNomina = $actor['nomina'] ?? null;
            if ($actorNomina !== null) {
                if (! empty($ticket->responsable_nomina) && (int) $ticket->responsable_nomina !== (int) $actorNomina) {
                    $reasignadoDe = (int) $ticket->responsable_nomina;
                }
                $update['responsable_nomina'] = $actorNomina;
            }
            $descripcion = $descripcion ?: ('Tomado por ' . ($actor['nombre'] ?? 'staff'));
        }
        $this->tickets->updateEstado($id, $update);

        $this->tickets->addEvento([
            'ticket_id' => $id,
            'tipo' => 'estado',
            'estado_anterior' => $actual,
            'estado_nuevo' => $nuevoEstado,
            'actor_nomina' => $actor['nomina'] ?? null,
            'actor_nombre' => $actor['nombre'] ?? null,
            'descripcion' => $descripcion,
            'created_at' => now(),
        ]);

        $this->log($actor['nomina'] ?? null, $actor['nombre'] ?? null, 'estado', $id, "{$actual} -> {$nuevoEstado}" . ($justificacion ? " ({$justificacion})" : ''));

        // Si al tomar el ticket se le quito a otro responsable, dejar constancia en el timeline.
        if ($reasignadoDe !== null) {
            $this->tickets->addEvento([
                'ticket_id' => $id,
                'tipo' => 'asignacion',
                'actor_nomina' => $actor['nomina'] ?? null,
                'actor_nombre' => $actor['nombre'] ?? null,
                'descripcion' => 'Responsable: ' . ($actor['nombre'] ?? ('nomina ' . ($actor['nomina'] ?? '?'))) . ' (tomo el ticket)',
                'created_at' => now(),
            ]);
            $this->log($actor['nomina'] ?? null, $actor['nombre'] ?? null, 'responsable', $id, "Reasignado al tomar (antes: nomina {$reasignadoDe})");
        }

        // Notifica al solicitante cuando hay una accion que le concierne.
        $folio = $ticket->folio ?? "#{$id}";
        $duenoNomina = $ticket->nomina !== null ? (int) $ticket->nomina : null;
        if ($nuevoEstado === 'finalizado') {
            $this->notificar($duenoNomina, $actor['nomina'] ?? null, $id, $ticket->folio ?? null, 'validar', "Tu ticket {$folio} fue resuelto", 'Valida el cierre para confirmar, o reabrelo si no quedo resuelto.', $ticket->correo ?? null);
        } elseif ($nuevoEstado === 'cancelado') {
            $this->notificar($duenoNomina, $actor['nomina'] ?? null, $id, $ticket->folio ?? null, 'cancelado', "Tu ticket {$folio} fue cancelado", $justificacion, $ticket->correo ?? null);
        }

        return $this->tickets->find($id);
    }

    /** Asigna o reasigna el responsable (operador) de un ticket. */
    public function reasignar(int $id, array $actor, ?int $responsableNomina, ?string $responsableNombre): object
    {
        $ticket = $this->tickets->find($id);
        if (! $ticket) {
            throw ValidationException::withMessages(['ticket' => ['El ticket no existe.']]);
        }

        $this->tickets->updateEstado($id, ['responsable_nomina' => $responsableNomina, 'updated_at' => now()]);
        $this->tickets->addEvento([
            'ticket_id' => $id,
            'tipo' => 'asignacion',
            'actor_nomina' => $actor['nomina'] ?? null,
            'actor_nombre' => $actor['nombre'] ?? null,
            'descripcion' => $responsableNomina !== null
                ? ('Responsable: ' . ($responsableNombre ?: ('nomina ' . $responsableNomina)))
                : 'Responsable removido',
            'created_at' => now(),
        ]);

        $this->log($actor['nomina'] ?? null, $actor['nombre'] ?? null, 'responsable', $id, $responsableNomina !== null ? ('Responsable: ' . ($responsableNombre ?: ('nomina ' . $responsableNomina))) : 'Responsable removido');

        // Notifica al nuevo responsable que tiene un ticket asignado.
        if ($responsableNomina !== null) {
            $folio = $ticket->folio ?? "#{$id}";
            $this->notificar($responsableNomina, $actor['nomina'] ?? null, $id, $ticket->folio ?? null, 'asignado', "Se te asigno el ticket {$folio}", 'Eres el responsable de atenderlo.', null, false);
        }

        return $this->tickets->find($id);
    }

    /** Staff edita los datos del solicitante (util en tickets de invitado ya identificado). */
    public function actualizarDatos(int $id, array $actor, array $datos): object
    {
        $ticket = $this->tickets->find($id);
        if (! $ticket) {
            throw ValidationException::withMessages(['ticket' => ['El ticket no existe.']]);
        }

        $this->tickets->updateEstado($id, [
            'nombre' => $datos['nombre'],
            'nomina' => $datos['nomina'] ?? null,
            'puesto' => $datos['puesto'] ?? null,
            'departamento' => $datos['departamento'] ?? null,
            'correo' => $datos['correo'] ?? null,
            'updated_at' => now(),
        ]);

        $this->tickets->addEvento([
            'ticket_id' => $id,
            'tipo' => 'datos',
            'actor_nomina' => $actor['nomina'] ?? null,
            'actor_nombre' => $actor['nombre'] ?? null,
            'descripcion' => 'Datos del solicitante actualizados',
            'created_at' => now(),
        ]);
        $this->log($actor['nomina'] ?? null, $actor['nombre'] ?? null, 'datos', $id, 'Datos del solicitante actualizados');

        return $this->tickets->find($id);
    }

    /**
     * Guarda el codigo de RustDesk del SOLICITANTE (dato por usuario, por nomina). Se refleja en
     * todos los tickets de esa persona. Requiere que el solicitante tenga nomina (no invitado).
     */
    public function actualizarRustdesk(int $id, array $actor, ?int $codigo): object
    {
        $ticket = $this->tickets->find($id);
        if (! $ticket) {
            throw ValidationException::withMessages(['ticket' => ['El ticket no existe.']]);
        }
        if ($ticket->nomina === null) {
            throw ValidationException::withMessages(['rustdesk' => ['El solicitante no tiene nomina; identificalo primero para guardar su RustDesk.']]);
        }

        $this->usuarioDatos->upsertRustdesk((int) $ticket->nomina, $codigo);
        $this->log($actor['nomina'] ?? null, $actor['nombre'] ?? null, 'datos', $id, 'RustDesk: ' . ($codigo !== null ? $codigo : '(vacio)'));

        return $this->detalle($id);
    }

    /** El USUARIO valida el cierre: finalizado -> validado. */
    public function validarCierre(int $id, array $actor): object
    {
        $ticket = $this->tickets->find($id);
        if (! $ticket || $ticket->estado !== 'finalizado') {
            throw ValidationException::withMessages([
                'estado' => ['Solo puedes validar un ticket que el operador haya marcado como finalizado.'],
            ]);
        }

        $this->tickets->updateEstado($id, ['estado' => 'validado', 'validado_at' => now(), 'updated_at' => now()]);
        $this->tickets->addEvento([
            'ticket_id' => $id,
            'tipo' => 'estado',
            'estado_anterior' => 'finalizado',
            'estado_nuevo' => 'validado',
            'actor_nomina' => $actor['nomina'] ?? null,
            'actor_nombre' => $actor['nombre'] ?? null,
            'descripcion' => 'El usuario valido el cierre',
            'created_at' => now(),
        ]);

        $this->log($actor['nomina'] ?? null, $actor['nombre'] ?? null, 'estado', $id, 'finalizado -> validado');

        return $this->tickets->find($id);
    }

    /** El USUARIO rechaza el cierre: finalizado -> abierto (se reabre). */
    public function reabrir(int $id, array $actor, ?string $motivo): object
    {
        $ticket = $this->tickets->find($id);
        if (! $ticket || $ticket->estado !== 'finalizado') {
            throw ValidationException::withMessages([
                'estado' => ['Solo puedes reabrir un ticket finalizado que aun no validas.'],
            ]);
        }

        // Reabrir devuelve el ticket a "en curso" (ya tiene responsable, no vuelve a "abierto"/sin tomar).
        $this->tickets->updateEstado($id, ['estado' => 'en_curso', 'finalizado_at' => null, 'updated_at' => now()]);
        $this->tickets->addEvento([
            'ticket_id' => $id,
            'tipo' => 'estado',
            'estado_anterior' => 'finalizado',
            'estado_nuevo' => 'en_curso',
            'actor_nomina' => $actor['nomina'] ?? null,
            'actor_nombre' => $actor['nombre'] ?? null,
            'descripcion' => $motivo ?: 'El usuario reabrio el ticket (no resuelto)',
            'created_at' => now(),
        ]);

        $this->log($actor['nomina'] ?? null, $actor['nombre'] ?? null, 'estado', $id, 'finalizado -> en_curso' . ($motivo ? " ({$motivo})" : ''));

        // Notifica al responsable que el usuario reabrio el ticket.
        $folio = $ticket->folio ?? "#{$id}";
        $this->notificar($ticket->responsable_nomina !== null ? (int) $ticket->responsable_nomina : null, $actor['nomina'] ?? null, $id, $ticket->folio ?? null, 'reabierto', "El ticket {$folio} fue reabierto", $motivo ?: 'El usuario indica que no quedo resuelto.');

        return $this->tickets->find($id);
    }

    /**
     * Cierre automatico: los tickets en "Por validar" (finalizado) que superaron N horas sin
     * validacion del usuario pasan a "Finalizado" (validado). Devuelve cuantos se procesaron.
     */
    public function autoValidarVencidos(int $horas = 48): int
    {
        $vencidos = $this->tickets->finalizadosVencidos($horas);

        foreach ($vencidos as $t) {
            $this->tickets->updateEstado($t->id, ['estado' => 'validado', 'validado_at' => now(), 'updated_at' => now()]);
            $this->tickets->addEvento([
                'ticket_id' => $t->id,
                'tipo' => 'estado',
                'estado_anterior' => 'finalizado',
                'estado_nuevo' => 'validado',
                'actor_nomina' => null,
                'actor_nombre' => 'Sistema',
                'descripcion' => "Cierre automatico: {$horas}h sin validacion del usuario",
                'created_at' => now(),
            ]);
            $this->log(null, 'Sistema', 'estado', $t->id, "finalizado -> validado (auto {$horas}h)");

            $folio = $t->folio ?? "#{$t->id}";
            $this->notificar(
                $t->nomina !== null ? (int) $t->nomina : null,
                null,
                (int) $t->id,
                $t->folio ?? null,
                'validar',
                "Tu ticket {$folio} se cerro automaticamente",
                "Paso el periodo de validacion ({$horas}h) y se marco como finalizado.",
                $t->correo ?? null,
            );
        }

        return $vencidos->count();
    }
}
