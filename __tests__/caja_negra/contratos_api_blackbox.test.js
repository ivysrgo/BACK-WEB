const {
  validarRegistro,
  validarLogin,
  validarCreacionPublicacion,
  validarCambioPublicacion,
  validarCreacionSolicitud,
  validarCambioSolicitud,
  validarCambioContrasena,
} = require('../../src/middlewares/validarErrores');
const authController = require('../../src/controllers/auth.controller');
const publicacionesController = require('../../src/controllers/publicaciones.controller');
const solicitudesController = require('../../src/controllers/solicitudes.controller');
const authService = require('../../src/services/auth.service');
const publicacionesService = require('../../src/services/publicaciones.service');
const solicitudesService = require('../../src/services/solicitudes.service');
const HttpError = require('../../src/utils/HttpError');

jest.mock('../../src/services/auth.service');
jest.mock('../../src/services/publicaciones.service');
jest.mock('../../src/services/solicitudes.service');

/**
 * ============================================================================
 * SUITE DE PRUEBAS: CAJA NEGRA (BLACK-BOX TESTING)
 * ============================================================================
 * Principio:
 * Las pruebas de caja negra evalúan la funcionalidad del sistema basándose
 * estrictamente en entradas (inputs) y salidas esperadas (outputs/contratos HTTP)
 * según los requisitos funcionales, sin inspeccionar el código fuente interno,
 * la estructura de bases de datos o algoritmos privados.
 *
 * Técnicas aplicadas:
 * 1. Partición de Equivalencia (Equivalence Partitioning)
 * 2. Análisis de Valores Límite (Boundary Value Analysis - BVA)
 * 3. Verificación de Contratos y Códigos de Respuesta HTTP (200, 201, 204, 400, 401, 404, 409)
 */

