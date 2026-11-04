<?php

namespace App\Contracts;

use Illuminate\Support\Collection;

interface UserRepositoryInterface
{
    /** Busca usuarios activos (BD central) y anota su rol: {nomina, nombre, email, rol}. */
    public function search(?string $q, int $limit = 50): Collection;

    /** Datos de un usuario por nomina (para autollenado): {nomina, nombre, email, departamento, puesto}. */
    public function findByNomina(int $nomina): ?object;

    /** Correo de un usuario por nomina (para notificaciones por email). */
    public function emailPorNomina(int $nomina): ?string;
}
