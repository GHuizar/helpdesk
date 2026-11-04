<?php

namespace Tests\Unit;

use App\Support\CuentaHorarioHabil;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

/**
 * Reglas de negocio del conteo en horario habil (hora de Mexico):
 *
 *   - Lunes a viernes; sabado y domingo no cuentan.
 *   - Jornada de 8:00 a 18:30, menos la comida de 13:30 a 15:00.
 *   - 9 horas habiles por dia = 540 minutos.
 *
 * Es logica pura, asi que no necesita levantar Laravel ni base de datos.
 */
class CuentaHorarioHabilTest extends TestCase
{
    /** Expone los metodos protegidos del trait. */
    private object $calculadora;

    protected function setUp(): void
    {
        parent::setUp();

        $this->calculadora = new class {
            use CuentaHorarioHabil;

            public function minutos(Carbon $inicio, Carbon $fin): int
            {
                return $this->minutosHabiles($inicio, $fin);
            }
        };
    }

    private function mx(string $fecha): Carbon
    {
        return Carbon::parse($fecha, 'America/Mexico_City');
    }

    public function test_una_jornada_completa_son_540_minutos(): void
    {
        $this->assertSame(540, $this->calculadora->minutos(
            $this->mx('2026-11-02 08:00'),   // lunes
            $this->mx('2026-11-02 18:30'),
        ));
    }

    public function test_la_hora_de_comida_no_cuenta(): void
    {
        // 13:00-13:30 son 30 minutos y 15:00-15:30 otros 30; entre medias no cuenta nada.
        $this->assertSame(60, $this->calculadora->minutos(
            $this->mx('2026-11-02 13:00'),
            $this->mx('2026-11-02 15:30'),
        ));
    }

    public function test_el_fin_de_semana_no_cuenta(): void
    {
        // Viernes 18:00-18:30 = 30 min, sabado y domingo = 0, lunes 8:00-9:00 = 60 min.
        $this->assertSame(90, $this->calculadora->minutos(
            $this->mx('2026-11-06 18:00'),   // viernes
            $this->mx('2026-11-09 09:00'),   // lunes
        ));
    }

    public function test_fuera_de_la_jornada_no_cuenta(): void
    {
        $this->assertSame(0, $this->calculadora->minutos(
            $this->mx('2026-11-02 20:00'),
            $this->mx('2026-11-02 22:00'),
        ));
    }

    public function test_un_intervalo_invertido_da_cero(): void
    {
        $this->assertSame(0, $this->calculadora->minutos(
            $this->mx('2026-11-02 12:00'),
            $this->mx('2026-11-02 09:00'),
        ));
    }

    public function test_un_ticket_que_cruza_la_comida_descuenta_el_hueco(): void
    {
        // 10:00-16:00 son 6 horas de reloj, pero solo 4.5 habiles: se va la comida (1.5 h).
        $this->assertSame(270, $this->calculadora->minutos(
            $this->mx('2026-11-02 10:00'),
            $this->mx('2026-11-02 16:00'),
        ));
    }
}
