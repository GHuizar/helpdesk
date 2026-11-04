-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Directorio de usuarios (BD EXTERNA) + datos demo
-- =============================================================================
--  En el despliegue original esta BD NO pertenece al proyecto: es un directorio
--  corporativo centralizado, administrado por otro sistema, que HelpDesk consume
--  en SOLO LECTURA (conexion 'usuarios' en config/database.php).
--
--  Este script existe para que el repositorio sea ejecutable de forma autonoma:
--  crea la estructura minima que el codigo espera y la llena con datos FICTICIOS.
--
--  IMPORTANTE
--    - Ambas BDs (`helpdesk` y `helpdesk_users`) deben vivir en el MISMO servidor
--      MySQL, porque varios repositorios hacen JOINs cross-database.
--    - La clave relacional con el resto del sistema es `nomina`, NO `users.id`.
--      Puede ser NEGATIVA (becarios / cuentas especiales) -> columnas con signo.
--    - Contrasena de TODOS los usuarios demo: demo1234
-- =============================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `helpdesk_users`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `helpdesk_users`;

-- -----------------------------------------------------------------------------
-- 1) Catalogos referenciados por `users` (idDepartamento / idPuesto).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `departamento` (
  `iddepartamento` INT(11)      NOT NULL AUTO_INCREMENT,
  `descripcion`    VARCHAR(120) NULL DEFAULT NULL,
  PRIMARY KEY (`iddepartamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `puesto` (
  `idPuesto`    INT(11)      NOT NULL AUTO_INCREMENT,
  `descripcion` VARCHAR(120) NULL DEFAULT NULL,
  PRIMARY KEY (`idPuesto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2) Usuarios. Login por `email` + `password` (bcrypt) y `status` = 1.
--    Solo se listan las columnas que este proyecto lee; un directorio real
--    normalmente tiene muchas mas.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`              BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nomina`          INT(11)      NULL DEFAULT NULL,   -- signed: puede ser negativa
  `name`            VARCHAR(120) NULL DEFAULT NULL,
  `apellidopaterno` VARCHAR(120) NULL DEFAULT NULL,
  `apellidomaterno` VARCHAR(120) NULL DEFAULT NULL,
  `usuario`         VARCHAR(60)  NULL DEFAULT NULL,
  `email`           VARCHAR(180) NULL DEFAULT NULL,
  `password`        VARCHAR(255) NULL DEFAULT NULL,   -- hash bcrypt
  `status`          TINYINT(1)   NOT NULL DEFAULT 1,  -- 1 = activo
  `idDepartamento`  INT(11)      NULL DEFAULT NULL,
  `idPuesto`        INT(11)      NULL DEFAULT NULL,
  `remember_token`  VARCHAR(100) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_nomina` (`nomina`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
--  DATOS DEMO (ficticios)
-- =============================================================================

INSERT INTO `departamento` (`iddepartamento`, `descripcion`) VALUES
  (1, 'Sistemas'),
  (2, 'Recursos Humanos'),
  (3, 'Finanzas'),
  (4, 'Ventas'),
  (5, 'Operaciones'),
  (6, 'Compras'),
  (7, 'Almacen'),
  (8, 'Direccion')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`);

INSERT INTO `puesto` (`idPuesto`, `descripcion`) VALUES
  (1, 'Director'),
  (2, 'Gerente'),
  (3, 'Jefe de Area'),
  (4, 'Coordinador'),
  (5, 'Especialista'),
  (6, 'Analista'),
  (7, 'Auxiliar'),
  (8, 'Becario'),
  (9, 'Ejecutivo de Ventas')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`);

-- Contrasena de todos: demo1234
-- (hash bcrypt compartido a proposito; son cuentas de demostracion)
INSERT INTO `users`
  (`nomina`, `name`, `apellidopaterno`, `apellidomaterno`, `usuario`, `email`, `password`, `status`, `idDepartamento`, `idPuesto`)
VALUES
  -- Administradores
  (1001, 'Ana Sofia', 'Ramirez', 'Cortes',  'aramirez',  'admin@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 1, 3),
  (3001, 'Sandra',    'Vargas',  'Islas',   'svargas',   'sandra.vargas@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 1, 2),

  -- Operadores (staff de soporte)
  (1002, 'Luis Fernando', 'Mendoza', 'Rivas', 'lmendoza', 'operador@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 1, 5),
  (1003, 'Mariana',  'Ortiz',   'Salas',   'mortiz',    'mariana.ortiz@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 1, 6),
  (1004, 'Diego',    'Herrera', 'Nava',    'dherrera',  'diego.herrera@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 1, 6),
  (1005, 'Paola',    'Cruz',    'Vega',    'pcruz',     'paola.cruz@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 1, 4),
  -- Nomina NEGATIVA a proposito: el sistema soporta cuentas especiales (becarios).
  (-55, 'Emilio',    'Zapata',  'Guzman',  'ezapata',   'emilio.zapata@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 1, 8),

  -- Usuarios finales (solicitantes)
  (2001, 'Jorge',    'Trevino', 'Lara',    'jtrevino',  'usuario@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 4, 9),
  (2002, 'Claudia',  'Beltran', 'Nunez',   'cbeltran',  'claudia.beltran@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 2, 4),
  (2003, 'Ricardo',  'Solis',   'Pena',    'rsolis',    'ricardo.solis@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 3, 6),
  (2004, 'Fernanda', 'Aguilar', 'Rios',    'faguilar',  'fernanda.aguilar@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 1, 5, 7),
  -- Cuenta inactiva: sirve para probar el bloqueo de login por `status`.
  (2005, 'Hector',   'Lozano',  'Diaz',    'hlozano',   'hector.lozano@example.com',
   '$2y$10$lgbqaBjuZIP.p4hCP/Kd3OH9x87uMQkHkM4IUpTXaHlY7qwFw49oS', 0, 5, 7)
ON DUPLICATE KEY UPDATE
  `name`            = VALUES(`name`),
  `apellidopaterno` = VALUES(`apellidopaterno`),
  `apellidomaterno` = VALUES(`apellidomaterno`),
  `usuario`         = VALUES(`usuario`),
  `email`           = VALUES(`email`),
  `password`        = VALUES(`password`),
  `status`          = VALUES(`status`),
  `idDepartamento`  = VALUES(`idDepartamento`),
  `idPuesto`        = VALUES(`idPuesto`);
-- =============================================================================
