<?php

namespace App\Http\Controllers;

use App\Contracts\LogRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Log global de trazabilidad ("Log de TODO"). Solo administrador.
 */
class LogController extends Controller
{
    public function __construct(
        private readonly LogRepositoryInterface $logs,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->logs->list([
                'search' => $request->query('search'),
                'accion' => $request->query('accion'),
            ]),
        ]);
    }
}
