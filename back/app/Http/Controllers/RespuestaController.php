<?php

namespace App\Http\Controllers;

use App\Contracts\RespuestaRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Respuestas rapidas / predeterminadas del operador autenticado (para el chat de tickets).
 * Cada usuario administra solo las suyas. Restringido a staff por la ruta.
 */
class RespuestaController extends Controller
{
    public function __construct(
        private readonly RespuestaRepositoryInterface $repo,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->repo->listByNomina((int) $request->user()->nomina),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => ['nullable', 'string', 'max:80'],
            'texto' => ['required', 'string', 'max:2000'],
        ]);

        $nomina = (int) $request->user()->nomina;
        $this->repo->create([
            'user_nomina' => $nomina,
            'titulo' => $validated['titulo'] ?? null,
            'texto' => $validated['texto'],
            'orden' => (int) $request->input('orden', 0),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $this->repo->listByNomina($nomina),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => ['nullable', 'string', 'max:80'],
            'texto' => ['required', 'string', 'max:2000'],
        ]);

        $nomina = (int) $request->user()->nomina;
        $this->repo->update($id, $nomina, [
            'titulo' => $validated['titulo'] ?? null,
            'texto' => $validated['texto'],
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $this->repo->listByNomina($nomina),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $nomina = (int) $request->user()->nomina;
        $this->repo->delete($id, $nomina);

        return response()->json([
            'status' => 'success',
            'data' => $this->repo->listByNomina($nomina),
        ]);
    }
}
