<?php

namespace App\Services;

use App\Contracts\DashboardRepositoryInterface;
use App\Contracts\TicketRepositoryInterface;

/**
 * Reportes de operacion (admin) y estadisticas personales (staff). Reutiliza las
 * agregaciones del DashboardRepository; el control de acceso lo hace el controlador.
 */
class ReporteService
{
    public function __construct(
        private readonly DashboardRepositoryInterface $dash,
        private readonly TicketRepositoryInterface $tickets,
    ) {}

    /** Reporte global para supervisores (admin). */
    public function general(): array
    {
        $estados = $this->dash->estados();
        $total = (int) ($estados['total'] ?? 0);
        $validados = (int) ($estados['validado'] ?? 0);
        $backlog = (int) ($estados['abierto'] ?? 0) + (int) ($estados['en_curso'] ?? 0);

        return [
            'resumen' => $estados,
            'total' => $total,
            'por_departamento' => $this->tickets->countByDepartamento(),
            'por_tipo' => $this->tickets->countByTipo(),
            'longevos' => $this->dash->longevos(8),
            'solicitantes' => $this->dash->topSolicitantes(8),
            'resolutores' => $this->dash->topResolutores(8),
            'promedios' => $this->dash->promedios(),
            'horas' => $this->dash->horasInvertidas(),
            'resueltos' => $this->dash->resueltosPorRango(),
            'serie' => $this->dash->serie(14),
            'supervision' => [
                'backlog' => $backlog,
                'sin_atender_3d' => $this->dash->sinAtender(3),
                'tasa_resolucion' => $total ? (int) round($validados / $total * 100) : 0,
                'carga_operador' => $this->dash->cargaPorOperador(8),
            ],
        ];
    }

    /** Estadisticas personales del usuario (sus tickets asignados como responsable). */
    public function personales(int $nomina): array
    {
        $estados = $this->tickets->countsByEstado($nomina);

        return [
            'estados' => $estados,
            'asignados_total' => array_sum($estados),
            'activos' => (int) ($estados['abierto'] ?? 0) + (int) ($estados['en_curso'] ?? 0),
            'por_validar' => (int) ($estados['finalizado'] ?? 0),
            'resueltos' => $this->dash->resueltosPorRango($nomina),
            'horas' => $this->dash->horasInvertidas($nomina),
            'promedios' => $this->dash->promedios($nomina),
            'longevos' => $this->dash->longevos(5, $nomina),
        ];
    }
}
