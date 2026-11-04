<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

/**
 * Fallback del SPA: sirve el index.html del front para rutas de navegacion que no
 * matchearon ninguna ruta real. Si la ruta es /api/* devuelve 404 JSON (no HTML).
 * Es un controlador (no closure) para que `route:cache` funcione en produccion.
 */
class SpaController extends Controller
{
    public function __invoke(Request $request)
    {
        if ($request->is('api/*')) {
            return response()->json(['status' => 'error', 'message' => 'Recurso no encontrado.'], 404);
        }

        $index = public_path('index.html');

        return file_exists($index) ? response()->file($index) : response('Not Found', 404);
    }
}
