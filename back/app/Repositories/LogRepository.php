<?php

namespace App\Repositories;

use App\Contracts\LogRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Bitacora global (ticket_logs). BD propia. Escritura best-effort: nunca debe
 * romper la accion principal (los llamadores envuelven en try/catch si aplica).
 */
class LogRepository implements LogRepositoryInterface
{
    public function add(array $data): void
    {
        DB::table('ticket_logs')->insert(array_merge(['created_at' => now()], $data));
    }

    public function list(array $filters = [], int $limit = 200): Collection
    {
        $logs = DB::table('ticket_logs')
            ->when($filters['accion'] ?? null, fn ($q, $a) => $q->where('accion', $a))
            ->when($filters['search'] ?? null, function ($q) use ($filters) {
                $s = $filters['search'];
                $q->where(function ($w) use ($s) {
                    $w->where('actor_nombre', 'like', "%{$s}%")
                        ->orWhere('detalle', 'like', "%{$s}%")
                        ->orWhere('entidad_id', 'like', "%{$s}%");
                });
            })
            ->orderByDesc('id')
            ->limit($limit)
            ->get(['id', 'actor_nomina', 'actor_nombre', 'accion', 'entidad', 'entidad_id', 'detalle', 'created_at']);

        // Enriquecer actor_nombre faltante (p. ej. logs de adjunto, que solo guardan la nomina)
        // resolviendolo desde la BD central de usuarios: asi se ve el NOMBRE y no solo la nomina.
        $sinNombre = $logs->filter(fn ($l) => empty($l->actor_nombre) && $l->actor_nomina !== null)
            ->pluck('actor_nomina')->unique()->values();
        if ($sinNombre->isNotEmpty()) {
            $nombres = DB::connection('usuarios')->table('users')
                ->whereIn('nomina', $sinNombre->all())
                ->get(['nomina', 'name', 'apellidopaterno'])
                ->keyBy('nomina');
            $logs->each(function ($l) use ($nombres) {
                if (empty($l->actor_nombre) && isset($nombres[$l->actor_nomina])) {
                    $u = $nombres[$l->actor_nomina];
                    $l->actor_nombre = trim("{$u->name} {$u->apellidopaterno}") ?: null;
                }
            });
        }

        return $logs;
    }
}
