<?php

namespace App\Repositories;

use App\Contracts\NotificacionRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Notificaciones in-app por usuario (ticket_notificaciones). BD propia.
 */
class NotificacionRepository implements NotificacionRepositoryInterface
{
    public function crear(array $data): void
    {
        DB::table('ticket_notificaciones')->insert([
            'user_nomina' => $data['user_nomina'],
            'ticket_id' => $data['ticket_id'] ?? null,
            'folio' => $data['folio'] ?? null,
            'tipo' => $data['tipo'],
            'titulo' => $data['titulo'],
            'cuerpo' => $data['cuerpo'] ?? null,
            'leida' => 0,
            'created_at' => now(),
        ]);
    }

    public function listarPorUsuario(int $nomina, int $limit = 20): Collection
    {
        return DB::table('ticket_notificaciones')
            ->where('user_nomina', $nomina)
            ->orderByDesc('id')
            ->limit($limit)
            ->get(['id', 'ticket_id', 'folio', 'tipo', 'titulo', 'cuerpo', 'leida', 'created_at']);
    }

    public function contarNoLeidas(int $nomina): int
    {
        return (int) DB::table('ticket_notificaciones')
            ->where('user_nomina', $nomina)
            ->where('leida', 0)
            ->count();
    }

    public function marcarTodasLeidas(int $nomina): void
    {
        DB::table('ticket_notificaciones')
            ->where('user_nomina', $nomina)
            ->where('leida', 0)
            ->update(['leida' => 1]);
    }

    public function marcarLeida(int $id, int $nomina): void
    {
        DB::table('ticket_notificaciones')
            ->where('id', $id)
            ->where('user_nomina', $nomina)
            ->update(['leida' => 1]);
    }

    public function marcarLeidasDeTicket(int $nomina, int $ticketId): void
    {
        DB::table('ticket_notificaciones')
            ->where('user_nomina', $nomina)
            ->where('ticket_id', $ticketId)
            ->where('leida', 0)
            ->update(['leida' => 1]);
    }
}
