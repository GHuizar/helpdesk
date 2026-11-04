<?php

namespace App\Contracts;

use Illuminate\Support\Collection;

interface TicketRepositoryInterface
{
    /** Tipos de ticket activos (catalogo). */
    public function tiposActivos(): Collection;

    /** Operador responsable por defecto de un tipo (o null). */
    public function responsableForTipo(int $tipoId): ?int;

    /** Crea un ticket y devuelve su id. */
    public function create(array $data): int;

    /** Asigna el folio (TK-000001) tras conocer el id. */
    public function setFolio(int $id, string $folio): void;

    /** Un ticket por id (con nombre del tipo). */
    public function find(int $id): ?object;

    /** Tickets de una nomina (mas reciente primero). */
    public function listByNomina(int $nomina): Collection;

    /** Todos los tickets (para operador/admin), con filtros opcionales. */
    public function listAll(array $filters = []): Collection;

    /** Conteo de tickets por estado (opcionalmente solo los de un responsable). */
    public function countsByEstado(?int $responsable = null): array;

    // --- Detalle: mensajes (chat + notas internas), eventos (timeline), estado ---

    /** Mensajes del ticket. Si !$incluirInternos, oculta las notas internas. */
    public function listMensajes(int $ticketId, bool $incluirInternos): Collection;

    /** Agrega un mensaje y devuelve su id. */
    public function addMensaje(array $data): int;

    /** Un mensaje por id dentro de un ticket (para servir su imagen adjunta). */
    public function findMensaje(int $ticketId, int $mensajeId): ?object;

    /** Eventos (timeline) del ticket, mas antiguo primero. */
    public function listEventos(int $ticketId): Collection;

    /** Registra un evento en el timeline. */
    public function addEvento(array $data): void;

    /** Actualiza estado y campos asociados (finalizado_at/validado_at/responsable). */
    public function updateEstado(int $id, array $data): void;

    /** Tickets en estado 'finalizado' (por validar) cuyo finalizado_at supera N horas. */
    public function finalizadosVencidos(int $horas): Collection;

    // --- Adjuntos / evidencia ---

    /** Registra un archivo y devuelve su id. */
    public function addArchivo(array $data): int;

    /** Archivos de un ticket. */
    public function listArchivos(int $ticketId): Collection;

    /** Un archivo por id dentro de un ticket (para descarga). */
    public function findArchivo(int $ticketId, int $archivoId): ?object;

    // --- Seguimiento publico ---

    /** Busca un ticket por folio (con nombre del tipo). */
    public function findByFolio(string $folio): ?object;

    // --- Reportes ---

    /** Conteo de tickets por departamento (mayor primero). */
    public function countByDepartamento(): Collection;

    /** Conteo de tickets por tipo (mayor primero). */
    public function countByTipo(): Collection;

    /** Tickets abiertos (no validados ni cancelados) mas longevos. */
    public function oldestOpen(int $limit): Collection;
}
