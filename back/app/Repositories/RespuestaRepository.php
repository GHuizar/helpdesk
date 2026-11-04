<?php

namespace App\Repositories;

use App\Contracts\RespuestaRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Respuestas rapidas por operador (ticket_respuestas_rapidas). BD propia.
 * La propiedad se valida por user_nomina en cada operacion (un usuario solo toca las suyas).
 */
class RespuestaRepository implements RespuestaRepositoryInterface
{
    public function listByNomina(int $nomina): Collection
    {
        return DB::table('ticket_respuestas_rapidas')
            ->where('user_nomina', $nomina)
            ->orderBy('orden')
            ->orderBy('id')
            ->get(['id', 'titulo', 'texto', 'orden']);
    }

    public function create(array $data): int
    {
        return (int) DB::table('ticket_respuestas_rapidas')->insertGetId($data);
    }

    public function update(int $id, int $nomina, array $data): bool
    {
        return DB::table('ticket_respuestas_rapidas')
            ->where('id', $id)
            ->where('user_nomina', $nomina)
            ->update($data) > 0;
    }

    public function delete(int $id, int $nomina): bool
    {
        return DB::table('ticket_respuestas_rapidas')
            ->where('id', $id)
            ->where('user_nomina', $nomina)
            ->delete() > 0;
    }
}
