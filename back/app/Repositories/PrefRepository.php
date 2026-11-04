<?php

namespace App\Repositories;

use App\Contracts\PrefRepositoryInterface;
use Illuminate\Support\Facades\DB;

/**
 * Preferencias de perfil por usuario (ticket_user_prefs). BD propia.
 */
class PrefRepository implements PrefRepositoryInterface
{
    public function get(int $nomina): ?object
    {
        // Todas las columnas: tolerante si alguna (p. ej. 'tema') aun no existe en la BD.
        return DB::table('ticket_user_prefs')->where('user_nomina', $nomina)->first();
    }

    public function upsert(int $nomina, array $data): void
    {
        DB::table('ticket_user_prefs')->updateOrInsert(['user_nomina' => $nomina], $data);
    }
}
