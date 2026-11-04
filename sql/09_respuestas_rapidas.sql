-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Respuestas rapidas / predeterminadas (staff)
-- =============================================================================
--  Cada operador/admin guarda sus propias respuestas predeterminadas (desde su
--  perfil) y puede insertarlas en el chat de un ticket con un boton. Privadas
--  por usuario (se filtran por user_nomina).
-- =============================================================================

SET NAMES utf8mb4;
USE `helpdesk`;

CREATE TABLE IF NOT EXISTS `ticket_respuestas_rapidas` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_nomina` INT(11)       NOT NULL,                 -- dueno de la respuesta
  `titulo`      VARCHAR(80)   NULL DEFAULT NULL,         -- etiqueta corta (opcional)
  `texto`       VARCHAR(2000) NOT NULL,                  -- cuerpo de la respuesta
  `orden`       INT(11)       NOT NULL DEFAULT 0,        -- orden de aparicion
  `created_at`  TIMESTAMP     NULL DEFAULT NULL,
  `updated_at`  TIMESTAMP     NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_resp_user` (`user_nomina`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- =============================================================================
