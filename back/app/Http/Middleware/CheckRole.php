<?php

namespace App\Http\Middleware;

use App\Contracts\RoleRepositoryInterface;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protege rutas exigiendo uno o varios roles.
 * Uso:  ->middleware('role:admin')
 *       ->middleware('role:admin,operador')
 */
class CheckRole
{
    public function __construct(
        private readonly RoleRepositoryInterface $roles
    ) {}

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'No autenticado.',
            ], 401);
        }

        if (! $this->roles->hasRole((int) $user->nomina, $roles)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No tienes permiso para realizar esta accion.',
            ], 403);
        }

        return $next($request);
    }
}