describe('Suite de Pruebas: CAJA NEGRA (Black-Box)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. ANÁLISIS DE VALORES LÍMITE (BVA) Y PARTITIONING: Registro de Usuarios
  // --------------------------------------------------------------------------
  describe('Técnica BVA & Equivalencia: Registro de Usuarios', () => {
    const crearReq = (body) => ({ body });
    const res = {};
    const next = jest.fn();

    it('[Límite Inferior - 1]: Debe rechazar nombre con 1 caracter (mínimo requerido: 2)', () => {
      const req = crearReq({
        nombre: 'A',
        correo: 'valido@correo.com',
        contrasena: 'Password1!',
      });
      expect(() => validarRegistro(req, res, next)).toThrow('El nombre es obligatorio y debe tener al menos 2 caracteres');
    });

    it('[Límite Inferior Exacto]: Debe aceptar nombre con exactamente 2 caracteres', () => {
      const req = crearReq({
        nombre: 'Al',
        correo: 'valido@correo.com',
        contrasena: 'Password1!',
      });
      validarRegistro(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('[Límite Inferior - 1]: Debe rechazar contraseña con 4 caracteres (mínimo requerido: 5)', () => {
      const req = crearReq({
        nombre: 'Usuario Valido',
        correo: 'valido@correo.com',
        contrasena: 'Pa1!',
      });
      expect(() => validarRegistro(req, res, next)).toThrow(/al menos|como mínimo 5 caracteres/i);
    });

    it('[Clase Inválida]: Debe rechazar correos con formato no estándar (sin @ o dominio)', () => {
      const req = crearReq({
        nombre: 'Usuario Valido',
        correo: 'correo_invalido_sin_arroba.com',
        contrasena: 'Password1!',
      });
      expect(() => validarRegistro(req, res, next)).toThrow('El correo electrónico no es válido');
    });

    it('[Clase Válida]: Debe normalizar y aceptar datos completos y limpios (Happy Path)', () => {
      const req = crearReq({
        nombre: '  Carlos Santana  ',
        correo: '  CARLOS@GMAIL.COM ',
        contrasena: 'Password1!',
      });
      validarRegistro(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.body.nombre).toBe('Carlos Santana');
      expect(req.body.correo).toBe('carlos@gmail.com');
    });
  });

  // --------------------------------------------------------------------------
  // 2. CONTRATOS HTTP: Autenticación (Login, Registro, Perfil, Recuperación)
  // --------------------------------------------------------------------------
  describe('Contratos HTTP: Autenticación', () => {
    const crearMockRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    });

    it('Debe responder 200 OK con token y usuario si las credenciales son correctas', async () => {
      const req = { body: { correo: 'test@unidona.co', contrasena: 'Password1!' } };
      const res = crearMockRes();
      const next = jest.fn();

      authService.login.mockResolvedValue({
        token: 'jwt-token-valido',
        usuario: { id: 'usr-1', nombre: 'Test User' },
      });

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'jwt-token-valido',
          usuario: expect.any(Object),
        })
      );
    });

    it('Debe responder 201 Created al registrar un nuevo usuario en el sistema', async () => {
      const req = {
        body: {
          nombre: 'Nuevo Usuario',
          correo: 'nuevo@unidona.co',
          contrasena: 'Password1!',
        },
      };
      const res = crearMockRes();
      const next = jest.fn();

      authService.registrar.mockResolvedValue({
        token: 'jwt-nuevo',
        usuario: { id: 'usr-2', nombre: 'Nuevo Usuario' },
      });

      await authController.registrar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'jwt-nuevo',
          usuario: expect.any(Object),
        })
      );
    });

    it('Debe responder 200 OK con el perfil del usuario autenticado', async () => {
      const req = { usuario: { id: 'usr-1' } };
      const res = crearMockRes();
      authService.obtenerPerfil.mockResolvedValue({ id: 'usr-1', nombre: 'Carlos' });

      await authController.perfil(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ usuario: { id: 'usr-1', nombre: 'Carlos' } });
    });

    it('Debe responder 200 OK al solicitar recuperación de contraseña con correo', async () => {
      const req = { body: { correo: 'test@unidona.co' } };
      const res = crearMockRes();
      authService.solicitarRecuperacion.mockResolvedValue({ mensaje: 'PIN enviado' });

      await authController.forgotPassword(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'PIN enviado' });
    });

    it('Debe responder 200 OK al verificar código PIN correcto', async () => {
      const req = { body: { correo: 'test@unidona.co', pin: '1234' } };
      const res = crearMockRes();
      authService.verificarCodigo.mockResolvedValue({ mensaje: 'Código verificado' });

      await authController.verifyCode(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Código verificado' });
    });

    it('Debe responder 200 OK al restablecer contraseña', async () => {
      const req = { body: { correo: 'test@unidona.co', pin: '1234', nuevaContrasena: 'Nueva123!' } };
      const res = crearMockRes();
      authService.restablecerContrasena.mockResolvedValue({ mensaje: 'Contraseña restablecida' });

      await authController.resetPassword(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 200 OK al cambiar contraseña de usuario autenticado', async () => {
      const req = { usuario: { id: 'usr-1' }, body: { contrasenaActual: 'Vieja12!', nuevaContrasena: 'Nueva12!' } };
      const res = crearMockRes();
      authService.cambiarContrasena.mockResolvedValue({ mensaje: 'Actualizada' });

      await authController.cambiarContrasena(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 200 OK al actualizar datos de perfil', async () => {
      const req = { usuario: { id: 'usr-1' }, body: { nombre: 'Nombre Nuevo' } };
      const res = crearMockRes();
      authService.actualizarPerfil.mockResolvedValue({ id: 'usr-1', nombre: 'Nombre Nuevo' });

      await authController.actualizarPerfil(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 200 OK al consultar perfil público por id', async () => {
      const req = { params: { id: 'usr-pub-1' } };
      const res = crearMockRes();
      authService.obtenerPerfilPublico.mockResolvedValue({ usuario: { nombre: 'Publico' }, publicaciones: [] });

      await authController.perfilPublico(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // --------------------------------------------------------------------------
  // 3. CONTRATOS HTTP: Publicaciones
  // --------------------------------------------------------------------------
  describe('Contratos HTTP: Publicaciones', () => {
    const crearMockRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    });

    it('Debe responder 200 OK con el listado de publicaciones', async () => {
      const res = crearMockRes();
      publicacionesService.listar.mockResolvedValue([{ id: 'pub-1', title: 'Libro' }]);

      await publicacionesController.listar({ query: {} }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id: 'pub-1', title: 'Libro' }]);
    });

    it('Debe responder 200 OK con mis publicaciones', async () => {
      const res = crearMockRes();
      publicacionesService.listarDeUsuario.mockResolvedValue([{ id: 'pub-2', title: 'Mochila' }]);

      await publicacionesController.listarMisPublicaciones({ usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 200 OK con publicación individual', async () => {
      const res = crearMockRes();
      publicacionesService.obtener.mockResolvedValue({ id: 'pub-1', title: 'Libro' });

      await publicacionesController.obtener({ params: { id: 'pub-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 201 Created al crear publicación', async () => {
      const res = crearMockRes();
      publicacionesService.crear.mockResolvedValue({ id: 'pub-nueva', title: 'Mesa' });

      await publicacionesController.crear({ body: { title: 'Mesa' }, usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('Debe responder 200 OK al actualizar publicación', async () => {
      const res = crearMockRes();
      publicacionesService.actualizar.mockResolvedValue({ id: 'pub-1', title: 'Mesa Grande' });

      await publicacionesController.actualizar({ params: { id: 'pub-1' }, body: {}, usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 204 No Content al eliminar publicación', async () => {
      const res = crearMockRes();
      publicacionesService.eliminar.mockResolvedValue();

      await publicacionesController.eliminar({ params: { id: 'pub-1' }, usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('Debe responder 200 OK con métricas de estadísticas', async () => {
      const res = crearMockRes();
      publicacionesService.obtenerEstadisticas.mockResolvedValue({ articulosDisponibles: 10 });

      await publicacionesController.obtenerEstadisticas({}, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // --------------------------------------------------------------------------
  // 4. CONTRATOS HTTP: Solicitudes
  // --------------------------------------------------------------------------
  describe('Contratos HTTP: Solicitudes', () => {
    const crearMockRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    });

    it('Debe responder 200 OK al listar solicitudes', async () => {
      const res = crearMockRes();
      solicitudesService.listar.mockResolvedValue([{ id: 'sol-1' }]);

      await solicitudesController.listar({ query: {}, usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 200 OK al listar solicitudes del usuario', async () => {
      const res = crearMockRes();
      solicitudesService.listarDeUsuario.mockResolvedValue({ enviadas: [], recibidas: [] });

      await solicitudesController.listarMias({ usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 200 OK al obtener una solicitud específica', async () => {
      const res = crearMockRes();
      solicitudesService.obtener.mockResolvedValue({ id: 'sol-1', title: 'Solicitud' });

      await solicitudesController.obtener({ params: { id: 'sol-1' }, usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 201 Created al crear solicitud', async () => {
      const res = crearMockRes();
      solicitudesService.crear.mockResolvedValue({ id: 'sol-nueva' });

      await solicitudesController.crear({ body: {}, usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('Debe responder 200 OK al actualizar estado de solicitud', async () => {
      const res = crearMockRes();
      solicitudesService.actualizarEstado.mockResolvedValue({ id: 'sol-1', status: 'Aceptado' });

      await solicitudesController.actualizar({ params: { id: 'sol-1' }, body: { status: 'Aceptado' }, usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 200 OK al confirmar intercambio', async () => {
      const res = crearMockRes();
      solicitudesService.confirmarIntercambio.mockResolvedValue({ id: 'sol-1', status: 'Donado' });

      await solicitudesController.confirmarIntercambio({ params: { id: 'sol-1' }, body: { calificacion: 5 }, usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe responder 204 No Content al eliminar solicitud', async () => {
      const res = crearMockRes();
      solicitudesService.eliminar.mockResolvedValue();

      await solicitudesController.eliminar({ params: { id: 'sol-1' }, usuario: { id: 'usr-1' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 5. PARTITIONING & VALORES LÍMITE: Validaciones de Entrada
  // --------------------------------------------------------------------------
  describe('Técnica BVA & Partición: Contratos de Publicación y Solicitudes', () => {
    const next = jest.fn();

    it('[Límite Inferior - 1]: Debe rechazar publicación con título menor a 3 caracteres', () => {
      const req = {
        body: {
          title: 'AB',
          category: 'ROPA',
          modality: 'Donación',
          condition: 'Buen Estado',
          description: 'Descripción válida de prueba',
          autorizaDonacion: true,
          images: ['data:image/png;base64,...'],
        },
      };
      expect(() => validarCreacionPublicacion(req, {}, next)).toThrow(/al menos 3 caracteres/i);
    });

    it('[Partición Inválida]: Debe rechazar solicitud de INTERCAMBIO sin articuloOfrecidoId', () => {
      const req = {
        body: {
          title: 'Solicitud de Libro',
          message: 'Me gustaría intercambiarlo',
          articuloId: 'art-123',
          type: 'INTERCAMBIO',
        },
      };
      expect(() => validarCreacionSolicitud(req, {}, next)).toThrow(/seleccionar un artículo para ofrecer/i);
    });

    it('[Partición Válida]: Debe aceptar solicitud de DONACIÓN sin requerir articuloOfrecidoId', () => {
      const req = {
        body: {
          title: 'Solicitud de Donación',
          message: 'Muchas gracias por la donación',
          articuloId: 'art-123',
          type: 'DONACIÓN',
        },
      };
      validarCreacionSolicitud(req, {}, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.body.type).toBe('DONACIÓN');
    });

    it('[Validación de Cambio]: Valida actualización con alias y campos permitidos', () => {
      const req = {
        body: {
          titulo: 'Título Modificado',
          categoria: 'LIBROS',
          modalidad: 'Donación',
          estadoFisico: 'Buen Estado',
        },
      };
      validarCambioPublicacion(req, {}, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.body.title).toBe('Título Modificado');
      expect(req.body.category).toBe('LIBROS');
    });

    it('[Validación Cambio Solicitud]: Valida estados aceptados de solicitud', () => {
      const req = { body: { status: 'Aceptado' } };
      validarCambioSolicitud(req, {}, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.body.status).toBe('Aceptado');
    });

    it('[Validación Login]: Rechaza si falta correo o contraseña y normaliza en éxito', () => {
      expect(() => validarLogin({ body: {} }, {}, next)).toThrow(/correo y la contraseña son obligatorios/i);
      const req = { body: { correo: ' TEST@MAIL.COM ', contrasena: '12345' } };
      validarLogin(req, {}, next);
      expect(req.body.correo).toBe('test@mail.com');
    });

    it('[Validación Cambio Contraseña]: Valida campos obligatorios, longitud y contraseñas idénticas', () => {
      expect(() => validarCambioContrasena({ body: {} }, {}, next)).toThrow(/ingresar tu contraseña actual/i);
      expect(() => validarCambioContrasena({ body: { contrasenaActual: 'Old123!', nuevaContrasena: '12' } }, {}, next)).toThrow(/mínimo 5 caracteres/i);
      expect(() => validarCambioContrasena({ body: { contrasenaActual: 'Same123!', nuevaContrasena: 'Same123!' } }, {}, next)).toThrow(/debe ser diferente/i);

      const req = { body: { contrasenaActual: 'Old12345!', nuevaContrasena: 'New12345!' } };
      validarCambioContrasena(req, {}, next);
      expect(next).toHaveBeenCalled();
    });

    it('[Validación Creación Publicación]: Rechaza si imágenes no es array', () => {
      const req = { body: { title: 'Valido', images: 'no-es-array' } };
      expect(() => validarCreacionPublicacion(req, {}, next)).toThrow(/deben enviarse como una lista/i);
    });

    it('[Validación Cambio Publicación]: Rechaza cuerpo vacío, estado inválido o sin campos válidos', () => {
      expect(() => validarCambioPublicacion({ body: {} }, {}, next)).toThrow(/No se enviaron datos para actualizar/i);
      expect(() => validarCambioPublicacion({ body: { status: 'Inexistente' } }, {}, next)).toThrow(/El estado debe ser uno de/i);
      expect(() => validarCambioPublicacion({ body: { campoInvalido: 'x' } }, {}, next)).toThrow(/No se enviaron campos válidos/i);
    });

    it('[Validación Solicitud]: Rechaza si falta mensaje o artículo objetivo', () => {
      expect(() => validarCreacionSolicitud({ body: { title: 'Bien', message: 'No' } }, {}, next)).toThrow(/mensaje es obligatorio/i);
      expect(() => validarCreacionSolicitud({ body: { title: 'Bien', message: 'Mensaje valido' } }, {}, next)).toThrow(/indicar el artículo/i);
      expect(() => validarCambioSolicitud({ body: { status: 'EstadoRaro' } }, {}, next)).toThrow(/El estado debe ser uno de/i);
    });
  });

  // --------------------------------------------------------------------------
  // 6. PROPAGACIÓN DE EXCEPCIONES EN CONTROLADORES
  // --------------------------------------------------------------------------
  describe('Propagación de Excepciones y Enrutamiento a Middleware de Errores', () => {
    it('Los controladores de Auth propagan excepciones llamando a next(error)', async () => {
      const mockErr = new Error('Auth failure');
      const next = jest.fn();

      authService.login.mockRejectedValueOnce(mockErr);
      await authController.login({ body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      authService.registrar.mockRejectedValueOnce(mockErr);
      await authController.registrar({ body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      authService.obtenerPerfil.mockRejectedValueOnce(mockErr);
      await authController.perfil({ usuario: { id: '1' } }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      authService.solicitarRecuperacion.mockRejectedValueOnce(mockErr);
      await authController.forgotPassword({ body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      authService.verificarCodigo.mockRejectedValueOnce(mockErr);
      await authController.verifyCode({ body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      authService.restablecerContrasena.mockRejectedValueOnce(mockErr);
      await authController.resetPassword({ body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      authService.cambiarContrasena.mockRejectedValueOnce(mockErr);
      await authController.cambiarContrasena({ usuario: { id: '1' }, body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      authService.actualizarPerfil.mockRejectedValueOnce(mockErr);
      await authController.actualizarPerfil({ usuario: { id: '1' }, body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      authService.obtenerPerfilPublico.mockRejectedValueOnce(mockErr);
      await authController.perfilPublico({ params: { id: '1' } }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);
    });

    it('Los controladores de Publicaciones propagan excepciones llamando a next(error)', async () => {
      const mockErr = new Error('Publicacion failure');
      const next = jest.fn();

      publicacionesService.listar.mockRejectedValueOnce(mockErr);
      await publicacionesController.listar({ query: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      publicacionesService.listarDeUsuario.mockRejectedValueOnce(mockErr);
      await publicacionesController.listarMisPublicaciones({ usuario: { id: '1' } }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      publicacionesService.obtener.mockRejectedValueOnce(mockErr);
      await publicacionesController.obtener({ params: { id: '1' } }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      publicacionesService.crear.mockRejectedValueOnce(mockErr);
      await publicacionesController.crear({ body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      publicacionesService.actualizar.mockRejectedValueOnce(mockErr);
      await publicacionesController.actualizar({ params: { id: '1' }, body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      publicacionesService.eliminar.mockRejectedValueOnce(mockErr);
      await publicacionesController.eliminar({ params: { id: '1' } }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      publicacionesService.obtenerEstadisticas.mockRejectedValueOnce(mockErr);
      await publicacionesController.obtenerEstadisticas({}, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);
    });

    it('Los controladores de Solicitudes propagan excepciones llamando a next(error)', async () => {
      const mockErr = new Error('Solicitud failure');
      const next = jest.fn();

      solicitudesService.listar.mockRejectedValueOnce(mockErr);
      await solicitudesController.listar({ query: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      solicitudesService.listarDeUsuario.mockRejectedValueOnce(mockErr);
      await solicitudesController.listarMias({ usuario: { id: '1' } }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      solicitudesService.obtener.mockRejectedValueOnce(mockErr);
      await solicitudesController.obtener({ params: { id: '1' } }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      solicitudesService.crear.mockRejectedValueOnce(mockErr);
      await solicitudesController.crear({ body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      solicitudesService.actualizarEstado.mockRejectedValueOnce(mockErr);
      await solicitudesController.actualizar({ params: { id: '1' }, body: {} }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      solicitudesService.confirmarIntercambio.mockRejectedValueOnce(mockErr);
      await solicitudesController.confirmarIntercambio({ params: { id: '1' } }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);

      solicitudesService.eliminar.mockRejectedValueOnce(mockErr);
      await solicitudesController.eliminar({ params: { id: '1' }, usuario: { id: '1' } }, {}, next);
      expect(next).toHaveBeenCalledWith(mockErr);
    });
  });
});
