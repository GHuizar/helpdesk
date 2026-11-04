<?php

namespace App\Console\Commands;

use App\Mail\TicketNotificacionMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Diagnostico de correo: envia un correo de prueba y MUESTRA el error completo si falla
 * (a diferencia del envio real, que es best-effort y se traga la excepcion en el log).
 * Uso en produccion:  php artisan mail:test correo@dominio.com
 */
class TestMail extends Command
{
    protected $signature = 'mail:test {correo}';

    protected $description = 'Envia un correo de prueba y muestra el error completo si falla (diagnostico).';

    public function handle(): int
    {
        $correo = (string) $this->argument('correo');

        $this->line('--- Config de correo efectiva ---');
        $this->line('mailer   = ' . config('mail.default'));
        $this->line('host     = ' . config('mail.mailers.smtp.host'));
        $this->line('port     = ' . config('mail.mailers.smtp.port'));
        $this->line('scheme   = ' . var_export(config('mail.mailers.smtp.scheme'), true));
        $this->line('encrypt  = ' . var_export(config('mail.mailers.smtp.encryption'), true));
        $this->line('username = ' . config('mail.mailers.smtp.username'));
        $this->line('from     = ' . config('mail.from.address'));
        $this->line('TMPDIR   = ' . (getenv('TMPDIR') ?: '(no definido)'));
        $tmp = storage_path('tmp');
        $this->line('storage/tmp existe=' . (is_dir($tmp) ? 'si' : 'NO') . ' escribible=' . (is_writable($tmp) ? 'si' : 'NO'));
        $this->newLine();

        try {
            Mail::to($correo)->send(new TicketNotificacionMail(
                'Prueba de correo',
                'Este es un correo de prueba del sistema de tickets.',
                'TEST-000',
                rtrim((string) config('services.frontend.url'), '/') . '/tickets/1',
            ));
            $this->info('OK: correo enviado a ' . $correo);
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('FALLO (' . get_class($e) . '):');
            $this->error($e->getMessage());
            return self::FAILURE;
        }
    }
}
