<?php

namespace App\Console\Commands;

use App\Services\TicketService;
use Illuminate\Console\Command;

/**
 * Cierre automatico de tickets en "Por validar" (finalizado) tras N horas sin validacion.
 * Se ejecuta por el scheduler (ver routes/console.php). Tambien puede correrse a mano:
 *   php artisan tickets:auto-validar --horas=48
 */
class AutoValidarTickets extends Command
{
    protected $signature = 'tickets:auto-validar {--horas=48}';

    protected $description = 'Cierra (valida) automaticamente los tickets en "Por validar" que superaron N horas sin validacion del usuario.';

    public function handle(TicketService $service): int
    {
        $n = $service->autoValidarVencidos((int) $this->option('horas'));
        $this->info("Tickets validados automaticamente: {$n}");

        return self::SUCCESS;
    }
}
