<?php

namespace App\Repositories;

use App\Contracts\DepartamentoRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Catalogo de departamentos. Vive en la BD externa centralizada
 * (helpdesk_users.departamento), la misma que referencian los usuarios via
 * idDepartamento. Solo lectura. Se deduplica por nombre (descripcion).
 */
class DepartamentoRepository implements DepartamentoRepositoryInterface
{
    public function all(): Collection
    {
        return DB::connection('usuarios')
            ->table('departamento')
            ->whereNotNull('descripcion')
            ->where('descripcion', '!=', '')
            ->groupBy('descripcion')
            ->orderBy('descripcion')
            ->get([DB::raw('MIN(iddepartamento) as id'), 'descripcion as nombre']);
    }
}
