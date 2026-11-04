<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validacion para crear un ticket.
 * - Modo self (cualquier usuario): la identidad se toma del usuario autenticado;
 *   solo se requieren tipo_id y problema.
 * - Modo manual (operador/admin, `manual=true`): el operador captura la identidad,
 *   por lo que `nombre` es obligatorio. La nomina puede ser negativa (becarios).
 */
class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tipo_id' => ['required', 'integer', 'exists:ticket_tipos,id'],
            'problema' => ['required', 'string', 'min:5', 'max:5000'],
            'manual' => ['sometimes', 'boolean'],
            'nombre' => ['required_if:manual,true', 'nullable', 'string', 'max:180'],
            'nomina' => ['nullable', 'integer'],
            'puesto' => ['nullable', 'string', 'max:180'],
            // Departamento obligatorio en alta self (usuario); opcional en alta manual del operador.
            'departamento' => ['required_unless:manual,1,true', 'nullable', 'string', 'max:180'],
            'correo' => ['nullable', 'email', 'max:180'],
            'rustdesk' => ['nullable', 'integer', 'min:0'], // ID de RustDesk (numerico); solo se guarda en alta manual con nomina
        ];
    }

    public function messages(): array
    {
        return [
            'tipo_id.required' => 'Selecciona un tipo de ticket.',
            'tipo_id.exists' => 'El tipo de ticket no es valido.',
            'problema.required' => 'Describe el problema.',
            'problema.min' => 'La descripcion es demasiado corta.',
            'nombre.required_if' => 'El nombre es obligatorio en alta manual.',
            'departamento.required_unless' => 'Selecciona tu departamento.',
            'correo.email' => 'Ingresa un correo valido.',
        ];
    }
}
