<?php

namespace App\Contracts;

use Illuminate\Support\Collection;

interface NotificacionRepositoryInterface
{
    /** Crea una notificacion para un usuario (por nomina). */
    public function crear(array $data): void;

    /** Ultimas notificaciones del usuario (mas recientes primero). */
    public function listarPorUsuario(int $nomina, int $limit = 20): Collection;

    /** Cuenta las no leidas del usuario. */
    public function contarNoLeidas(int $nomina): int;

    /** Marca todas las del usuario como leidas. */
    public function marcarTodasLeidas(int $nomina): void;

    /** Marca una notificacion del usuario como leida. */
    public function marcarLeida(int $id, int $nomina): void;

    /** Marca como leidas todas las notificaciones de un ticket para un usuario (al abrir el ticket). */
    public function marcarLeidasDeTicket(int $nomina, int $ticketId): void;
}
