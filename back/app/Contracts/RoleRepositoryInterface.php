<?php

namespace App\Contracts;

use Illuminate\Support\Collection;

interface RoleRepositoryInterface
{
    /** Lista de staff (admin/operador) activos: {nomina, rol, nombre}. */
    public function staff(): Collection;

    /**
     * Devuelve el rol efectivo de una nomina: 'admin' | 'operador' | 'usuario'.
     * Si no hay asignacion en ticket_user_roles, devuelve 'usuario'.
     */
    public function getRole(int $nomina): string;

    /** ¿La nomina tiene alguno de los roles indicados? */
    public function hasRole(int $nomina, array $roles): bool;

    /** Asigna el rol de una nomina (rol 'usuario' = quitar fila, vuelve al default). */
    public function setRole(int $nomina, string $rol, ?int $assignedBy = null): void;
}
