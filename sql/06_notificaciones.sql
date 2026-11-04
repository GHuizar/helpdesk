-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Notificaciones in-app (campanita)
-- =============================================================================
--  Notifica al destinatario (por nomina) cuando: le llega un mensaje, debe validar
--  un cierre, se le asigna un ticket o se reabre. Es el "pre" de los correos.
--  Vive en la BD propia del proyecto (conexion 'mysql').
-- =============================================================================

SET NAMES utf8mb4;

USE `helpdesk`;

CREATE TABLE IF NOT EXISTS `ticket_notificaciones` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_nomina` INT(11)         NOT NULL,                 -- destinatario
  `ticket_id`   BIGINT UNSIGNED NULL DEFAULT NULL,        -- ticket relacionado
  `folio`       VARCHAR(40)     NULL DEFAULT NULL,        -- folio para mostrar sin join
  `tipo`        VARCHAR(30)     NOT NULL,                 -- mensaje|contacto|validar|asignado|reabierto|cancelado
  `titulo`      VARCHAR(180)    NOT NULL,
  `cuerpo`      VARCHAR(255)    NULL DEFAULT NULL,
  `leida`       TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_leida` (`user_nomina`, `leida`),
  KEY `idx_user_created` (`user_nomina`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- =============================================================================
