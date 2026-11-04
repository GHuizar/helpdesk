-- =============================================================================
--  HELPDESK - MESA DE AYUDA - Datos semilla: tickets, chat, timeline y avisos
-- =============================================================================
--  Los scripts 00-10 dejan el esquema y los catalogos listos, pero la aplicacion
--  arranca VACIA: el panel del operador, el monitor y los reportes no tienen nada
--  que mostrar. Este script llena esa parte con tickets FICTICIOS que cubren los
--  seis estados, chat de ida y vuelta, notas internas, timeline, bitacora,
--  notificaciones sin leer y respuestas rapidas.
--
--  REQUISITOS
--    - Correr DESPUES de 00..10 (necesita `ticket_tipos` y las nominas demo).
--    - Las nominas usadas son las de `00_directorio_usuarios_demo.sql`.
--
--  IDEMPOTENTE
--    `ticket_demo_seed` recuerda que filas creo este script. Al re-ejecutarlo,
--    borra EXACTAMENTE esas y vuelve a sembrar; los tickets reales no se tocan.
--
--  FECHAS
--    Se escriben con UTC_TIMESTAMP() porque Laravel corre en UTC
--    (`config/app.php` -> 'timezone' => 'UTC') y el frontend convierte a la hora
--    del centro de Mexico al mostrarlas. Son relativas a "ahora", asi que los
--    contadores de hoy / semana / mes siempre tienen algo que mostrar.
--
--  FOLIO
--    Mismo formato que asigna la aplicacion: 'TK-' + id con 6 digitos
--    (ver TicketService::asignarFolio).
-- =============================================================================

SET NAMES utf8mb4;

USE `helpdesk`;

-- -----------------------------------------------------------------------------
-- 0) Bitacora de la propia semilla (para poder re-sembrar sin duplicar).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_demo_seed` (
  `ticket_id` BIGINT(20) UNSIGNED NOT NULL,
  `folio`     VARCHAR(20) NULL DEFAULT NULL,
  PRIMARY KEY (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Limpia la siembra anterior. ticket_mensajes / ticket_eventos / ticket_archivos
-- caen solos por ON DELETE CASCADE; logs y notificaciones no tienen FK.
DELETE l FROM `ticket_logs` l
  JOIN `ticket_demo_seed` d ON l.`entidad_id` = d.`folio`;
DELETE n FROM `ticket_notificaciones` n
  JOIN `ticket_demo_seed` d ON n.`ticket_id` = d.`ticket_id`;
DELETE t FROM `tickets` t
  JOIN `ticket_demo_seed` d ON t.`id` = d.`ticket_id`;
DELETE FROM `ticket_demo_seed`;

-- Los logs de rol no cuelgan de un ticket; se limpian por su propia llave.
DELETE FROM `ticket_logs`
  WHERE `accion` = 'rol' AND `entidad` = 'usuario' AND `entidad_id` IN ('1002', '1003', '-55');

-- Datos por usuario y respuestas rapidas de las nominas demo (se reescriben).
DELETE FROM `ticket_respuestas_rapidas` WHERE `user_nomina` IN (1001, 1002, 1003, 1004, 1005, 3001, -55);
DELETE FROM `ticket_usuario_datos`      WHERE `nomina`      IN (2001, 2002, 2003, 2004);

-- -----------------------------------------------------------------------------
-- 1) Tipos de ticket (ids reales del catalogo de 10_tipos_y_roles.sql).
-- -----------------------------------------------------------------------------
SET @tipo_ti     = (SELECT `id` FROM `ticket_tipos` WHERE `nombre` = 'Soporte TI');
SET @tipo_acceso = (SELECT `id` FROM `ticket_tipos` WHERE `nombre` = 'Accesos y cuentas');
SET @tipo_correo = (SELECT `id` FROM `ticket_tipos` WHERE `nombre` = 'Correo y ofimatica');
SET @tipo_erp    = (SELECT `id` FROM `ticket_tipos` WHERE `nombre` = 'ERP');
SET @tipo_hw     = (SELECT `id` FROM `ticket_tipos` WHERE `nombre` = 'Impresoras y perifericos');
SET @tipo_red    = (SELECT `id` FROM `ticket_tipos` WHERE `nombre` = 'Red e infraestructura');
SET @tipo_web    = (SELECT `id` FROM `ticket_tipos` WHERE `nombre` = 'Portal web');
SET @tipo_gral   = (SELECT `id` FROM `ticket_tipos` WHERE `nombre` = 'General');

-- =============================================================================
--  TICKET 1 - Sin tomar, recien entrado (usuario@example.com -> Soporte TI)
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`)
VALUES
  (2001, 'Jorge Trevino Lara', 'Ejecutivo de Ventas', 'Ventas', 'usuario@example.com', 0, @tipo_ti,
   'La laptop se apaga sola cuando la desconecto de la corriente. La bateria marca 100% pero dura menos de un minuto.',
   'abierto', 1002, 2001, UTC_TIMESTAMP() - INTERVAL 3 HOUR, UTC_TIMESTAMP() - INTERVAL 3 HOUR);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', 'abierto', 2001, 'Jorge Trevino', 'Ticket registrado por el usuario.', UTC_TIMESTAMP() - INTERVAL 3 HOUR),
  (@t, 'asignacion', NULL, NULL, 'Sistema', 'Asignado automaticamente por tipo a Luis Fernando Mendoza.', UTC_TIMESTAMP() - INTERVAL 3 HOUR);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (2001, 'Jorge Trevino', 'ticket_creado', 'ticket', @f, 'Alta de ticket (Soporte TI).', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 3 HOUR);

