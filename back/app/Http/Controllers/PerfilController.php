<?php

namespace App\Http\Controllers;

use App\Contracts\PrefRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Preferencias de perfil del usuario actual (solo staff: gateado por ruta role:admin,operador).
 * Personaliza la VISTA DE ADMINISTRACION: color del topbar e imagen de fondo.
 */
class PerfilController extends Controller
{
    public function __construct(
        private readonly PrefRepositoryInterface $prefs,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $p = $this->prefs->get((int) $request->user()->nomina);

        // tiene_fondo solo si el archivo existe de verdad (evita 404 por rutas huerfanas
        // cuando la fila quedo en BD pero el binario no esta en el storage).
        $tieneFondo = ! empty($p->bg_ruta) && Storage::disk('local')->exists($p->bg_ruta);

        return response()->json([
            'status' => 'success',
            'data' => [
                'accent' => $p->accent ?? null,
                'bar_text' => $p->bar_text ?? 'auto',
                'tema' => $p->tema ?? 'claro',
                'tiene_fondo' => $tieneFondo,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'accent' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'bar_text' => ['nullable', 'string', 'in:auto,light,dark'],
            'tema' => ['nullable', 'string', 'in:claro,oscuro'],
        ]);

        // Solo actualiza las claves enviadas (no pisa las demas).
        $data = [];
        if ($request->has('accent')) {
            $data['accent'] = $request->input('accent');
        }
        if ($request->has('bar_text')) {
            $data['bar_text'] = $request->input('bar_text') ?: 'auto';
        }
        // Solo si la columna existe (tolerante a que el ALTER aun no se haya corrido en la BD).
        if ($request->has('tema') && Schema::hasColumn('ticket_user_prefs', 'tema')) {
            $data['tema'] = $request->input('tema') ?: 'claro';
        }
        if ($data) {
            $this->prefs->upsert((int) $request->user()->nomina, $data);
        }

        return response()->json(['status' => 'success', 'message' => 'Perfil actualizado.']);
    }

    public function subirFondo(Request $request): JsonResponse
    {
        $request->validate(['imagen' => ['required', 'image', 'max:8192']]);
        $nomina = (int) $request->user()->nomina;

        $prev = $this->prefs->get($nomina);
        if ($prev && $prev->bg_ruta && Storage::disk('local')->exists($prev->bg_ruta)) {
            Storage::disk('local')->delete($prev->bg_ruta);
        }

        // Se guarda como un archivo plano dentro de "perfiles/" (NO una subcarpeta por
        // nomina) para no depender de crear una carpeta nueva por cada operador.
        $ext = $request->file('imagen')->extension() ?: 'jpg';
        $ruta = $request->file('imagen')->storeAs('perfiles', "{$nomina}.{$ext}", 'local');
        $this->prefs->upsert($nomina, ['bg_ruta' => $ruta]);

        return response()->json(['status' => 'success', 'message' => 'Fondo actualizado.']);
    }

    public function fondo(Request $request): StreamedResponse
    {
        $p = $this->prefs->get((int) $request->user()->nomina);
        abort_if(! $p || ! $p->bg_ruta || ! Storage::disk('local')->exists($p->bg_ruta), 404, 'Sin fondo.');

        return Storage::disk('local')->response($p->bg_ruta);
    }

    public function quitarFondo(Request $request): JsonResponse
    {
        $nomina = (int) $request->user()->nomina;
        $p = $this->prefs->get($nomina);
        if ($p && $p->bg_ruta && Storage::disk('local')->exists($p->bg_ruta)) {
            Storage::disk('local')->delete($p->bg_ruta);
        }
        $this->prefs->upsert($nomina, ['bg_ruta' => null]);

        return response()->json(['status' => 'success', 'message' => 'Fondo eliminado.']);
    }

    // -------------------------------------------------------------------------
    //  Tema claro/oscuro: disponible para CUALQUIER usuario (no solo staff).
    // -------------------------------------------------------------------------

    public function temaShow(Request $request): JsonResponse
    {
        $p = $this->prefs->get((int) $request->user()->nomina);

        return response()->json(['status' => 'success', 'data' => ['tema' => $p->tema ?? 'claro']]);
    }

    public function temaUpdate(Request $request): JsonResponse
    {
        $request->validate(['tema' => ['required', 'string', 'in:claro,oscuro']]);

        // Tolerante si el ALTER de la columna aun no se corrio.
        if (Schema::hasColumn('ticket_user_prefs', 'tema')) {
            $this->prefs->upsert((int) $request->user()->nomina, ['tema' => $request->input('tema')]);
        }

        return response()->json(['status' => 'success']);
    }
}
