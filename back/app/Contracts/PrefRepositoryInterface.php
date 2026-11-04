<?php

namespace App\Contracts;

interface PrefRepositoryInterface
{
    /** Preferencias de un usuario (o null). */
    public function get(int $nomina): ?object;

    /** Crea o actualiza las preferencias del usuario con los campos dados. */
    public function upsert(int $nomina, array $data): void;
}
