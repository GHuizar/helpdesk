<?php

namespace App\Http\Controllers;

use App\Contracts\LogRepositoryInterface;
use App\Contracts\RoleRepositoryInterface;
use App\Contracts\UserRepositoryInterface;
use App\Contracts\UsuarioDatoRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Gestion de usuarios y roles (solo administrador).
 */
class UserController extends Controller
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly RoleRepositoryInterface $roles,
        private readonly LogRepositoryInterface $logs,
        private readonly UsuarioDatoRepositoryInterface $usuarioDatos,
    ) {}

    /** Lista usuarios (BD central) con su rol y su RustDesk, con busqueda opcional. */
    public function index(Request $request): JsonResponse
    {
        $users = $this->users->search($request->query('search'));
        $mapa = $this->usuarioDatos->rustdeskMap($users->pluck('nomina')->all());
        $users->each(fn ($u) => $u->rustdesk = $mapa[$u->nomina] ?? null);

        return response()->json([
            'status' => 'success',
            'data' => $users,
        ]);
    }

    /** Guarda el ID de RustDesk de un usuario por nomina (solo admin, desde la gestion de usuarios). */
    public function setRustdesk(Request $request, int $nomina): JsonResponse
    {
        $request->validate([
            'rustdesk' => ['nullable', 'integer', 'min:0'],
        ]);

        $val = $request->input('rustdesk');
        $this->usuarioDatos->upsertRustdesk($nomina, ($val === null || $val === '') ? null : (int) $val);

        return response()->json([
            'status' => 'success',
            'message' => 'RustDesk actualizado.',
            'rustdesk' => $this->usuarioDatos->rustdesk($nomina),
        ]);
    }

    /** Autocompletar de empleados por nombre o nomina (para el buscador de nomina; admin/operador). */
    public function buscar(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->users->search($q, 8),
        ]);
    }

    /** Datos de un usuario por nomina (autollenado, p. ej. al identificar a un invitado). */
    public function show(int $nomina): JsonResponse
    {
        $u = $this->users->findByNomina($nomina);
        if (! $u) {
            return response()->json(['status' => 'error', 'message' => 'No se encontro un usuario con esa nomina.'], 404);
        }

        // Adjunta el dato POR USUARIO (nuestra BD): codigo de RustDesk, para prellenarlo.
        $u->rustdesk = $this->usuarioDatos->rustdesk($nomina);

        return response()->json(['status' => 'success', 'data' => $u]);
    }

    /** Asigna el rol a un usuario por nomina. */
    public function setRole(Request $request, int $nomina): JsonResponse
    {
        $request->validate([
            'rol' => ['required', 'in:admin,operador,usuario'],
        ]);

        $rol = $request->input('rol');

        // Proteccion: un admin no puede quitarse a si mismo el rol de admin.
        if ((int) $nomina === (int) $request->user()->nomina && $rol !== 'admin') {
            throw ValidationException::withMessages([
                'rol' => ['No puedes quitarte a ti mismo el rol de administrador.'],
            ]);
        }

        $this->roles->setRole($nomina, $rol, (int) $request->user()->nomina);

        $actor = $request->user();
        $this->logs->add([
            'actor_nomina' => (int) $actor->nomina,
            'actor_nombre' => trim(($actor->name ?? '') . ' ' . ($actor->apellidopaterno ?? '')),
            'accion' => 'rol',
            'entidad' => 'usuario',
            'entidad_id' => (string) $nomina,
            'detalle' => "Rol asignado: {$rol}",
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Rol actualizado.',
            'data' => ['nomina' => $nomina, 'rol' => $rol],
        ]);
    }
}
