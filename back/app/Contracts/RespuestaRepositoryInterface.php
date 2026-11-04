<?php

namespace App\Contracts;

use Illuminate\Support\Collection;

/**
 * Respuestas rapidas / predeterminadas por operador (guardadas en su perfil).
 */
interface RespuestaRepositoryInterface
{
    /** Respuestas de un operador (por nomina), ordenadas. */
    public function listByNomina(int $nomina): Collection;

    /** Crea una respuesta y devuelve su id. */
    public function create(array $data): int;

    /** Actualiza una respuesta del propio usuario. Devuelve true si se modifico. */
    public function update(int $id, int $nomina, array $data): bool;

    /** Elimina una respuesta del propio usuario. Devuelve true si se borro. */
    public function delete(int $id, int $nomina): bool;
}
