<?php

namespace App\Repositories;

use App\Contracts\DashboardRepositoryInterface;
use App\Support\CuentaHorarioHabil;
use App\Support\UsesExternalUsersDb;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Agregaciones para el dashboard/monitor (pantalla completa). Datos GLOBALES
 * (vista de equipo); el control de acceso lo hace el controlador (admin/operador).
 */
class DashboardRepository implements DashboardRepositoryInterface
{
    use CuentaHorarioHabil;
    use UsesExternalUsersDb;

    private const ESTADOS = ['abierto', 'en_curso', 'pausado', 'finalizado', 'validado', 'cancelado'];

    // Los timestamps se guardan en UTC, pero los cortes por dia/semana/mes deben calcularse en hora
    // de Mexico (GMT-6) para que "hoy" y las graficas coincidan con la hora local y no con la del
    // servidor (UTC). Estos helpers dan el inicio del periodo EN Mexico, ya convertido a UTC para
    // compararlo/formatearlo contra las columnas (que estan en UTC).
    private const TZ = 'America/Mexico_City';

    private function inicioDia(): Carbon
    {
        return now(self::TZ)->startOfDay()->utc();
    }

    private function inicioSemana(): Carbon
    {
        return now(self::TZ)->startOfWeek()->utc();
    }

    private function inicioMes(): Carbon
    {
        return now(self::TZ)->startOfMonth()->utc();
    }

    public function estados(): array
    {
        $raw = DB::table('tickets')
            ->select('estado', DB::raw('COUNT(*) as c'))
            ->groupBy('estado')
            ->pluck('c', 'estado');

        $out = [];
        foreach (self::ESTADOS as $e) {
            $out[$e] = (int) ($raw[$e] ?? 0);
        }
        $out['total'] = array_sum($out);

        return $out;
    }

