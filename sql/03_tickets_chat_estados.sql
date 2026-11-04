-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Chat, notas internas y timeline (incremento 3)
-- =============================================================================
--  Agrega:
--   - ticket_mensajes : chat del ticket + notas internas (es_interno=1, solo staff).
--   - ticket_eventos  : timeline / trazabilidad de cambios de estado y acciones.
--  Correr sobre la BD del proyecto. Idempotente (CREATE TABLE IF NOT EXISTS).
-- =============================================================================

SET NAMES utf8mb4;

USE `helpdesk`;

-- -----------------------------------------------------------------------------
-- Mensajes del ticket (chat). es_interno=1 => nota interna (la ve solo staff).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_mensajes` (
  `id`            BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id`     BIGINT(20) UNSIGNED NOT NULL,
  `autor_nomina`  INT(11)      NULL DEFAULT NULL,   -- signed; null si invitado
  `autor_nombre`  VARCHAR(180) NULL DEFAULT NULL,
  `es_staff`      TINYINT(1)   NOT NULL DEFAULT 0,  -- el autor era operador/admin al escribir
  `es_interno`    TINYINT(1)   NOT NULL DEFAULT 0,  -- nota interna (oculta al usuario)
  `cuerpo`        TEXT         NOT NULL,
  `imagen`        VARCHAR(255) NULL DEFAULT NULL,  -- ruta relativa en el disco 'local' (imagen adjunta al mensaje)
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_mensajes_ticket` (`ticket_id`),
  CONSTRAINT `fk_ticket_mensajes_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Eventos / timeline del ticket (trazabilidad).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_eventos` (
  `id`               BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id`        BIGINT(20) UNSIGNED NOT NULL,
  `tipo`             VARCHAR(40)  NOT NULL,            -- creado | estado | asignacion | contacto | datos
  `estado_anterior`  VARCHAR(20)  NULL DEFAULT NULL,
  `estado_nuevo`     VARCHAR(20)  NULL DEFAULT NULL,
  `actor_nomina`     INT(11)      NULL DEFAULT NULL,
  `actor_nombre`     VARCHAR(180) NULL DEFAULT NULL,
  `descripcion`      VARCHAR(500) NULL DEFAULT NULL,   -- justificacion / detalle
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_eventos_ticket` (`ticket_id`),
  CONSTRAINT `fk_ticket_eventos_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- =============================================================================