-- =============================================================================
--  TICKET 2 - En curso con conversacion (Claudia Beltran -> Accesos y cuentas)
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`)
VALUES
  (2002, 'Claudia Beltran Nunez', 'Coordinador', 'Recursos Humanos', 'claudia.beltran@example.com', 0, @tipo_acceso,
   'Necesito acceso de lectura a la carpeta compartida de Nomina. Entro con mi usuario pero me rebota permiso denegado.',
   'en_curso', 1003, 2002, UTC_TIMESTAMP() - INTERVAL 28 HOUR, UTC_TIMESTAMP() - INTERVAL 2 HOUR);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_mensajes` (`ticket_id`, `autor_nomina`, `autor_nombre`, `es_staff`, `es_interno`, `cuerpo`, `created_at`) VALUES
  (@t, 1003, 'Mariana Ortiz', 1, 0, 'Buen dia Claudia. Ya vi tu solicitud, necesito el visto bueno de tu jefe directo para darte el permiso. ¿Me compartes su nombre?', UTC_TIMESTAMP() - INTERVAL 24 HOUR),
  (@t, 2002, 'Claudia Beltran', 0, 0, 'Claro, es Sandra Vargas. Ya le avise por correo que le va a llegar la autorizacion.', UTC_TIMESTAMP() - INTERVAL 22 HOUR),
  (@t, 1003, 'Mariana Ortiz', 1, 0, 'Perfecto, en cuanto confirme lo aplico. Te aviso por aqui mismo.', UTC_TIMESTAMP() - INTERVAL 2 HOUR);
INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_anterior`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', NULL, 'abierto', 2002, 'Claudia Beltran', 'Ticket registrado por el usuario.', UTC_TIMESTAMP() - INTERVAL 28 HOUR),
  (@t, 'estado', 'abierto', 'en_curso', 1003, 'Mariana Ortiz', 'Tomo el ticket para revisar los permisos.', UTC_TIMESTAMP() - INTERVAL 25 HOUR);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (2002, 'Claudia Beltran', 'ticket_creado', 'ticket', @f, 'Alta de ticket (Accesos y cuentas).', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 28 HOUR),
  (1003, 'Mariana Ortiz',   'estado',        'ticket', @f, 'abierto -> en_curso',                '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 25 HOUR),
  (1003, 'Mariana Ortiz',   'mensaje',       'ticket', @f, 'Respuesta al usuario.',              '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 24 HOUR);
-- Aviso NO leido para la usuaria: el badge de "mensajes nuevos" se ve en su panel.
INSERT INTO `ticket_notificaciones` (`user_nomina`, `ticket_id`, `folio`, `tipo`, `titulo`, `cuerpo`, `leida`, `created_at`) VALUES
  (2002, @t, @f, 'mensaje', CONCAT('Nuevo mensaje en ', @f), 'Mariana Ortiz respondio tu ticket.', 0, UTC_TIMESTAMP() - INTERVAL 2 HOUR);

-- =============================================================================
--  TICKET 3 - En curso con nota interna (Ricardo Solis -> ERP)
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`)
VALUES
  (2003, 'Ricardo Solis Pena', 'Analista', 'Finanzas', 'ricardo.solis@example.com', 0, @tipo_erp,
   'Al timbrar una factura el ERP devuelve "sesion expirada" y pierdo la captura. Me ha pasado tres veces hoy.',
   'en_curso', 1005, 2003, UTC_TIMESTAMP() - INTERVAL 2 DAY, UTC_TIMESTAMP() - INTERVAL 5 HOUR);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_mensajes` (`ticket_id`, `autor_nomina`, `autor_nombre`, `es_staff`, `es_interno`, `cuerpo`, `created_at`) VALUES
  (@t, 1005, 'Paola Cruz', 1, 0, 'Hola Ricardo. ¿Me confirmas si te pasa tambien desde otra computadora? Asi descarto que sea la sesion del navegador.', UTC_TIMESTAMP() - INTERVAL 1 DAY),
  (@t, 2003, 'Ricardo Solis', 0, 0, 'Probe en la maquina de junto y paso lo mismo, asi que no creo que sea mi equipo.', UTC_TIMESTAMP() - INTERVAL 7 HOUR),
  (@t, 1005, 'Paola Cruz', 1, 1, 'Nota interna: el proveedor cambio el tiempo de sesion a 10 min el lunes. Pedir que lo regresen a 60 min.', UTC_TIMESTAMP() - INTERVAL 5 HOUR);
INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_anterior`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', NULL, 'abierto', 2003, 'Ricardo Solis', 'Ticket registrado por el usuario.', UTC_TIMESTAMP() - INTERVAL 2 DAY),
  (@t, 'estado', 'abierto', 'en_curso', 1005, 'Paola Cruz', 'En revision con el proveedor del ERP.', UTC_TIMESTAMP() - INTERVAL 1 DAY - INTERVAL 3 HOUR);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (2003, 'Ricardo Solis', 'ticket_creado', 'ticket', @f, 'Alta de ticket (ERP).',  '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 2 DAY),
  (1005, 'Paola Cruz',    'estado',        'ticket', @f, 'abierto -> en_curso',    '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 1 DAY - INTERVAL 3 HOUR),
  (1005, 'Paola Cruz',    'nota',          'ticket', @f, 'Nota interna agregada.', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 5 HOUR);
INSERT INTO `ticket_notificaciones` (`user_nomina`, `ticket_id`, `folio`, `tipo`, `titulo`, `cuerpo`, `leida`, `created_at`) VALUES
  (1005, @t, @f, 'mensaje', CONCAT('Nuevo mensaje en ', @f), 'Ricardo Solis respondio.', 0, UTC_TIMESTAMP() - INTERVAL 7 HOUR);

-- =============================================================================
--  TICKET 4 - Por validar (Fernanda Aguilar -> Impresoras y perifericos)
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`, `finalizado_at`)
VALUES
  (2004, 'Fernanda Aguilar Rios', 'Auxiliar', 'Operaciones', 'fernanda.aguilar@example.com', 0, @tipo_hw,
   'La impresora del area de embarques imprime rayada. Ya le cambiamos el toner y sigue igual.',
   'finalizado', 1004, 2004, UTC_TIMESTAMP() - INTERVAL 3 DAY, UTC_TIMESTAMP() - INTERVAL 6 HOUR, UTC_TIMESTAMP() - INTERVAL 6 HOUR);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_mensajes` (`ticket_id`, `autor_nomina`, `autor_nombre`, `es_staff`, `es_interno`, `cuerpo`, `created_at`) VALUES
  (@t, 1004, 'Diego Herrera', 1, 0, 'Fui a revisarla: el tambor ya estaba al final de su vida. Lo cambiamos y quedo imprimiendo limpio.', UTC_TIMESTAMP() - INTERVAL 7 HOUR),
  (@t, 1004, 'Diego Herrera', 1, 0, 'Lo dejo como resuelto. Si vuelve a salir rayado, reabre el ticket y lo vemos.', UTC_TIMESTAMP() - INTERVAL 6 HOUR);
INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_anterior`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', NULL, 'abierto', 2004, 'Fernanda Aguilar', 'Ticket registrado por la usuaria.', UTC_TIMESTAMP() - INTERVAL 3 DAY),
  (@t, 'estado', 'abierto', 'en_curso', 1004, 'Diego Herrera', 'Visita programada a embarques.', UTC_TIMESTAMP() - INTERVAL 2 DAY),
  (@t, 'estado', 'en_curso', 'finalizado', 1004, 'Diego Herrera', 'Se reemplazo el tambor de la impresora.', UTC_TIMESTAMP() - INTERVAL 6 HOUR);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (2004, 'Fernanda Aguilar', 'ticket_creado', 'ticket', @f, 'Alta de ticket (Impresoras y perifericos).', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 3 DAY),
  (1004, 'Diego Herrera',    'estado',        'ticket', @f, 'en_curso -> finalizado',                     '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 6 HOUR);
INSERT INTO `ticket_notificaciones` (`user_nomina`, `ticket_id`, `folio`, `tipo`, `titulo`, `cuerpo`, `leida`, `created_at`) VALUES
  (2004, @t, @f, 'validar', CONCAT('Valida el cierre de ', @f), 'Diego Herrera marco tu ticket como resuelto.', 0, UTC_TIMESTAMP() - INTERVAL 6 HOUR);

-- =============================================================================
--  TICKET 5 - Finalizado esta semana (Jorge Trevino -> Correo y ofimatica)
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`, `finalizado_at`, `validado_at`)
VALUES
  (2001, 'Jorge Trevino Lara', 'Ejecutivo de Ventas', 'Ventas', 'usuario@example.com', 0, @tipo_correo,
   'No puedo adjuntar archivos de mas de 5 MB en el correo. Me marca error de tamano aunque el limite deberia ser 20 MB.',
   'validado', -55, 2001, UTC_TIMESTAMP() - INTERVAL 6 DAY, UTC_TIMESTAMP() - INTERVAL 4 DAY,
   UTC_TIMESTAMP() - INTERVAL 5 DAY, UTC_TIMESTAMP() - INTERVAL 4 DAY);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_mensajes` (`ticket_id`, `autor_nomina`, `autor_nombre`, `es_staff`, `es_interno`, `cuerpo`, `created_at`) VALUES
  (@t, -55, 'Emilio Zapata', 1, 0, 'Tu buzon tenia una politica vieja de 5 MB. Ya te aplique la del grupo de Ventas (20 MB). Cierra sesion y vuelve a entrar.', UTC_TIMESTAMP() - INTERVAL 5 DAY - INTERVAL 2 HOUR),
  (@t, 2001, 'Jorge Trevino', 0, 0, 'Listo, ya me dejo mandar un PDF de 12 MB. Gracias.', UTC_TIMESTAMP() - INTERVAL 4 DAY - INTERVAL 1 HOUR);
INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_anterior`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', NULL, 'abierto',    2001, 'Jorge Trevino',  'Ticket registrado por el usuario.',       UTC_TIMESTAMP() - INTERVAL 6 DAY),
  (@t, 'estado', 'abierto', 'en_curso',   -55, 'Emilio Zapata', 'Revision de politicas del buzon.',     UTC_TIMESTAMP() - INTERVAL 5 DAY - INTERVAL 5 HOUR),
  (@t, 'estado', 'en_curso', 'finalizado', -55, 'Emilio Zapata', 'Politica de adjuntos corregida.',     UTC_TIMESTAMP() - INTERVAL 5 DAY),
  (@t, 'estado', 'finalizado', 'validado', 2001, 'Jorge Trevino', 'El usuario confirmo la solucion.',   UTC_TIMESTAMP() - INTERVAL 4 DAY);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (2001, 'Jorge Trevino', 'ticket_creado', 'ticket', @f, 'Alta de ticket (Correo y ofimatica).', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 6 DAY),
  ( -55, 'Emilio Zapata', 'estado',        'ticket', @f, 'en_curso -> finalizado',               '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 5 DAY),
  (2001, 'Jorge Trevino', 'estado',        'ticket', @f, 'finalizado -> validado',               '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 4 DAY);
INSERT INTO `ticket_notificaciones` (`user_nomina`, `ticket_id`, `folio`, `tipo`, `titulo`, `cuerpo`, `leida`, `created_at`) VALUES
  ( -55, @t, @f, 'mensaje', CONCAT('Nuevo mensaje en ', @f), 'Jorge Trevino confirmo la solucion.', 1, UTC_TIMESTAMP() - INTERVAL 4 DAY - INTERVAL 1 HOUR);

-- =============================================================================
--  TICKET 6 - Invitado sin cuenta, recien entrado (-> General)
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`)
VALUES
  (NULL, 'Veronica Palacios', NULL, 'Proveedor externo', 'veronica.palacios@example.com', 1, @tipo_gral,
   'Vengo a entregar material y el acceso del porton no reconoce mi gafete de visitante.',
   'abierto', 1001, NULL, UTC_TIMESTAMP() - INTERVAL 40 MINUTE, UTC_TIMESTAMP() - INTERVAL 40 MINUTE);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', 'abierto', NULL, 'Veronica Palacios (invitado)', 'Alta desde el portal publico.', UTC_TIMESTAMP() - INTERVAL 40 MINUTE);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (NULL, 'Veronica Palacios (invitado)', 'ticket_creado', 'ticket', @f, 'Alta publica sin cuenta.', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 40 MINUTE);

-- =============================================================================
--  TICKET 7 - Invitado en curso, con mensaje sin leer para el operador demo
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`)
VALUES
  (NULL, 'Martin Ocampo', NULL, 'Proveedor externo', 'martin.ocampo@example.com', 1, @tipo_ti,
   'Soy proveedor y no puedo entrar al portal para subir mis facturas. Me dice usuario no encontrado.',
   'en_curso', 1002, NULL, UTC_TIMESTAMP() - INTERVAL 1 DAY - INTERVAL 2 HOUR, UTC_TIMESTAMP() - INTERVAL 90 MINUTE);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_mensajes` (`ticket_id`, `autor_nomina`, `autor_nombre`, `es_staff`, `es_interno`, `cuerpo`, `created_at`) VALUES
  (@t, 1002, 'Luis Fernando Mendoza', 1, 0, 'Buen dia. ¿Me confirma el RFC con el que lo dieron de alta? Con eso lo busco en el portal.', UTC_TIMESTAMP() - INTERVAL 20 HOUR),
  (@t, NULL, 'Martin Ocampo', 0, 0, 'Es OCAM850312H4A. Lo di de alta con el area de compras hace dos semanas.', UTC_TIMESTAMP() - INTERVAL 90 MINUTE);
INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_anterior`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', NULL, 'abierto', NULL, 'Martin Ocampo (invitado)', 'Alta desde el portal publico.', UTC_TIMESTAMP() - INTERVAL 1 DAY - INTERVAL 2 HOUR),
  (@t, 'estado', 'abierto', 'en_curso', 1002, 'Luis Fernando Mendoza', 'Tomo el ticket.', UTC_TIMESTAMP() - INTERVAL 21 HOUR);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (NULL, 'Martin Ocampo (invitado)',   'ticket_creado', 'ticket', @f, 'Alta publica sin cuenta.', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 1 DAY - INTERVAL 2 HOUR),
  (1002, 'Luis Fernando Mendoza',      'estado',        'ticket', @f, 'abierto -> en_curso',      '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 21 HOUR);
-- Sin leer para 1002 (operador@example.com): su bandeja muestra el badge de mensajes nuevos.
INSERT INTO `ticket_notificaciones` (`user_nomina`, `ticket_id`, `folio`, `tipo`, `titulo`, `cuerpo`, `leida`, `created_at`) VALUES
  (1002, @t, @f, 'mensaje', CONCAT('Nuevo mensaje en ', @f), 'Martin Ocampo respondio con su RFC.', 0, UTC_TIMESTAMP() - INTERVAL 90 MINUTE);

-- =============================================================================
--  TICKET 8 - Pausado (Claudia Beltran -> Red e infraestructura)
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`)
VALUES
  (2002, 'Claudia Beltran Nunez', 'Coordinador', 'Recursos Humanos', 'claudia.beltran@example.com', 0, @tipo_red,
   'El wifi de la sala de juntas del segundo piso se cae cada que entra mucha gente a sesion.',
   'pausado', 3001, 2002, UTC_TIMESTAMP() - INTERVAL 9 DAY, UTC_TIMESTAMP() - INTERVAL 6 DAY);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_mensajes` (`ticket_id`, `autor_nomina`, `autor_nombre`, `es_staff`, `es_interno`, `cuerpo`, `created_at`) VALUES
  (@t, 3001, 'Sandra Vargas', 1, 0, 'Confirmado: el punto de acceso de esa sala satura a partir de 12 equipos. Ya pedimos uno nuevo a compras.', UTC_TIMESTAMP() - INTERVAL 7 DAY),
  (@t, 3001, 'Sandra Vargas', 1, 1, 'Nota interna: requisicion REQ-4471 en compras, promesa de entrega en dos semanas.', UTC_TIMESTAMP() - INTERVAL 6 DAY);
INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_anterior`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', NULL, 'abierto', 2002, 'Claudia Beltran', 'Ticket registrado por la usuaria.', UTC_TIMESTAMP() - INTERVAL 9 DAY),
  (@t, 'estado', 'abierto', 'en_curso', 3001, 'Sandra Vargas', 'Medicion de cobertura en sitio.', UTC_TIMESTAMP() - INTERVAL 8 DAY),
  (@t, 'estado', 'en_curso', 'pausado', 3001, 'Sandra Vargas', 'En espera del equipo solicitado a compras (REQ-4471).', UTC_TIMESTAMP() - INTERVAL 6 DAY);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (2002, 'Claudia Beltran', 'ticket_creado', 'ticket', @f, 'Alta de ticket (Red e infraestructura).', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 9 DAY),
  (3001, 'Sandra Vargas',   'estado',        'ticket', @f, 'en_curso -> pausado',                     '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 6 DAY);

-- =============================================================================
--  TICKET 9 - Cancelado (Ricardo Solis -> Portal web)
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`)
VALUES
  (2003, 'Ricardo Solis Pena', 'Analista', 'Finanzas', 'ricardo.solis@example.com', 0, @tipo_web,
   'Pido que el portal muestre el tipo de cambio del dia en la portada.',
   'cancelado', 1003, 2003, UTC_TIMESTAMP() - INTERVAL 12 DAY, UTC_TIMESTAMP() - INTERVAL 10 DAY);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_anterior`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', NULL, 'abierto', 2003, 'Ricardo Solis', 'Ticket registrado por el usuario.', UTC_TIMESTAMP() - INTERVAL 12 DAY),
  (@t, 'estado', 'abierto', 'cancelado', 1003, 'Mariana Ortiz', 'No es una incidencia: se canaliza como requerimiento al plan del portal.', UTC_TIMESTAMP() - INTERVAL 10 DAY);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (2003, 'Ricardo Solis', 'ticket_creado', 'ticket', @f, 'Alta de ticket (Portal web).', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 12 DAY),
  (1003, 'Mariana Ortiz', 'estado',        'ticket', @f, 'abierto -> cancelado',         '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 10 DAY);
INSERT INTO `ticket_notificaciones` (`user_nomina`, `ticket_id`, `folio`, `tipo`, `titulo`, `cuerpo`, `leida`, `created_at`) VALUES
  (2003, @t, @f, 'cancelado', CONCAT('Se cancelo ', @f), 'Mariana Ortiz canalizo tu solicitud como requerimiento.', 1, UTC_TIMESTAMP() - INTERVAL 10 DAY);

-- =============================================================================
--  TICKET 10 - Resuelto HOY por el operador demo (cuenta en "Resueltos hoy")
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`, `finalizado_at`, `validado_at`)
VALUES
  (2004, 'Fernanda Aguilar Rios', 'Auxiliar', 'Operaciones', 'fernanda.aguilar@example.com', 0, @tipo_ti,
   'No me aparece la unidad de red O: desde que reinicio la computadora en la manana.',
   'validado', 1002, 2004, UTC_TIMESTAMP() - INTERVAL 7 HOUR, UTC_TIMESTAMP() - INTERVAL 1 HOUR,
   UTC_TIMESTAMP() - INTERVAL 3 HOUR, UTC_TIMESTAMP() - INTERVAL 1 HOUR);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_mensajes` (`ticket_id`, `autor_nomina`, `autor_nombre`, `es_staff`, `es_interno`, `cuerpo`, `created_at`) VALUES
  (@t, 1002, 'Luis Fernando Mendoza', 1, 0, 'Me conecte por acceso remoto y volvi a mapear la unidad, ahora queda fija al iniciar sesion.', UTC_TIMESTAMP() - INTERVAL 3 HOUR),
  (@t, 2004, 'Fernanda Aguilar', 0, 0, 'Ya la veo. Muchas gracias por la rapidez.', UTC_TIMESTAMP() - INTERVAL 1 HOUR);
INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_anterior`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', NULL, 'abierto',      2004, 'Fernanda Aguilar',      'Ticket registrado por la usuaria.',   UTC_TIMESTAMP() - INTERVAL 7 HOUR),
  (@t, 'estado', 'abierto', 'en_curso', 1002, 'Luis Fernando Mendoza', 'Sesion de acceso remoto.',            UTC_TIMESTAMP() - INTERVAL 5 HOUR),
  (@t, 'estado', 'en_curso', 'finalizado', 1002, 'Luis Fernando Mendoza', 'Unidad de red remapeada.',         UTC_TIMESTAMP() - INTERVAL 3 HOUR),
  (@t, 'estado', 'finalizado', 'validado', 2004, 'Fernanda Aguilar',   'La usuaria confirmo la solucion.',    UTC_TIMESTAMP() - INTERVAL 1 HOUR);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (2004, 'Fernanda Aguilar',      'ticket_creado', 'ticket', @f, 'Alta de ticket (Soporte TI).', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 7 HOUR),
  (1002, 'Luis Fernando Mendoza', 'estado',        'ticket', @f, 'en_curso -> finalizado',       '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 3 HOUR),
  (2004, 'Fernanda Aguilar',      'estado',        'ticket', @f, 'finalizado -> validado',       '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 1 HOUR);

-- =============================================================================
--  TICKET 11 - El pendiente mas antiguo del operador demo (sin tomar, 21 dias)
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`)
VALUES
  (2001, 'Jorge Trevino Lara', 'Ejecutivo de Ventas', 'Ventas', 'usuario@example.com', 0, @tipo_ti,
   'Solicito una segunda pantalla para el escritorio de ventas; trabajo con el CRM y el correo al mismo tiempo.',
   'abierto', 1002, 2001, UTC_TIMESTAMP() - INTERVAL 21 DAY, UTC_TIMESTAMP() - INTERVAL 21 DAY);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', 'abierto', 2001, 'Jorge Trevino', 'Ticket registrado por el usuario.', UTC_TIMESTAMP() - INTERVAL 21 DAY);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (2001, 'Jorge Trevino', 'ticket_creado', 'ticket', @f, 'Alta de ticket (Soporte TI).', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 21 DAY);

-- =============================================================================
--  TICKET 12 - Por validar del operador demo + alta MANUAL hecha por el operador
-- =============================================================================
INSERT INTO `tickets`
  (`nomina`, `nombre`, `puesto`, `departamento`, `correo`, `es_invitado`, `tipo_id`,
   `problema`, `estado`, `responsable_nomina`, `creado_por_nomina`, `created_at`, `updated_at`, `finalizado_at`)
VALUES
  (2002, 'Claudia Beltran Nunez', 'Coordinador', 'Recursos Humanos', 'claudia.beltran@example.com', 0, @tipo_ti,
   'Reporte telefonico: el lector de huella del reloj checador no toma las huellas del turno de la tarde.',
   'finalizado', 1002, 1002, UTC_TIMESTAMP() - INTERVAL 4 DAY, UTC_TIMESTAMP() - INTERVAL 20 HOUR, UTC_TIMESTAMP() - INTERVAL 20 HOUR);
SET @t = LAST_INSERT_ID();
SET @f = CONCAT('TK-', LPAD(@t, 6, '0'));
UPDATE `tickets` SET `folio` = @f, `updated_at` = `updated_at` WHERE `id` = @t;
INSERT INTO `ticket_demo_seed` (`ticket_id`, `folio`) VALUES (@t, @f);

INSERT INTO `ticket_mensajes` (`ticket_id`, `autor_nomina`, `autor_nombre`, `es_staff`, `es_interno`, `cuerpo`, `created_at`) VALUES
  (@t, 1002, 'Luis Fernando Mendoza', 1, 0, 'Limpiamos el sensor y actualizamos el firmware del reloj. Ya registra las huellas del turno de la tarde.', UTC_TIMESTAMP() - INTERVAL 20 HOUR),
  (@t, 2002, 'Claudia Beltran', 0, 0, 'Lo vemos manana con el turno completo y te confirmo.', UTC_TIMESTAMP() - INTERVAL 18 HOUR);
INSERT INTO `ticket_eventos` (`ticket_id`, `tipo`, `estado_anterior`, `estado_nuevo`, `actor_nomina`, `actor_nombre`, `descripcion`, `created_at`) VALUES
  (@t, 'creado', NULL, 'abierto', 1002, 'Luis Fernando Mendoza', 'Alta manual: reporte recibido por telefono.', UTC_TIMESTAMP() - INTERVAL 4 DAY),
  (@t, 'estado', 'abierto', 'en_curso', 1002, 'Luis Fernando Mendoza', 'Revision del reloj checador en sitio.', UTC_TIMESTAMP() - INTERVAL 3 DAY),
  (@t, 'estado', 'en_curso', 'finalizado', 1002, 'Luis Fernando Mendoza', 'Sensor limpiado y firmware actualizado.', UTC_TIMESTAMP() - INTERVAL 20 HOUR);
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (1002, 'Luis Fernando Mendoza', 'ticket_creado', 'ticket', @f, 'Alta manual a nombre de Claudia Beltran.', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 4 DAY),
  (1002, 'Luis Fernando Mendoza', 'estado',        'ticket', @f, 'en_curso -> finalizado',                   '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 20 HOUR);
INSERT INTO `ticket_notificaciones` (`user_nomina`, `ticket_id`, `folio`, `tipo`, `titulo`, `cuerpo`, `leida`, `created_at`) VALUES
  (2002, @t, @f, 'validar', CONCAT('Valida el cierre de ', @f), 'Luis Fernando Mendoza marco tu ticket como resuelto.', 0, UTC_TIMESTAMP() - INTERVAL 20 HOUR),
  (1002, @t, @f, 'mensaje', CONCAT('Nuevo mensaje en ', @f),    'Claudia Beltran respondio.',                           0, UTC_TIMESTAMP() - INTERVAL 18 HOUR);

-- =============================================================================
--  EXTRAS: bitacora de roles, datos por usuario y respuestas rapidas del staff
-- =============================================================================
INSERT INTO `ticket_logs` (`actor_nomina`, `actor_nombre`, `accion`, `entidad`, `entidad_id`, `detalle`, `ip`, `created_at`) VALUES
  (1001, 'Ana Sofia Ramirez', 'rol', 'usuario', '1002', 'Rol asignado: operador.', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 30 DAY),
  (1001, 'Ana Sofia Ramirez', 'rol', 'usuario', '1003', 'Rol asignado: operador.', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 30 DAY),
  (1001, 'Ana Sofia Ramirez', 'rol', 'usuario', '-55',  'Rol asignado: operador.', '127.0.0.1', UTC_TIMESTAMP() - INTERVAL 15 DAY);

-- ID de RustDesk (acceso remoto) de algunos solicitantes.
INSERT INTO `ticket_usuario_datos` (`nomina`, `rustdesk`) VALUES
  (2001, 1472583690),
  (2002, 1938475610),
  (2004, 1029384756);

-- Respuestas rapidas privadas de cada operador/admin.
INSERT INTO `ticket_respuestas_rapidas` (`user_nomina`, `titulo`, `texto`, `orden`, `created_at`, `updated_at`) VALUES
  (1002, 'Saludo',        'Buen dia, ya estoy revisando tu reporte. En cuanto tenga avance te escribo por aqui.', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  (1002, 'Acceso remoto', 'Para revisarlo necesito entrar por acceso remoto. ¿Me compartes tu ID de RustDesk y me confirmas cuando puedas dejar el equipo libre?', 2, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  (1002, 'Cierre',        'Lo dejo como resuelto. Si el problema se repite, reabre el ticket y lo retomamos sin perder el historial.', 3, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  (1003, 'Autorizacion',  'Para darte este acceso necesito el visto bueno de tu jefe directo. ¿Me compartes su nombre para solicitarlo?', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  (1003, 'Credenciales',  'Ya quedo el acceso. Entra una vez con la contrasena temporal y el sistema te va a pedir que la cambies.', 2, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  (1004, 'Visita',        'Voy a pasar a revisarlo en sitio hoy mismo. ¿En que horario te queda mejor?', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  (1005, 'Proveedor',     'Ya escale el caso con el proveedor del ERP. En cuanto me den respuesta te la comparto por aqui.', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  (1001, 'Seguimiento',   'Seguimos con el caso. Lo dejo en pausa hasta tener el equipo solicitado y te aviso en cuanto llegue.', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP());

-- =============================================================================
--  Resumen de lo sembrado.
-- =============================================================================
SELECT
  (SELECT COUNT(*) FROM `ticket_demo_seed`)                                          AS tickets_demo,
  (SELECT COUNT(*) FROM `ticket_mensajes` m JOIN `ticket_demo_seed` d ON d.ticket_id = m.ticket_id) AS mensajes,
  (SELECT COUNT(*) FROM `ticket_eventos`  e JOIN `ticket_demo_seed` d ON d.ticket_id = e.ticket_id) AS eventos,
  (SELECT COUNT(*) FROM `ticket_notificaciones` n JOIN `ticket_demo_seed` d ON d.ticket_id = n.ticket_id AND n.leida = 0) AS avisos_sin_leer;
-- =============================================================================
