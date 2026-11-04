<?php

namespace App\Contracts;

use Illuminate\Support\Collection;

interface DashboardRepositoryInterface
{
    /** Conteo por estado + total. */
    public function estados(): array;

    /** Tickets mas recientes. */
    public function recientes(int $n): Collection;

    /** Tickets abiertos (no validados/cancelados) mas longevos (opcionalmente de un responsable). */
    public function longevos(int $n, ?int $responsable = null): Collection;

    /** Departamentos con mas tickets. */
    public function departamentosTop(int $n): Collection;

    /** Personas que mas solicitan tickets. */
    public function topSolicitantes(int $n): Collection;

    /** Operadores/admins que mas tickets resuelven (finalizado/validado). */
    public function topResolutores(int $n): Collection;

    /** Promedios de tiempo (minutos): resolucion, primera respuesta y primera atencion. */
    public function promedios(?int $responsable = null): array;

    /** Horas activas de hoy por operador (aprox., desde el ultimo "en curso"). */
    public function horasOperadorHoy(): Collection;

    /** Minutos en_curso invertidos hoy / esta semana / este mes (equipo o un responsable). */
    public function horasInvertidas(?int $responsable = null): array;

    /** Tickets resueltos (finalizados) hoy / semana / mes (equipo o un responsable). */
    public function resueltosPorRango(?int $responsable = null): array;

    /** Numero de tickets que fueron reabiertos (calidad). */
    public function reaperturas(): int;

    /** Tickets aun "abiertos" creados hace mas de N dias (sin atender). */
    public function sinAtender(int $dias): int;

    /** Carga de trabajo activa (abiertos+en_curso) por operador. */
    public function cargaPorOperador(int $n): Collection;

    /** Creados hoy y cerrados (validados) hoy. */
    public function resumenHoy(): array;

    /** Serie por dia (ultimos N): [{dia, creados, cerrados}]. */
    public function serie(int $dias): array;

    /** Resumen ultimos 30 dias: {total, resueltos, pct}. */
    public function ultimos30(): array;

    /** Conteo por tipo de ticket. */
    public function porTipo(int $n): Collection;

    /** Los N tickets abiertos mas recientes. */
    public function abiertosRecientes(int $n): Collection;

    /** Los N tickets creados hoy mas recientes. */
    public function nuevosHoyList(int $n): Collection;

    /** Los N tickets cerrados (validados) hoy mas recientes. */
    public function cerradosHoyList(int $n): Collection;
}
