<?php

use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

/*
 * SPA fallback. Cualquier ruta que NO matchee una ruta real (incluidas las de /api)
 * sirve el index.html del front; si es /api/* devuelve 404 JSON (lo maneja SpaController).
 *
 * Se usa Route::fallback con un CONTROLADOR (no closure ni catch-all con where+lookahead):
 *  - El lookahead negativo falla con route:cache y capturaba los GET /api/* (devolvia HTML).
 *  - El fallback solo corre cuando ninguna otra ruta (API incluida) matcheo.
 *  - Al ser controlador (no closure), route:cache funciona en produccion.
 */
Route::fallback(SpaController::class);
