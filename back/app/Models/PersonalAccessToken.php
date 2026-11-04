<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Modelo de token de Sanctum anclado a la BD PROPIA del proyecto
 * (conexion 'mysql' -> helpdesk).
 *
 * POR QUE: el modelo User vive en la conexion 'usuarios' (BD externa
 * helpdesk_users). La relacion tokens() de Sanctum es un morphMany y Eloquent
 * propaga la conexion del padre (usuarios) al modelo hijo cuando este NO define
 * la suya. Eso provocaba que los tokens se insertaran en helpdesk_users, cuya
 * tabla personal_access_tokens tiene tokenable_id UNSIGNED y rechaza nominas
 * negativas (becarios). Al fijar aqui la conexion, los tokens van a
 * helpdesk, donde tokenable_id es BIGINT con signo.
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    protected $connection = 'mysql';
}
