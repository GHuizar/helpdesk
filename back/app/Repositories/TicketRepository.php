<?php

namespace App\Repositories;

use App\Contracts\TicketRepositoryInterface;
use App\Support\UsesExternalUsersDb;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Acceso a tickets. Vive en la BD propia (conexion default 'mysql' -> helpdesk).
 * Los datos de identidad del solicitante se guardan denormalizados en el ticket; el
 * nombre del RESPONSABLE se resuelve por JOIN con la BD externa de usuarios.
 */
class TicketRepository implements TicketRepositoryInterface
{
    use UsesExternalUsersDb;

    // Nombre del responsable resuelto desde la BD externa de usuarios.
    private function responsableNombreSelect()
    {
        return DB::raw("TRIM(CONCAT(COALESCE(ru.name,''),' ',COALESCE(ru.apellidopaterno,''))) as responsable_nombre");
    }

    private const SELECT = [
        't.id', 't.folio', 't.nomina', 't.nombre', 't.puesto', 't.departamento',
        't.correo', 't.es_invitado', 't.tipo_id', 't.problema', 't.estado',
        't.responsable_nomina', 't.creado_por_nomina',
        't.created_at', 't.finalizado_at', 't.validado_at',
    ];

    public function tiposActivos(): Collection
    {
        return DB::table('ticket_tipos')
            ->where('activo', 1)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'area', 'operador_responsable_nomina']);
    }

    public function responsableForTipo(int $tipoId): ?int
    {
        $val = DB::table('ticket_tipos')->where('id', $tipoId)->value('operador_responsable_nomina');
        return $val !== null ? (int) $val : null;
    }

    public function create(array $data): int
    {
        return (int) DB::table('tickets')->insertGetId($data);
    }

    public function setFolio(int $id, string $folio): void
    {
        DB::table('tickets')->where('id', $id)->update(['folio' => $folio]);
    }

    public function find(int $id): ?object
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->leftJoin($this->usersTable('ru'), 'ru.nomina', '=', 't.responsable_nomina')
            ->where('t.id', $id)
            ->first(array_merge(self::SELECT, ['tt.nombre as tipo_nombre', 'tt.area as tipo_area', $this->responsableNombreSelect()]));
    }

    public function listByNomina(int $nomina): Collection
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->where('t.nomina', $nomina)
            ->orderByDesc('t.created_at')
            ->get(array_merge(self::SELECT, [
                'tt.nombre as tipo_nombre',
                // Mensajes NUEVOS del operador sin ver: notificaciones de mensaje NO leidas de este
                // usuario para el ticket. Se vacian al abrir el ticket (marcarTicketVisto).
                DB::raw("(SELECT COUNT(*) FROM ticket_notificaciones n WHERE n.ticket_id = t.id AND n.user_nomina = {$nomina} AND n.tipo = 'mensaje' AND n.leida = 0) as nuevos_para_usuario"),
            ]));
    }

    public function listAll(array $filters = []): Collection
    {
        // Nomina de quien consulta: para el badge de "mensajes nuevos" (sus notis no leidas).
        $viewer = isset($filters['viewer']) ? (int) $filters['viewer'] : 0;

        $q = DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->leftJoin($this->usersTable('ru'), 'ru.nomina', '=', 't.responsable_nomina');

        if (! empty($filters['estado'])) {
            $q->where('t.estado', $filters['estado']);
        }
        if (array_key_exists('responsable', $filters) && $filters['responsable'] !== null) {
            $q->where('t.responsable_nomina', $filters['responsable']);
        }
        if (! empty($filters['search'])) {
            $s = $filters['search'];
            $q->where(function ($qq) use ($s) {
                $qq->where('t.folio', 'like', "%{$s}%")
                    ->orWhere('t.nombre', 'like', "%{$s}%")
                    ->orWhere('t.problema', 'like', "%{$s}%")
                    ->orWhere('t.nomina', 'like', "%{$s}%");
            });
        }

        return $q->orderByDesc('t.created_at')
            ->get(array_merge(self::SELECT, [
                'tt.nombre as tipo_nombre',
                $this->responsableNombreSelect(),
                // Indicadores de conversacion para el listado:
                // - mensajes_staff: si un operador ya escribio (para el "doblez de hoja").
                // - nuevos_para_staff: mensajes NUEVOS sin ver = notis de mensaje NO leidas de quien
                //   consulta para el ticket. Se vacian al abrir el ticket (marcarTicketVisto).
                DB::raw('(SELECT COUNT(*) FROM ticket_mensajes m WHERE m.ticket_id = t.id AND m.es_staff = 1 AND m.es_interno = 0) as mensajes_staff'),
                DB::raw("(SELECT COUNT(*) FROM ticket_notificaciones n WHERE n.ticket_id = t.id AND n.user_nomina = {$viewer} AND n.tipo = 'mensaje' AND n.leida = 0) as nuevos_para_staff"),
            ]));
    }

    public function countsByEstado(?int $responsable = null): array
    {
        return DB::table('tickets')
            ->when($responsable !== null, fn ($q) => $q->where('responsable_nomina', $responsable))
            ->select('estado', DB::raw('COUNT(*) as c'))
            ->groupBy('estado')
            ->pluck('c', 'estado')
            ->map(fn ($c) => (int) $c)
            ->all();
    }

    public function listMensajes(int $ticketId, bool $incluirInternos): Collection
    {
        return DB::table('ticket_mensajes')
            ->where('ticket_id', $ticketId)
            ->when(! $incluirInternos, fn ($q) => $q->where('es_interno', 0))
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'autor_nomina', 'autor_nombre', 'es_staff', 'es_interno', 'cuerpo', 'imagen', 'created_at']);
    }

    public function addMensaje(array $data): int
    {
        return (int) DB::table('ticket_mensajes')->insertGetId($data);
    }

    public function findMensaje(int $ticketId, int $mensajeId): ?object
    {
        return DB::table('ticket_mensajes')
            ->where('ticket_id', $ticketId)
            ->where('id', $mensajeId)
            ->first(['id', 'ticket_id', 'es_interno', 'imagen']);
    }

    public function listEventos(int $ticketId): Collection
    {
        return DB::table('ticket_eventos')
            ->where('ticket_id', $ticketId)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'tipo', 'estado_anterior', 'estado_nuevo', 'actor_nomina', 'actor_nombre', 'descripcion', 'created_at']);
    }

    public function addEvento(array $data): void
    {
        DB::table('ticket_eventos')->insert($data);
    }

    public function updateEstado(int $id, array $data): void
    {
        DB::table('tickets')->where('id', $id)->update($data);
    }

    public function finalizadosVencidos(int $horas): Collection
    {
        return DB::table('tickets')
            ->where('estado', 'finalizado')
            ->whereNotNull('finalizado_at')
            ->where('finalizado_at', '<=', now()->subHours($horas))
            ->get(['id', 'folio', 'nomina', 'correo']);
    }

    public function addArchivo(array $data): int
    {
        return (int) DB::table('ticket_archivos')->insertGetId($data);
    }

    public function listArchivos(int $ticketId): Collection
    {
        return DB::table('ticket_archivos as a')
            ->leftJoin($this->usersTable('su'), 'su.nomina', '=', 'a.subido_por_nomina')
            ->where('a.ticket_id', $ticketId)
            ->orderByDesc('a.id')
            ->get([
                'a.id', 'a.nombre_original', 'a.mime', 'a.tamano', 'a.subido_por_nomina', 'a.created_at',
                DB::raw("TRIM(CONCAT(COALESCE(su.name,''),' ',COALESCE(su.apellidopaterno,''))) as subido_por_nombre"),
            ]);
    }

    public function findArchivo(int $ticketId, int $archivoId): ?object
    {
        return DB::table('ticket_archivos')
            ->where('ticket_id', $ticketId)
            ->where('id', $archivoId)
            ->first(['id', 'ticket_id', 'nombre_original', 'ruta', 'mime', 'tamano']);
    }

    public function findByFolio(string $folio): ?object
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->where('t.folio', $folio)
            ->first(array_merge(self::SELECT, ['tt.nombre as tipo_nombre']));
    }

    public function countByDepartamento(): Collection
    {
        return DB::table('tickets')
            ->selectRaw("COALESCE(NULLIF(departamento, ''), 'Sin departamento') as departamento, COUNT(*) as total")
            ->groupBy('departamento')
            ->orderByDesc('total')
            ->get();
    }

    public function countByTipo(): Collection
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->selectRaw("COALESCE(tt.nombre, 'Sin tipo') as tipo, COUNT(*) as total")
            ->groupBy('tipo')
            ->orderByDesc('total')
            ->get();
    }

    public function oldestOpen(int $limit): Collection
    {
        return DB::table('tickets as t')
            ->leftJoin('ticket_tipos as tt', 'tt.id', '=', 't.tipo_id')
            ->whereNotIn('t.estado', ['validado', 'cancelado'])
            ->orderBy('t.created_at')
            ->limit($limit)
            ->get([
                't.id', 't.folio', 't.estado', 't.departamento', 't.nombre', 't.created_at',
                'tt.nombre as tipo_nombre',
                DB::raw('TIMESTAMPDIFF(DAY, t.created_at, NOW()) as dias'),
            ]);
    }
}
