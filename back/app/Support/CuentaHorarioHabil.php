<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Cuenta el tiempo en HORARIO HABIL para las metricas de tiempo.
 *
 * Regla de negocio (hora de Mexico):
 *   - Dias habiles: lunes a viernes (sabado y domingo NO cuentan).
 *   - Jornada: 8:00 a 18:30, excluyendo la comida de 13:30 a 15:00.
 *   - Resultado: 9 horas habiles por dia (5.5h + 3.5h).
 *
 * Los timestamps de la BD estan en UTC; aqui se convierten a hora de Mexico antes de
 * recortarlos contra las ventanas habiles. No contempla dias festivos.
 */
trait CuentaHorarioHabil
{
    /** Zona horaria de negocio. */
    private string $tzHabil = 'America/Mexico_City';

    /** Ventanas habiles del dia, en minutos desde medianoche: 8:00-13:30 y 15:00-18:30. */
    private const VENTANAS_HABILES = [[480, 810], [900, 1110]];

    /**
     * Minutos habiles entre dos instantes (L-V, 8:00-18:30 menos 13:30-15:00, hora Mexico).
     */
    protected function minutosHabiles(Carbon $inicio, Carbon $fin): int
    {
        if ($fin <= $inicio) {
            return 0;
        }

        $ini = $inicio->copy()->setTimezone($this->tzHabil);
        $end = $fin->copy()->setTimezone($this->tzHabil);
        $iniTs = $ini->timestamp;
        $endTs = $end->timestamp;

        $total = 0;
        $dia = $ini->copy()->startOfDay();
        while ($dia->timestamp <= $endTs) {
            if ($dia->isWeekday()) { // lunes a viernes
                foreach (self::VENTANAS_HABILES as [$vIni, $vFin]) {
                    $s = max($iniTs, $dia->copy()->addMinutes($vIni)->timestamp);
                    $e = min($endTs, $dia->copy()->addMinutes($vFin)->timestamp);
                    if ($e > $s) {
                        $total += intdiv($e - $s, 60);
                    }
                }
            }
            $dia->addDay();
        }

        return $total;
    }

    /** Minutos habiles entre dos timestamps epoch (segundos). */
    protected function minutosHabilesTs(int $inicioTs, int $finTs): int
    {
        if ($finTs <= $inicioTs) {
            return 0;
        }

        return $this->minutosHabiles(
            Carbon::createFromTimestamp($inicioTs),
            Carbon::createFromTimestamp($finTs),
        );
    }
}
