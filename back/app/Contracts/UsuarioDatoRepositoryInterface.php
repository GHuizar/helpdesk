<?php

namespace App\Contracts;

/**
 * Datos extra por usuario (por nomina) que se reutilizan en todos sus tickets.
 * Hoy: el codigo de RustDesk. Vive en la BD propia (la de usuarios es solo lectura).
 */
interface UsuarioDatoRepositoryInterface
{
    /** ID de RustDesk (numerico) de una nomina, o null si no tiene. */
    public function rustdesk(int $nomina): ?int;

    /** ID de RustDesk de varias nominas: [nomina => ?int]. Tolerante si la tabla no existe. */
    public function rustdeskMap(array $nominas): array;

    /** Guarda/actualiza el ID de RustDesk de una nomina (null lo limpia). */
    public function upsertRustdesk(int $nomina, ?int $codigo): void;
}
