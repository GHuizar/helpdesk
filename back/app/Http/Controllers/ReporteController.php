<?php

namespace App\Http\Controllers;

use App\Services\ReporteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Reportes de operacion. `index` (solo admin) = reporte global del area;
 * `mias` (staff) = estadisticas personales del operador/admin logueado.
 */
class ReporteController extends Controller
{
    public function __construct(
        private readonly ReporteService $reportes,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->reportes->general()]);
    }

    public function mias(Request $request): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->reportes->personales((int) $request->user()->nomina)]);
    }
}
