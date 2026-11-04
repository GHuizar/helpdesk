<?php

namespace App\Providers;

use App\Contracts\DashboardRepositoryInterface;
use App\Contracts\DepartamentoRepositoryInterface;
use App\Contracts\LogRepositoryInterface;
use App\Contracts\NotificacionRepositoryInterface;
use App\Contracts\PrefRepositoryInterface;
use App\Contracts\RespuestaRepositoryInterface;
use App\Contracts\RoleRepositoryInterface;
use App\Contracts\TicketRepositoryInterface;
use App\Contracts\UserRepositoryInterface;
use App\Contracts\UsuarioDatoRepositoryInterface;
use App\Repositories\DashboardRepository;
use App\Repositories\DepartamentoRepository;
use App\Repositories\LogRepository;
use App\Repositories\NotificacionRepository;
use App\Repositories\PrefRepository;
use App\Repositories\RespuestaRepository;
use App\Repositories\RoleRepository;
use App\Repositories\UsuarioDatoRepository;
use App\Repositories\TicketRepository;
use App\Repositories\UserRepository;
use Illuminate\Support\ServiceProvider;

/**
 * Enlaza interfaces con sus implementaciones (DIP).
 */
class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(RoleRepositoryInterface::class, RoleRepository::class);
        $this->app->bind(TicketRepositoryInterface::class, TicketRepository::class);
        $this->app->bind(DepartamentoRepositoryInterface::class, DepartamentoRepository::class);
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(LogRepositoryInterface::class, LogRepository::class);
        $this->app->bind(DashboardRepositoryInterface::class, DashboardRepository::class);
        $this->app->bind(PrefRepositoryInterface::class, PrefRepository::class);
        $this->app->bind(NotificacionRepositoryInterface::class, NotificacionRepository::class);
        $this->app->bind(RespuestaRepositoryInterface::class, RespuestaRepository::class);
        $this->app->bind(UsuarioDatoRepositoryInterface::class, UsuarioDatoRepository::class);
    }

    public function boot(): void
    {
        //
    }
}
