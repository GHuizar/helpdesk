<?php

namespace App\Repositories;

use App\Contracts\UsuarioDatoRepositoryInterface;
use Illuminate\Support\Facades\DB;

/**
 * Datos extra por usuario (ticket_usuario_datos). BD propia, llave = nomina.
 * El RustDesk es numerico (BIGINT). La lectura es TOLERANTE: si la tabla aun no existe
 * devuelve null / vacio, para no romper el detalle del ticket ni la busqueda de usuarios.
 */
class UsuarioDatoRepository implements UsuarioDatoRepositoryInterface
{
    public function rustdesk(int $nomina): ?int
    {
        try {
            $val = DB::table('ticket_usuario_datos')->where('nomina', $nomina)->value('rustdesk');
        } catch (\Throwable $e) {
            return null;
        }

        return ($val === null || $val === '') ? null : (int) $val;
    }

    public function rustdeskMap(array $nominas): array
    {
        if (empty($nominas)) {
            return [];
        }
        try {
            return DB::table('ticket_usuario_datos')
                ->whereIn('nomina', $nominas)
                ->pluck('rustdesk', 'nomina')
                ->map(fn ($v) => ($v === null || $v === '') ? null : (int) $v)
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    public function upsertRustdesk(int $nomina, ?int $codigo): void
    {
        DB::table('ticket_usuario_datos')->updateOrInsert(
            ['nomina' => $nomina],
            ['rustdesk' => $codigo, 'updated_at' => now()],
        );
    }
}
