-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Tipos de ticket + responsable automatico + roles
-- =============================================================================
--  Reemplaza el catalogo de tipos por el catalogo operativo, cada uno con su
--  operador/admin responsable por defecto (asignacion AUTOMATICA al crear el
--  ticket; el admin puede reasignar despues). Tambien asigna los roles.
--
--  Las nominas de aqui son las de los usuarios DEMO de
--  `00_directorio_usuarios_demo.sql`. Ajustalas a tu directorio real.
--  Correr en MySQL sobre la BD del proyecto.
-- =============================================================================

SET NAMES utf8mb4;

USE `helpdesk`;

-- -----------------------------------------------------------------------------
-- 1) Tipos de ticket (con responsable por defecto = asignacion automatica).
--    DELETE pone tickets.tipo_id = NULL en los existentes (FK ON DELETE SET NULL).
-- -----------------------------------------------------------------------------
DELETE FROM `ticket_tipos`;

INSERT INTO `ticket_tipos` (`nombre`, `area`, `operador_responsable_nomina`, `activo`) VALUES
  ('Soporte TI',               'Soporte TI',      1002, 1),  -- Luis Fernando Mendoza
  ('Accesos y cuentas',        'Accesos',         1003, 1),  -- Mariana Ortiz
  ('Correo y ofimatica',       'Ofimatica',        -55, 1),  -- Emilio Zapata (nomina negativa)
  ('ERP',                      'ERP',             1005, 1),  -- Paola Cruz
  ('Impresoras y perifericos', 'Hardware',        1004, 1),  -- Diego Herrera
  ('Red e infraestructura',    'Infraestructura', 3001, 1),  -- Sandra Vargas (admin)
  ('Portal web',               'Desarrollo',      1003, 1),  -- Mariana Ortiz
  ('General',                  'General',         1001, 1)   -- Ana Sofia Ramirez (admin)
ON DUPLICATE KEY UPDATE
  `area` = VALUES(`area`),
  `operador_responsable_nomina` = VALUES(`operador_responsable_nomina`),
  `activo` = VALUES(`activo`);

-- -----------------------------------------------------------------------------
-- 2) Roles (operadores y administradores).
--    Cualquier nomina SIN fila aqui entra con rol efectivo 'usuario'.
-- -----------------------------------------------------------------------------
INSERT INTO `ticket_user_roles` (`user_nomina`, `rol`, `assigned_by`) VALUES
  (1001, 'admin',    1001),  -- Ana Sofia Ramirez  - General
  (3001, 'admin',    1001),  -- Sandra Vargas      - Red e infraestructura
  (1002, 'operador', 1001),  -- Luis Fernando Mendoza - Soporte TI
  (1003, 'operador', 1001),  -- Mariana Ortiz      - Accesos / Portal web
  (1004, 'operador', 1001),  -- Diego Herrera      - Impresoras y perifericos
  (1005, 'operador', 1001),  -- Paola Cruz         - ERP
  ( -55, 'operador', 1001)   -- Emilio Zapata      - Correo y ofimatica
ON DUPLICATE KEY UPDATE `rol` = VALUES(`rol`);
-- =============================================================================
