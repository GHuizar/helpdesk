-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Esquema de Autenticacion y Roles
-- =============================================================================
--  Ejecuta este script DIRECTAMENTE en MySQL (phpMyAdmin / consola).
--  NO usar migraciones de Laravel (decision del proyecto).
--
--  CONVENCIONES:
--    - Clave relacional con usuarios = `nomina` (NO users.id). Puede ser NEGATIVA
--      (becarios / cuentas especiales, p. ej. -55) -> tipos con signo.
--    - La tabla `users` es EXTERNA (vive en helpdesk_users) y NO se toca.
--    - Login por `email` + `password` contra esa BD externa centralizada.
--    - El rol vive aqui (ticket_user_roles). Sin fila => rol efectivo 'usuario'.
--    - El token de Sanctum guarda la nomina como tokenable_id (BIGINT con signo).
-- =============================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `helpdesk`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `helpdesk`;

-- -----------------------------------------------------------------------------
-- 1) Roles por usuario (admin | operador | usuario)
--    Sin fila para una nomina => su rol efectivo es 'usuario'.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_user_roles` (
  `id`           INT(11)   NOT NULL AUTO_INCREMENT,
  `user_nomina`  INT(11)   NOT NULL,                       -- nomina del usuario externo (signed)
  `rol`          ENUM('admin','operador','usuario') NOT NULL DEFAULT 'usuario',
  `assigned_by`  INT(11)   NULL DEFAULT NULL,              -- nomina del admin que asigno
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_user_roles_nomina` (`user_nomina`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2) Tokens de Sanctum
--    tokenable_id va SIGNED porque la nomina puede ser negativa.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
  `id`             BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tokenable_type` VARCHAR(255) NOT NULL,
  `tokenable_id`   BIGINT(20)   NOT NULL,        -- nomina (puede ser negativa)
  `name`           VARCHAR(255) NOT NULL,
  `token`          VARCHAR(64)  NOT NULL,
  `abilities`      TEXT         NULL DEFAULT NULL,
  `last_used_at`   TIMESTAMP    NULL DEFAULT NULL,
  `expires_at`     TIMESTAMP    NULL DEFAULT NULL,
  `created_at`     TIMESTAMP    NULL DEFAULT NULL,
  `updated_at`     TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `pat_tokenable_index` (`tokenable_type`, `tokenable_id`),
  KEY `pat_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3) Asignar el PRIMER administrador (descomenta y ajusta la nomina)
--    Cualquier usuario sin fila aqui entra como 'usuario'.
-- -----------------------------------------------------------------------------
-- INSERT INTO `ticket_user_roles` (`user_nomina`, `rol`, `assigned_by`)
--   VALUES (1001, 'admin', 1001)
--   ON DUPLICATE KEY UPDATE `rol` = VALUES(`rol`);
--
-- Ejemplo operador:
-- INSERT INTO `ticket_user_roles` (`user_nomina`, `rol`, `assigned_by`)
--   VALUES (1002, 'operador', 1001)
--   ON DUPLICATE KEY UPDATE `rol` = VALUES(`rol`);
-- =============================================================================
