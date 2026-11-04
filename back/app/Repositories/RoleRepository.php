<?php

namespace App\Repositories;

use App\Contracts\RoleRepositoryInterface;
use App\Support\UsesExternalUsersDb;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Acceso al rol del usuario. La clave relacional es la NOMINA.
 * Los roles viven en helpdesk.ticket_user_roles (BD propia).
 * Sin fila para una nomina => rol efectivo 'usuario'.
 */
class RoleRepository implements RoleRepositoryInterface
{
    use UsesExternalUsersDb;

    public const DEFAULT_ROLE = 'usuario';
    public const ROLES = ['admin', 'operador', 'usuario'];

    public function staff(): Collection
    {
        return DB::table('ticket_user_roles as r')
            ->join($this->usersTable('u'), 'u.nomina', '=', 'r.user_nomina')
            ->whereIn('r.rol', ['admin', 'operador'])
            ->where('u.status', 1)
            ->orderBy('u.name')
            ->get([
                'r.user_nomina as nomina',
                'r.rol',
                DB::raw("TRIM(CONCAT(COALESCE(u.name,''),' ',COALESCE(u.apellidopaterno,''))) as nombre"),
            ]);
    }

    public function getRole(int $nomina): string
    {
        $rol = DB::table('ticket_user_roles')
            ->where('user_nomina', $nomina)
            ->value('rol');

        return in_array($rol, self::ROLES, true) ? $rol : self::DEFAULT_ROLE;
    }

    public function hasRole(int $nomina, array $roles): bool
    {
        return in_array($this->getRole($nomina), $roles, true);
    }

    public function setRole(int $nomina, string $rol, ?int $assignedBy = null): void
    {
        if (! in_array($rol, self::ROLES, true)) {
            return;
        }

        if ($rol === self::DEFAULT_ROLE) {
            // 'usuario' es el rol por defecto: quitar la fila (sin fila = usuario).
            DB::table('ticket_user_roles')->where('user_nomina', $nomina)->delete();
            return;
        }

        DB::table('ticket_user_roles')->updateOrInsert(
            ['user_nomina' => $nomina],
            ['rol' => $rol, 'assigned_by' => $assignedBy]
        );
    }
}
