<?php

namespace App\Support;

/**
 * Helper para JOINs cross-database con la tabla `users` de la BD externa
 * compartida (conexion 'usuarios'). Resuelve el nombre de la BD desde la
 * config en vez de hardcodear `helpdesk_users` en cada query.
 *
 * Uso:
 *   use UsesExternalUsersDb;
 *   ...
 *   ->leftJoin($this->usersTable('eu'), 'eu.nomina', '=', 't.nomina')
 */
trait UsesExternalUsersDb
{
    protected function usersTable(string $alias): string
    {
        $db = config('database.connections.usuarios.database');
        return "{$db}.users as {$alias}";
    }
}
