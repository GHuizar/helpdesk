<?php

namespace App\Contracts;

use Illuminate\Support\Collection;

interface LogRepositoryInterface
{
    /** Registra una accion en la bitacora global. */
    public function add(array $data): void;

    /** Lista de logs (mas reciente primero) con filtros opcionales {search, accion}. */
    public function list(array $filters = [], int $limit = 200): Collection;
}
