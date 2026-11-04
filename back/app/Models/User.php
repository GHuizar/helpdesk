<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Modelo del usuario.
 *
 * IMPORTANTE: la tabla `users` es EXTERNA: vive en un directorio corporativo
 * centralizado que administra otro sistema y que aqui solo se lee. NO se crea ni
 * se modifica su estructura desde este proyecto (sin migraciones).
 * La autenticacion se realiza por `email` + `password`; la clave relacional
 * interna es la `nomina` (puede ser negativa para becarios).
 */
class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    /** Conexion a la BD EXTERNA de usuarios (definida en config/database.php). */
    protected $connection = 'usuarios';

    /** Tabla asociada (explicita por claridad). */
    protected $table = 'users';

    /** Clave primaria a nivel Eloquent: usamos `nomina` (NO users.id). */
    protected $primaryKey = 'nomina';

    /** La nomina no es auto-incremental. */
    public $incrementing = false;

    /** Tipo de la clave (int). */
    protected $keyType = 'int';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'nomina',
        'name',
        'apellidopaterno',
        'apellidomaterno',
        'usuario',
        'email',
        'password',
        'status',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'api_token',
        'priv',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }
}
