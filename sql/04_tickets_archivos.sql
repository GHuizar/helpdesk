-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Adjuntos / evidencia (incremento 4)
-- =============================================================================
--  Evidencia del ticket (PDF, imagenes, archivos). SOLO usuarios logueados
--  pueden subir (los endpoints viven detras de auth:sanctum). Idempotente.
-- =============================================================================

SET NAMES utf8mb4;

USE `helpdesk`;

CREATE TABLE IF NOT EXISTS `ticket_archivos` (
  `id`                  BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id`           BIGINT(20) UNSIGNED NOT NULL,
  `nombre_original`     VARCHAR(255) NOT NULL,
  `ruta`                VARCHAR(255) NOT NULL,            -- ruta relativa en el disco
  `mime`                VARCHAR(150) NULL DEFAULT NULL,
  `tamano`              INT(11)      NOT NULL DEFAULT 0,  -- bytes
  `subido_por_nomina`   INT(11)      NULL DEFAULT NULL,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_archivos_ticket` (`ticket_id`),
  CONSTRAINT `fk_ticket_archivos_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- =============================================================================
