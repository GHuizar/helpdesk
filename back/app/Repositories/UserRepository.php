<?php

namespace App\Repositories;

use App\Contracts\UserRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Lectura de usuarios desde la BD central (helpdesk_users.users), anotando el
 * rol del proyecto (ticket_user_roles). Dos consultas + merge en PHP para evitar
 * un JOIN cross-database (las tablas viven en conexiones distintas).
 */
class UserRepository implements UserRepositoryInterface
{
    public function search(?string $q, int $limit = 50): Collection
    {
        $users = DB::connection('usuarios')->table('users')
            ->whereNotNull('nomina')
            ->where('status', 1)
            ->when($q, function ($qq) use ($q) {
                $qq->where(function ($w) use ($q) {
                    $w->where('name', 'like', "%{$q}%")
                        ->orWhere('apellidopaterno', 'like', "%{$q}%")
                        ->orWhere('apellidomaterno', 'like', "%{$q}%")
                        ->orWhere('nomina', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get(['nomina', 'name', 'apellidopaterno', 'apellidomaterno', 'email']);

        $nominas = $users->pluck('nomina')->all();
        $roles = empty($nominas)
            ? collect()
            : DB::table('ticket_user_roles')->whereIn('user_nomina', $nominas)->pluck('rol', 'user_nomina');

        return $users->map(fn ($u) => (object) [
            'nomina' => (int) $u->nomina,
            'nombre' => trim("{$u->name} {$u->apellidopaterno} {$u->apellidomaterno}"),
            'email' => $u->email,
            'rol' => $roles[$u->nomina] ?? 'usuario',
        ]);
    }

    public function findByNomina(int $nomina): ?object
    {
        // Todo vive en helpdesk_users: users + departamento + puesto.
        $u = DB::connection('usuarios')->table('users as u')
            ->leftJoin('departamento as d', 'd.iddepartamento', '=', 'u.idDepartamento')
            ->leftJoin('puesto as p', 'p.idPuesto', '=', 'u.idPuesto')
            ->where('u.nomina', $nomina)
            ->first([
                'u.nomina',
                DB::raw("TRIM(CONCAT(COALESCE(u.name,''),' ',COALESCE(u.apellidopaterno,''),' ',COALESCE(u.apellidomaterno,''))) as nombre"),
                'u.email',
                'd.descripcion as departamento',
                'p.descripcion as puesto',
            ]);

        if (! $u) {
            return null;
        }

        return (object) [
            'nomina' => (int) $u->nomina,
            'nombre' => trim($u->nombre),
            'email' => $u->email,
            'departamento' => $u->departamento,
            'puesto' => $u->puesto,
        ];
    }

    public function emailPorNomina(int $nomina): ?string
    {
        $email = DB::connection('usuarios')->table('users')->where('nomina', $nomina)->value('email');

        return $email ?: null;
    }
}
