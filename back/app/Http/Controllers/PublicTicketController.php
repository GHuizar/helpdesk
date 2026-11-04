<?php

namespace App\Http\Controllers;

use App\Contracts\DepartamentoRepositoryInterface;
use App\Services\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

/**
 * Parte PUBLICA (sin login):
 *  - reCAPTCHA v2: expone la site key y verifica el token contra Google al crear.
 *  - Alta de ticket como invitado (es_invitado=1, sin nomina, requiere correo).
 *  - Seguimiento por folio (estado + conversacion publica).
 *  - Respuesta del invitado en la conversacion por folio.
 * Los invitados NO pueden adjuntar archivos (esos endpoints estan tras auth).
 */
class PublicTicketController extends Controller
{
    public function __construct(
        private readonly TicketService $service,
        private readonly DepartamentoRepositoryInterface $deptos,
    ) {}

    /** Catalogo de departamentos para el formulario publico. */
    public function departamentos(): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->deptos->all()]);
    }

    /** Expone la site key de reCAPTCHA para el widget del formulario publico. */
    public function captcha(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'site_key' => config('services.recaptcha.site_key'),
        ]);
    }

    /** Verifica el token de reCAPTCHA contra Google. Lanza 422 si no es valido. */
    private function verificarRecaptcha(?string $token, ?string $ip): void
    {
        $secret = config('services.recaptcha.secret');

        // Sin secret configurada (entornos sin claves) no se bloquea el alta.
        if (! $secret) {
            return;
        }

        if (! $token) {
            throw ValidationException::withMessages([
                'recaptcha' => ['Confirma que no eres un robot.'],
            ]);
        }

        try {
            $resp = Http::asForm()->timeout(8)->post('https://www.google.com/recaptcha/api/siteverify', [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $ip,
            ]);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'recaptcha' => ['No pudimos validar el reCAPTCHA. Intenta de nuevo.'],
            ]);
        }

        $json = $resp->json();
        $exito = $resp->ok() && (($json['success'] ?? false) === true);
        // reCAPTCHA v3 devuelve un score [0..1]; exigimos un minimo (sospecha de bot por debajo).
        $score = $json['score'] ?? null;
        if ($exito && $score !== null && (float) $score < 0.5) {
            $exito = false;
        }

        if (! $exito) {
            throw ValidationException::withMessages([
                'recaptcha' => ['No pasaste la verificacion anti-bot. Intenta de nuevo.'],
            ]);
        }
    }

    /** Crea un ticket como invitado. */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:180'],
            'correo' => ['required', 'email', 'max:180'],
            'nomina' => ['nullable', 'integer'],
            'puesto' => ['nullable', 'string', 'max:180'],
            'departamento' => ['nullable', 'string', 'max:180'],
            'tipo_id' => ['required', 'integer', 'exists:ticket_tipos,id'],
            'problema' => ['required', 'string', 'min:5', 'max:5000'],
            'recaptcha_token' => ['nullable', 'string'],
        ]);

        // Verificacion anti-bot (reCAPTCHA v2) para el alta de invitados.
        $this->verificarRecaptcha($validated['recaptcha_token'] ?? null, $request->ip());

        $ticket = $this->service->crear([
            'nomina' => $validated['nomina'] ?? null,
            'nombre' => $validated['nombre'],
            'puesto' => $validated['puesto'] ?? null,
            'departamento' => $validated['departamento'] ?? null,
            'correo' => $validated['correo'],
            'es_invitado' => 1,
            'tipo_id' => $validated['tipo_id'],
            'problema' => $validated['problema'],
            'creado_por_nomina' => null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket creado. Guarda tu folio para dar seguimiento.',
            'folio' => $ticket->folio,
            'data' => [
                'folio' => $ticket->folio,
                'estado' => $ticket->estado,
                'tipo_nombre' => $ticket->tipo_nombre ?? null,
            ],
        ], 201);
    }

    /** Seguimiento de un ticket por folio (datos limitados + conversacion publica). */
    public function seguimiento(string $folio): JsonResponse
    {
        $ticket = $this->service->porFolio($folio);
        // Solo se puede dar seguimiento publico a tickets de INVITADO (es_invitado=1).
        // Los tickets de empleados con sesion no son consultables por folio publico.
        if (! $ticket || ! $ticket->es_invitado) {
            return response()->json(['status' => 'error', 'message' => 'No encontramos un ticket de invitado con ese folio.'], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'folio' => $ticket->folio,
                'estado' => $ticket->estado,
                'tipo_nombre' => $ticket->tipo_nombre ?? null,
                'nombre' => $ticket->nombre,
                'problema' => $ticket->problema,
                'created_at' => $ticket->created_at,
                'finalizado_at' => $ticket->finalizado_at,
                'validado_at' => $ticket->validado_at,
            ],
            'mensajes' => $this->service->mensajes((int) $ticket->id, false),
        ]);
    }

    /** El invitado responde en la conversacion (por folio). */
    public function enviarMensaje(Request $request, string $folio): JsonResponse
    {
        $request->validate(['cuerpo' => ['required', 'string', 'max:5000']]);

        $ticket = $this->service->porFolio($folio);
        if (! $ticket || ! $ticket->es_invitado) {
            return response()->json(['status' => 'error', 'message' => 'Folio de invitado no encontrado.'], 404);
        }

        $this->service->enviarMensaje(
            (int) $ticket->id,
            ['nomina' => null, 'nombre' => $ticket->nombre],
            $request->input('cuerpo'),
            false, // no es staff
            false, // no es interno
        );

        return response()->json([
            'status' => 'success',
            'mensajes' => $this->service->mensajes((int) $ticket->id, false),
        ], 201);
    }
}
