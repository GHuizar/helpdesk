-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Datos extra por usuario (por nomina)
-- =============================================================================
--  Datos que pertenecen al USUARIO (no al ticket) y se reutilizan en todos sus
--  tickets. Hoy: el codigo de RustDesk (acceso remoto). Ligado por nomina; la BD
--  de usuarios es de solo lectura, por eso estos extras viven en la BD propia.
-- =============================================================================

SET NAMES utf8mb4;
USE `helpdesk`;

CREATE TABLE IF NOT EXISTS `ticket_usuario_datos` (
  `nomina`     INT(11)   NOT NULL,                 -- usuario (llave)
  `rustdesk`   BIGINT    NULL DEFAULT NULL,        -- ID de RustDesk (numerico; BIGINT por IDs de 10 digitos)
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`nomina`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si ya creaste la tabla con rustdesk VARCHAR, cambia el tipo a numerico (correr una sola vez):
-- ALTER TABLE `ticket_usuario_datos` MODIFY `rustdesk` BIGINT NULL DEFAULT NULL;
-- =============================================================================
