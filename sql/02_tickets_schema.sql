-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Esquema base de Tickets (PLANTILLA, incremento 2)
-- =============================================================================
--  Version preliminar para empezar la creacion de tickets. Se ampliara luego
--  (chat, archivos, timeline, justificaciones, validacion de cierre, etc.).
--  Correr en MySQL sobre la BD del proyecto.
-- =============================================================================

SET NAMES utf8mb4;

USE `helpdesk`;

-- -----------------------------------------------------------------------------
-- Catalogo de tipos de ticket (con area y operador responsable por defecto).
-- El "Responsable" de un ticket se asigna AUTOMATICO por tipo; el admin reasigna.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_tipos` (
  `id`                           INT(11)      NOT NULL AUTO_INCREMENT,
  `nombre`                       VARCHAR(120) NOT NULL,
  `area`                         VARCHAR(120) NULL DEFAULT NULL,
  `operador_responsable_nomina`  INT(11)      NULL DEFAULT NULL,   -- nomina (signed)
  `activo`                       TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`                   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_tipos_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Tickets.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tickets` (
  `id`                  BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `folio`               VARCHAR(20)  NULL DEFAULT NULL,            -- TK-000001 (se asigna tras insertar)
  `nomina`              INT(11)      NULL DEFAULT NULL,            -- signed; null si invitado sin nomina
  `nombre`              VARCHAR(180) NOT NULL,
  `puesto`              VARCHAR(180) NULL DEFAULT NULL,
  `departamento`        VARCHAR(180) NULL DEFAULT NULL,
  `correo`              VARCHAR(180) NULL DEFAULT NULL,            -- requerido si invitado
  `es_invitado`         TINYINT(1)   NOT NULL DEFAULT 0,
  `tipo_id`             INT(11)      NULL DEFAULT NULL,
  `problema`            TEXT         NOT NULL,
  `estado`              ENUM('abierto','en_curso','pausado','cancelado','finalizado','validado') NOT NULL DEFAULT 'abierto',
  `responsable_nomina`  INT(11)      NULL DEFAULT NULL,            -- operador asignado (signed)
  `creado_por_nomina`   INT(11)      NULL DEFAULT NULL,            -- quien registro (operador en alta manual o el propio usuario)
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `finalizado_at`       TIMESTAMP    NULL DEFAULT NULL,
  `validado_at`         TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tickets_folio` (`folio`),
  KEY `idx_tickets_nomina` (`nomina`),
  KEY `idx_tickets_estado` (`estado`),
  KEY `idx_tickets_tipo` (`tipo_id`),
  CONSTRAINT `fk_tickets_tipo` FOREIGN KEY (`tipo_id`) REFERENCES `ticket_tipos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Semilla de tipos.
-- -----------------------------------------------------------------------------
-- INSERT IGNORE + UNIQUE(nombre): re-correr este script NO duplica los tipos.
INSERT IGNORE INTO `ticket_tipos` (`nombre`, `area`, `activo`) VALUES
  ('Sistemas / TI',      'Sistemas',          1),
  ('Recursos Humanos',   'Recursos Humanos',  1),
  ('Mantenimiento',      'Mantenimiento',     1),
  ('Compras',            'Compras',           1),
  ('Otro',               'General',           1);
-- =============================================================================
