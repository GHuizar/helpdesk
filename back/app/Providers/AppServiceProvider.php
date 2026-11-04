<?php

namespace App\Providers;

use App\Models\PersonalAccessToken;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // En hosting tipo cPanel, open_basedir suele bloquear /tmp (el temporal del sistema),
        // lo que rompe tempnam()/sys_get_temp_dir() al enviar correos. Apuntamos el temporal de
        // PHP a storage/tmp. Lo (re)creamos y le fijamos permisos EN CADA ARRANQUE para que
        // sobreviva a los despliegues (aunque la carpeta se borre al subir el back) SIN tener que
        // correr ningun comando manual.
        $tmp = storage_path('tmp');
        if (! is_dir($tmp)) {
            @mkdir($tmp, 0775, true);
        }
        @chmod($tmp, 0775);
        if (is_dir($tmp)) {
            putenv("TMPDIR={$tmp}");
            $_ENV['TMPDIR'] = $tmp;
            $_SERVER['TMPDIR'] = $tmp;
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Usa nuestro modelo de token (anclado a helpdesk) en vez del
        // de Sanctum, para que los tokens NO se inserten en la BD externa de
        // usuarios y se respete tokenable_id con signo (nominas negativas).
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);
    }
}
