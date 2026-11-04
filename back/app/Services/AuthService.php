<?php

namespace App\Services;

use App\Contracts\RoleRepositoryInterface;
use App\Contracts\UserRepositoryInterface;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Orquesta la autenticacion.
 * - Login por CORREO + contrasena (contra la BD de usuarios centralizada).
 * - La NOMINA es la clave relacional interna (roles, tokens).
 * - Devuelve el ROL efectivo (admin | operador | usuario).
 */
class AuthService
{
    public function __construct(
        private readonly RoleRepositoryInterface $roles,
        private readonly UserRepositoryInterface $users,
    ) {}

    /**
     * Resuelve las descripciones de departamento y puesto (FKs idDepartamento/idPuesto
     * de la tabla users) y las anexa al modelo para que el front las use en formularios.
     */
    private function enrich(User $user): User
    {
        $datos = $this->users->findByNomina((int) $user->nomina);
        $user->setAttribute('departamento', $datos->departamento ?? null);
        $user->setAttribute('puesto', $datos->puesto ?? null);

        return $user;
    }

    /**
     * @return array{user: User, token: string, role: string}
     *
     * @throws ValidationException
     */
    public function login(string $email, string $password): array
    {
        /** @var User|null $user */
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($password, (string) $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales invalidas. Verifica tu correo y contrasena.'],
            ]);
        }

        if ((int) $user->status !== 1) {
            throw ValidationException::withMessages([
                'email' => ['Tu usuario esta inactivo. Contacta al administrador.'],
            ]);
        }

        if ($user->nomina === null) {
            throw ValidationException::withMessages([
                'email' => ['Este usuario no tiene nomina asignada y no puede usar el sistema.'],
            ]);
        }

        $token = $user->createToken('tickets-spa')->plainTextToken;

        return [
            'user' => $this->enrich($user),
            'token' => $token,
            'role' => $this->roles->getRole((int) $user->nomina),
        ];
    }

    public function logout(User $user): void
    {
        $token = $user->currentAccessToken();
        if ($token) {
            $token->delete();
        }
    }

    /**
     * @return array{user: User, role: string}
     */
    public function sessionPayload(User $user): array
    {
        return [
            'user' => $this->enrich($user),
            'role' => $this->roles->getRole((int) $user->nomina),
        ];
    }
}
