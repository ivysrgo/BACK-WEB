const {
  validarRegistro,
  validarLogin,
  validarCreacionPublicacion,
  validarCreacionSolicitud,
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
 * 3. Verificación de Contratos y Códigos de Respuesta HTTP (200, 201, 400, 401, 404, 409)
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
  // 2. CONTRATOS HTTP: Autenticación y Códigos de Respuesta
  // --------------------------------------------------------------------------
  describe('Contratos HTTP: Autenticación (Login & Registro)', () => {
    it('Debe responder 200 OK con token y usuario si las credenciales son correctas', async () => {
      const req = { body: { correo: 'test@unidona.co', password: 'Password1!' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
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
          password: 'Password1!',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
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

    it('Debe propagar error 409 Conflict si el correo ya está registrado', async () => {
      const req = { body: { correo: 'duplicado@unidona.co' } };
      const res = {};
      const next = jest.fn();

      authService.registrar.mockRejectedValue(new HttpError(409, 'El correo ya está registrado'));

      await authController.registrar(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'El correo ya está registrado',
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. PARTITIONING & VALORES LÍMITE: Publicaciones y Solicitudes
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
  });
});
