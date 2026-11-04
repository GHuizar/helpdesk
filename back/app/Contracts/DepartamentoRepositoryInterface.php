<?php

namespace App\Contracts;

use Illuminate\Support\Collection;

interface DepartamentoRepositoryInterface
{
    /** Catalogo de departamentos (desde la BD externa helpdesk_users): {id, nombre}. */
    public function all(): Collection;
}
