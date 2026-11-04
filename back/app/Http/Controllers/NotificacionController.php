<?php

namespace App\Http\Controllers;

use App\Contracts\NotificacionRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Notificaciones in-app del usuario autenticado (campanita). Disponible para
 * cualquier rol (usuario / operador / admin).
 */
class NotificacionController extends Controller
{
    public function __construct(
        private readonly NotificacionRepositoryInterface $notifs,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $nomina = (int) $request->user()->nomina;

        return response()->json([
            'status' => 'success',
            'data' => $this->notifs->listarPorUsuario($nomina, 20),
            'no_leidas' => $this->notifs->contarNoLeidas($nomina),
        ]);
    }

    public function marcarLeidas(Request $request): JsonResponse
    {
        $this->notifs->marcarTodasLeidas((int) $request->user()->nomina);

        return response()->json(['status' => 'success']);
    }

    public function marcarUna(Request $request, int $id): JsonResponse
    {
        $this->notifs->marcarLeida($id, (int) $request->user()->nomina);

        return response()->json(['status' => 'success']);
    }
}
