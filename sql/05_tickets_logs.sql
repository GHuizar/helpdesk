-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Log global de trazabilidad (incremento 7)
-- =============================================================================
--  Bitacora GLOBAL de acciones (el "Log de TODO, por separado"). Distinto del
--  timeline por ticket (ticket_eventos): aqui se registra TODO de forma central
--  (creacion, cambios de estado, mensajes, notas, archivos, cambios de rol).
--  Idempotente.
-- =============================================================================

SET NAMES utf8mb4;

USE `helpdesk`;

CREATE TABLE IF NOT EXISTS `ticket_logs` (
  `id`            BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_nomina`  INT(11)      NULL DEFAULT NULL,
  `actor_nombre`  VARCHAR(180) NULL DEFAULT NULL,
  `accion`        VARCHAR(60)  NOT NULL,            -- ticket_creado | estado | responsable | archivo | datos
  `entidad`       VARCHAR(40)  NOT NULL DEFAULT 'ticket', -- ticket | usuario
  `entidad_id`    VARCHAR(40)  NULL DEFAULT NULL,   -- id/folio del ticket o nomina
  `detalle`       VARCHAR(500) NULL DEFAULT NULL,
  `ip`            VARCHAR(45)  NULL DEFAULT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_logs_created` (`created_at`),
  KEY `idx_ticket_logs_accion` (`accion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- =============================================================================
