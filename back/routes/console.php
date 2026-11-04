<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cierre automatico de tickets en "Por validar" que superan 48h sin validacion del usuario.
// Requiere el cron del sistema: * * * * * php /ruta/artisan schedule:run
Schedule::command('tickets:auto-validar')->hourly();
