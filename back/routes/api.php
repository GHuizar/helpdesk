<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\PublicTicketController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\NotificacionController;
use App\Http\Controllers\PerfilController;
use App\Http\Controllers\RespuestaController;

/*
|--------------------------------------------------------------------------
| Rutas API (prefijo /api)
|--------------------------------------------------------------------------
*/

// Publica (login)
Route::post('/login', [AuthController::class, 'login']);

// =============================================================================
// PARTE PUBLICA (sin login): alta de invitado con captcha + seguimiento por folio
// =============================================================================
Route::prefix('p')->group(function () {
    Route::get('/captcha', [PublicTicketController::class, 'captcha']);
    Route::get('/ticket-tipos', [TicketController::class, 'tipos']); // catalogo para el form publico
    Route::get('/departamentos', [PublicTicketController::class, 'departamentos']);
    Route::post('/tickets', [PublicTicketController::class, 'store']);
    Route::get('/tickets/{folio}', [PublicTicketController::class, 'seguimiento']);
    Route::post('/tickets/{folio}/mensajes', [PublicTicketController::class, 'enviarMensaje']);
});

// =============================================================================
// Requieren token Sanctum valido
// =============================================================================
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Notificaciones in-app (campanita) - cualquier rol
    Route::get('/me/notificaciones', [NotificacionController::class, 'index']);
    Route::post('/me/notificaciones/leer', [NotificacionController::class, 'marcarLeidas']);
    Route::post('/me/notificaciones/{id}/leer', [NotificacionController::class, 'marcarUna'])->whereNumber('id');

    // Tema claro/oscuro - cualquier rol (los usuarios normales tambien pueden cambiarlo)
    Route::get('/me/tema', [PerfilController::class, 'temaShow']);
    Route::put('/me/tema', [PerfilController::class, 'temaUpdate']);

    Route::get('/ticket-tipos', [TicketController::class, 'tipos']);
    Route::get('/departamentos', [TicketController::class, 'departamentos']);
    Route::get('/me/tickets', [TicketController::class, 'myTickets']);
    Route::post('/tickets', [TicketController::class, 'store']);

    // Detalle + chat + timeline (acceso: dueno o staff, validado en el controlador)
    Route::get('/tickets/{id}', [TicketController::class, 'show'])->whereNumber('id');
    Route::get('/tickets/{id}/mensajes', [TicketController::class, 'mensajes'])->whereNumber('id');
    Route::post('/tickets/{id}/mensajes', [TicketController::class, 'enviarMensaje'])->whereNumber('id');
    Route::get('/tickets/{id}/mensajes/{mensajeId}/imagen', [TicketController::class, 'imagenMensaje'])->whereNumber(['id', 'mensajeId']);

    // Staff edita los datos del solicitante (acceso validado en el controlador)
    Route::put('/tickets/{id}/datos', [TicketController::class, 'actualizarDatos'])->whereNumber('id');
    // RustDesk del solicitante (dato por nomina; cualquier staff con acceso al ticket)
    Route::put('/tickets/{id}/rustdesk', [TicketController::class, 'actualizarRustdesk'])->whereNumber('id');

    // Adjuntos (solo logueados; owner o staff validado en el controlador)
    Route::post('/tickets/{id}/archivos', [TicketController::class, 'subirArchivo'])->whereNumber('id');
    Route::get('/tickets/{id}/archivos', [TicketController::class, 'archivos'])->whereNumber('id');
    Route::get('/tickets/{id}/archivos/{archivoId}', [TicketController::class, 'descargarArchivo'])->whereNumber(['id', 'archivoId']);

    // Acciones del USUARIO dueno: validar / reabrir el cierre
    Route::post('/tickets/{id}/validar', [TicketController::class, 'validar'])->whereNumber('id');
    Route::post('/tickets/{id}/reabrir', [TicketController::class, 'reabrir'])->whereNumber('id');

    // Operador / admin
    Route::middleware('role:admin,operador')->group(function () {
        Route::get('/tickets', [TicketController::class, 'index']);
        Route::post('/tickets/{id}/estado', [TicketController::class, 'cambiarEstado'])->whereNumber('id');
        Route::get('/staff', [TicketController::class, 'operadores']);
        // Autocompletar de empleados por nombre/nomina (buscador de nomina)
        Route::get('/empleados/buscar', [UserController::class, 'buscar']);
        // Datos de un usuario por nomina (autollenado al identificar invitados)
        Route::get('/usuarios/{nomina}', [UserController::class, 'show'])->where('nomina', '-?[0-9]+');
        // Dashboard / monitor (datos globales de equipo)
        Route::get('/dashboard', [DashboardController::class, 'index']);
        // Estadisticas personales del operador/admin (home)
        Route::get('/me/stats', [ReporteController::class, 'mias']);

        // Perfil personalizable (solo staff): color de tema + imagen de fondo
        Route::get('/me/perfil', [PerfilController::class, 'show']);
        Route::put('/me/perfil', [PerfilController::class, 'update']);
        Route::post('/me/perfil/fondo', [PerfilController::class, 'subirFondo']);
        Route::get('/me/perfil/fondo', [PerfilController::class, 'fondo']);
        Route::delete('/me/perfil/fondo', [PerfilController::class, 'quitarFondo']);

        // Respuestas rapidas / predeterminadas del operador (para el chat)
        Route::get('/me/respuestas', [RespuestaController::class, 'index']);
        Route::post('/me/respuestas', [RespuestaController::class, 'store']);
        Route::put('/me/respuestas/{id}', [RespuestaController::class, 'update'])->whereNumber('id');
        Route::delete('/me/respuestas/{id}', [RespuestaController::class, 'destroy'])->whereNumber('id');
    });

    // Solo admin: reportes, reasignar responsable, gestion de usuarios/roles y logs
    Route::middleware('role:admin')->group(function () {
        Route::get('/reportes', [ReporteController::class, 'index']);
        Route::post('/tickets/{id}/responsable', [TicketController::class, 'reasignar'])->whereNumber('id');
        Route::get('/usuarios', [UserController::class, 'index']);
        Route::put('/usuarios/{nomina}/rol', [UserController::class, 'setRole'])->where('nomina', '-?[0-9]+');
        Route::put('/usuarios/{nomina}/rustdesk', [UserController::class, 'setRustdesk'])->where('nomina', '-?[0-9]+');
        Route::get('/logs', [LogController::class, 'index']);
    });
});