    public function recientes(int $n): Collection
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->orderByDesc('t.created_at')
            ->limit($n)
            ->get(['t.id', 't.folio', 't.nombre', 't.estado', 't.created_at', 'tt.nombre as tipo_nombre']);
    }

    public function longevos(int $n, ?int $responsable = null): Collection
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->whereNotIn('t.estado', ['validado', 'cancelado'])
            ->when($responsable !== null, fn ($q) => $q->where('t.responsable_nomina', $responsable))
            ->orderBy('t.created_at')
            ->limit($n)
            ->get(['t.id', 't.folio', 't.estado', 't.departamento', 't.nombre', 't.created_at', 'tt.nombre as tipo_nombre', DB::raw('TIMESTAMPDIFF(DAY, t.created_at, NOW()) as dias')]);
    }

    public function departamentosTop(int $n): Collection
    {
        return DB::table('tickets')
            ->selectRaw("COALESCE(NULLIF(departamento, ''), 'Sin departamento') as departamento, COUNT(*) as total")
            ->groupBy('departamento')
            ->orderByDesc('total')
            ->limit($n)
            ->get();
    }

    public function topSolicitantes(int $n): Collection
    {
        return DB::table('tickets')
            ->selectRaw('nombre, nomina, COUNT(*) as total')
            ->groupBy('nombre', 'nomina')
            ->orderByDesc('total')
            ->limit($n)
            ->get();
    }

    public function topResolutores(int $n): Collection
    {
        // MAX() del nombre + GROUP BY solo por nomina: valido bajo ONLY_FULL_GROUP_BY
        // (cada nomina corresponde a un unico nombre).
        return DB::table('tickets as t')
            ->leftJoin($this->usersTable('ru'), 'ru.nomina', '=', 't.responsable_nomina')
            ->whereIn('t.estado', ['finalizado', 'validado'])
            ->whereNotNull('t.responsable_nomina')
            ->selectRaw("t.responsable_nomina as nomina, MAX(TRIM(CONCAT(COALESCE(ru.name,''),' ',COALESCE(ru.apellidopaterno,'')))) as nombre, COUNT(*) as total")
            ->groupBy('t.responsable_nomina')
            ->orderByDesc('total')
            ->limit($n)
            ->get();
    }

    public function promedios(?int $responsable = null): array
    {
        // Los promedios de tiempo se calculan en HORARIO HABIL (L-V 8:00-18:30 sin comida), no en
        // horas calendario: traemos los pares de fechas y contamos con minutosHabiles() en PHP.

        // Resolucion: creacion -> validado (cierre total).
        $resolucion = DB::table('tickets')
            ->whereNotNull('validado_at')
            ->when($responsable !== null, fn ($q) => $q->where('responsable_nomina', $responsable))
            ->get(['created_at as ini', 'validado_at as fin']);

        // Primera respuesta: creacion -> primer mensaje de staff (evento 'contacto').
        $primerContacto = DB::table('ticket_eventos')
            ->where('tipo', 'contacto')
            ->groupBy('ticket_id')
            ->selectRaw('ticket_id, MIN(created_at) as t');
        $respuesta = DB::table('tickets as t')
            ->joinSub($primerContacto, 'e', 'e.ticket_id', '=', 't.id')
            ->when($responsable !== null, fn ($q) => $q->where('t.responsable_nomina', $responsable))
            ->get(['t.created_at as ini', 'e.t as fin']);

        // Primera atencion: creacion -> primer paso a "en_curso".
        $primerEnCurso = DB::table('ticket_eventos')
            ->where('tipo', 'estado')->where('estado_nuevo', 'en_curso')
            ->groupBy('ticket_id')
            ->selectRaw('ticket_id, MIN(created_at) as t');
        $atencion = DB::table('tickets as t')
            ->joinSub($primerEnCurso, 'e', 'e.ticket_id', '=', 't.id')
            ->when($responsable !== null, fn ($q) => $q->where('t.responsable_nomina', $responsable))
            ->get(['t.created_at as ini', 'e.t as fin']);

        return [
            'resolucion_min' => $this->promedioHabil($resolucion),
            'primera_respuesta_min' => $this->promedioHabil($respuesta),
            'primera_atencion_min' => $this->promedioHabil($atencion),
        ];
    }

    /** Promedio, en minutos HABILES, de una coleccion de filas con campos 'ini' y 'fin'. */
    private function promedioHabil(Collection $filas): int
    {
        $suma = 0;
        $n = 0;
        foreach ($filas as $f) {
            if (empty($f->ini) || empty($f->fin)) {
                continue;
            }
            $suma += $this->minutosHabiles(Carbon::parse($f->ini), Carbon::parse($f->fin));
            $n++;
        }

        return $n > 0 ? (int) round($suma / $n) : 0;
    }

    public function horasOperadorHoy(): Collection
    {
        $hoyTs = $this->inicioDia()->timestamp;
        $nowTs = now()->timestamp;

        // Ultimo momento en que cada ticket entro a "en_curso".
        $desde = DB::table('ticket_eventos')
            ->where('tipo', 'estado')
            ->where('estado_nuevo', 'en_curso')
            ->groupBy('ticket_id')
            ->selectRaw('ticket_id, MAX(created_at) as desde')
            ->pluck('desde', 'ticket_id');

        // Tickets que cuentan para hoy: en curso ahora, o finalizados hoy.
        $cands = DB::table('tickets')
            ->whereNotNull('responsable_nomina')
            ->where(function ($q) {
                $q->where('estado', 'en_curso')
                    ->orWhere('finalizado_at', '>=', $this->inicioDia());
            })
            ->get(['id', 'responsable_nomina', 'estado', 'finalizado_at']);

        // Intervalos [inicio,fin] por operador (cada ticket aporta uno).
        $intervalos = [];
        foreach ($cands as $t) {
            $d = $desde[$t->id] ?? null;
            if (! $d) {
                continue;
            }
            $start = max($hoyTs, Carbon::parse($d)->timestamp);
            $end = $t->estado === 'en_curso' ? $nowTs : Carbon::parse($t->finalizado_at)->timestamp;
            if ($end > $start) {
                $intervalos[$t->responsable_nomina][] = [$start, $end];
            }
        }

        // Une intervalos solapados por operador (no doble-contar tickets en paralelo).
        $acum = []; // nomina => minutos
        foreach ($intervalos as $nomina => $ivs) {
            usort($ivs, fn ($a, $b) => $a[0] <=> $b[0]);
            $merged = [];
            foreach ($ivs as $iv) {
                $last = count($merged) - 1;
                if ($last >= 0 && $iv[0] <= $merged[$last][1]) {
                    $merged[$last][1] = max($merged[$last][1], $iv[1]);
                } else {
                    $merged[] = $iv;
                }
            }
            // Solo horario habil (L-V 8:00-18:30 sin comida).
            $min = 0;
            foreach ($merged as $m) {
                $min += $this->minutosHabilesTs($m[0], $m[1]);
            }
            $acum[$nomina] = $min;
        }

        if (empty($acum)) {
            return collect();
        }

        // Resolver nombres de las nominas acumuladas.
        $nombres = DB::connection('usuarios')->table('users')
            ->whereIn('nomina', array_keys($acum))
            ->get(['nomina', 'name', 'apellidopaterno'])
            ->keyBy('nomina');

        return collect($acum)
            ->map(fn ($min, $nomina) => (object) [
                'nomina' => (int) $nomina,
                'nombre' => isset($nombres[$nomina])
                    ? trim(($nombres[$nomina]->name ?? '') . ' ' . ($nombres[$nomina]->apellidopaterno ?? ''))
                    : ('Nomina ' . $nomina),
                'minutos' => $min,
            ])
            ->sortByDesc('minutos')
            ->values();
    }

    public function resumenHoy(): array
    {
        $hoy = $this->inicioDia();

        return [
            'nuevos_hoy' => (int) DB::table('tickets')->where('created_at', '>=', $hoy)->count(),
            'cerrados_hoy' => (int) DB::table('tickets')->where('validado_at', '>=', $hoy)->count(),
        ];
    }

    public function serie(int $dias): array
    {
        // Agrupamos por la fecha LOCAL (Mexico), no la UTC: CONVERT_TZ desplaza el timestamp a -06:00
        // antes de tomar DATE(). El eje ($inicio en Mexico) usa las mismas fechas locales.
        $inicio = now(self::TZ)->startOfDay()->subDays($dias - 1);
        $desdeUtc = $inicio->copy()->utc();

        $creados = DB::table('tickets')
            ->where('created_at', '>=', $desdeUtc)
            ->selectRaw("DATE(CONVERT_TZ(created_at, '+00:00', '-06:00')) as d, COUNT(*) as c")
            ->groupBy('d')->pluck('c', 'd');

        $cerrados = DB::table('tickets')
            ->whereNotNull('validado_at')->where('validado_at', '>=', $desdeUtc)
            ->selectRaw("DATE(CONVERT_TZ(validado_at, '+00:00', '-06:00')) as d, COUNT(*) as c")
            ->groupBy('d')->pluck('c', 'd');

        $out = [];
        for ($i = 0; $i < $dias; $i++) {
            $day = $inicio->copy()->addDays($i);
            $key = $day->format('Y-m-d');
            $out[] = [
                'dia' => $day->format('d/m'),
                'creados' => (int) ($creados[$key] ?? 0),
                'cerrados' => (int) ($cerrados[$key] ?? 0),
            ];
        }

        return $out;
    }

    public function ultimos30(): array
    {
        $desde = $this->inicioDia()->subDays(29);
        $total = (int) DB::table('tickets')->where('created_at', '>=', $desde)->count();
        $resueltos = (int) DB::table('tickets')->where('created_at', '>=', $desde)->where('estado', 'validado')->count();

        return [
            'total' => $total,
            'resueltos' => $resueltos,
            'pct' => $total ? (int) round($resueltos / $total * 100) : 0,
        ];
    }

    public function porTipo(int $n): Collection
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->selectRaw("COALESCE(tt.nombre, 'Sin tipo') as tipo, COUNT(*) as total")
            ->groupBy('tipo')
            ->orderByDesc('total')
            ->limit($n)
            ->get();
    }

    public function abiertosRecientes(int $n): Collection
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->where('t.estado', 'abierto')
            ->orderByDesc('t.created_at')
            ->limit($n)
            ->get(['t.id', 't.folio', 't.nombre', 't.created_at', 'tt.nombre as tipo_nombre']);
    }

    public function nuevosHoyList(int $n): Collection
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->where('t.created_at', '>=', $this->inicioDia())
            ->orderByDesc('t.created_at')
            ->limit($n)
            ->get(['t.id', 't.folio', 't.nombre', 't.created_at', 'tt.nombre as tipo_nombre']);
    }

    public function cerradosHoyList(int $n): Collection
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->whereNotNull('t.validado_at')
            ->where('t.validado_at', '>=', $this->inicioDia())
            ->orderByDesc('t.validado_at')
            ->limit($n)
            ->get(['t.id', 't.folio', 't.nombre', 't.validado_at', 'tt.nombre as tipo_nombre']);
    }

    // -------------------------------------------------------------------------
    //  Metricas de tiempo, productividad y calidad (Reportes / "mis estadisticas")
    // -------------------------------------------------------------------------

    public function horasInvertidas(?int $responsable = null): array
    {
        $porOp = $this->intervalosEnCurso();
        $now = now()->timestamp;

        return [
            'dia_min' => $this->minutosEnRango($porOp, $this->inicioDia()->timestamp, $now, $responsable),
            'semana_min' => $this->minutosEnRango($porOp, $this->inicioSemana()->timestamp, $now, $responsable),
            'mes_min' => $this->minutosEnRango($porOp, $this->inicioMes()->timestamp, $now, $responsable),
        ];
    }

    public function resueltosPorRango(?int $responsable = null): array
    {
        $base = fn () => DB::table('tickets')
            ->whereNotNull('finalizado_at')
            ->when($responsable !== null, fn ($q) => $q->where('responsable_nomina', $responsable));

        return [
            'dia' => (int) $base()->where('finalizado_at', '>=', $this->inicioDia())->count(),
            'semana' => (int) $base()->where('finalizado_at', '>=', $this->inicioSemana())->count(),
            'mes' => (int) $base()->where('finalizado_at', '>=', $this->inicioMes())->count(),
        ];
    }

    public function reaperturas(): int
    {
        return (int) DB::table('ticket_eventos')
            ->where('tipo', 'estado')
            ->where('estado_anterior', 'finalizado')
            ->where('estado_nuevo', 'abierto')
            ->distinct()
            ->count('ticket_id');
    }

    public function sinAtender(int $dias): int
    {
        return (int) DB::table('tickets')
            ->where('estado', 'abierto')
            ->where('created_at', '<', now()->subDays($dias))
            ->count();
    }

    public function cargaPorOperador(int $n): Collection
    {
        return DB::table('tickets as t')
            ->leftJoin($this->usersTable('ru'), 'ru.nomina', '=', 't.responsable_nomina')
            ->whereIn('t.estado', ['abierto', 'en_curso'])
            ->whereNotNull('t.responsable_nomina')
            ->selectRaw("t.responsable_nomina as nomina, MAX(TRIM(CONCAT(COALESCE(ru.name,''),' ',COALESCE(ru.apellidopaterno,'')))) as nombre, COUNT(*) as total")
            ->groupBy('t.responsable_nomina')
            ->orderByDesc('total')
            ->limit($n)
            ->get();
    }

    /**
     * Reconstruye los intervalos [inicio,fin] (timestamps) en que cada ticket estuvo
     * "en_curso", a partir de los eventos de estado, agrupados por el responsable ACTUAL.
     * Un ticket aun en_curso cierra su ultimo intervalo en "ahora".
     *
     * @return array<int, array<int, array{0:int,1:int}>> nomina => [[inicio,fin],...]
     */
    private function intervalosEnCurso(): array
    {
        $tickets = DB::table('tickets')
            ->whereNotNull('responsable_nomina')
            ->get(['id', 'responsable_nomina', 'estado'])
            ->keyBy('id');

        if ($tickets->isEmpty()) {
            return [];
        }

        $eventos = DB::table('ticket_eventos')
            ->where('tipo', 'estado')
            ->whereIn('ticket_id', $tickets->keys()->all())
            ->orderBy('ticket_id')->orderBy('created_at')->orderBy('id')
            ->get(['ticket_id', 'estado_anterior', 'estado_nuevo', 'created_at']);

        $porOp = [];
        $abierto = []; // ticket_id => inicio_ts

        $push = function (&$porOp, $nomina, $s, $e) {
            if ($e > $s) {
                $porOp[(int) $nomina][] = [$s, $e];
            }
        };

        foreach ($eventos as $ev) {
            $tid = $ev->ticket_id;
            if ($ev->estado_nuevo === 'en_curso') {
                $abierto[$tid] = Carbon::parse($ev->created_at)->timestamp;
            } elseif ($ev->estado_anterior === 'en_curso' && isset($abierto[$tid])) {
                $push($porOp, $tickets[$tid]->responsable_nomina, $abierto[$tid], Carbon::parse($ev->created_at)->timestamp);
                unset($abierto[$tid]);
            }
        }

        // Intervalos aun abiertos: si el ticket sigue en_curso, cierran en "ahora".
        $now = now()->timestamp;
        foreach ($abierto as $tid => $inicio) {
            if (($tickets[$tid]->estado ?? null) === 'en_curso') {
                $push($porOp, $tickets[$tid]->responsable_nomina, $inicio, $now);
            }
        }

        return $porOp;
    }

    /**
     * Minutos invertidos dentro de [desdeTs, hastaTs]. Por operador se unen intervalos
     * solapados (no doble-contar tickets en paralelo); el total es la suma por operador
     * (horas-hombre). Si $soloNomina, solo cuenta ese operador.
     */
    private function minutosEnRango(array $porOp, int $desdeTs, int $hastaTs, ?int $soloNomina = null): int
    {
        $total = 0;
        foreach ($porOp as $nomina => $ivs) {
            if ($soloNomina !== null && (int) $nomina !== $soloNomina) {
                continue;
            }
            $clip = [];
            foreach ($ivs as [$s, $e]) {
                $s2 = max($s, $desdeTs);
                $e2 = min($e, $hastaTs);
                if ($e2 > $s2) {
                    $clip[] = [$s2, $e2];
                }
            }
            if (! $clip) {
                continue;
            }
            usort($clip, fn ($a, $b) => $a[0] <=> $b[0]);
            $merged = [];
            foreach ($clip as $iv) {
                $last = count($merged) - 1;
                if ($last >= 0 && $iv[0] <= $merged[$last][1]) {
                    $merged[$last][1] = max($merged[$last][1], $iv[1]);
                } else {
                    $merged[] = $iv;
                }
            }
            // El tiempo trabajado se cuenta solo en horario habil (L-V 8:00-18:30 sin comida).
            foreach ($merged as $m) {
                $total += $this->minutosHabilesTs($m[0], $m[1]);
            }
        }

        return $total;
    }
}
