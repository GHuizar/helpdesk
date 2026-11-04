-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Preferencias de perfil (solo operador/admin)
-- =============================================================================
--  Personalizacion por usuario de la VISTA DE ADMINISTRACION: color del tema
--  (topbar/acentos) e imagen de fondo. Solo aplica a staff (operador/admin).
-- =============================================================================

SET NAMES utf8mb4;
USE `helpdesk`;

CREATE TABLE IF NOT EXISTS `ticket_user_prefs` (
  `user_nomina` INT(11)      NOT NULL,
  `accent`      VARCHAR(20)  NULL DEFAULT NULL,    -- color hex del topbar/acento
  `bar_text`    VARCHAR(10)  NOT NULL DEFAULT 'auto', -- contraste del texto de la barra: auto|light|dark
  `tema`        VARCHAR(10)  NOT NULL DEFAULT 'claro', -- modo de la vista: claro|oscuro
  `bg_ruta`     VARCHAR(255) NULL DEFAULT NULL,    -- ruta de la imagen de fondo (storage)
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_nomina`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si la tabla ya existia sin las columnas (correr una vez; ignora el error si ya existen):
-- ALTER TABLE `ticket_user_prefs` ADD COLUMN `bar_text` VARCHAR(10) NOT NULL DEFAULT 'auto' AFTER `accent`;
-- ALTER TABLE `ticket_user_prefs` ADD COLUMN `tema` VARCHAR(10) NOT NULL DEFAULT 'claro' AFTER `bar_text`;
-- =============================================================================
