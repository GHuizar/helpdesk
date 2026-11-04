<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controlador delgado: recibe la peticion y delega en AuthService.
 */
class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService,
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $this->authService->login(
            $request->input('email'),
            $request->input('password'),
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Inicio de sesion correcto.',
            'token' => $data['token'],
            'user' => $data['user'],
            'role' => $data['role'],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $payload = $this->authService->sessionPayload($request->user());

        return response()->json([
            'status' => 'success',
            'user' => $payload['user'],
            'role' => $payload['role'],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Sesion cerrada.',
        ]);
    }
}
