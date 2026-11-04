<?php

namespace App\Services;

use App\Contracts\DashboardRepositoryInterface;

/**
 * Arma los datos del dashboard/monitor (pantalla completa para operadores/admins).
 */
class DashboardService
{
    public function __construct(
        private readonly DashboardRepositoryInterface $repo
    ) {}

    public function data(): array
    {
        return [
            'estados' => $this->repo->estados(),
            'hoy' => $this->repo->resumenHoy(),
            'abiertos_list' => $this->repo->abiertosRecientes(10),
            'nuevos_list' => $this->repo->nuevosHoyList(10),
            'cerrados_list' => $this->repo->cerradosHoyList(10),
            'serie' => $this->repo->serie(14),
            'ultimos30' => $this->repo->ultimos30(),
            'recientes' => $this->repo->recientes(6),
            'longevos' => $this->repo->longevos(6),
            'departamentos' => $this->repo->departamentosTop(6),
            'tipos' => $this->repo->porTipo(6),
            'solicitantes' => $this->repo->topSolicitantes(14),
            'resolutores' => $this->repo->topResolutores(8),
            'promedios' => $this->repo->promedios(),
            'horas_operador' => $this->repo->horasOperadorHoy(),
        ];
    }
}
