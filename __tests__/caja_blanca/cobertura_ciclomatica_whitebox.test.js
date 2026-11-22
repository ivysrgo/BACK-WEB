const { manejarErrores, rutaNoEncontrada } = require('../../src/middlewares/manejarErrores');
const publicacionesService = require('../../src/services/publicaciones.service');
const Publicacion = require('../../src/models/publicacion.models');
const HttpError = require('../../src/utils/HttpError');

jest.mock('../../src/models/publicacion.models');
jest.mock('../../src/models/favorito.models');
jest.mock('../../src/models/solicitud.models');
jest.mock('../../src/services/notificaciones.service');

/**
 * ============================================================================
 * SUITE DE PRUEBAS: CAJA BLANCA (WHITE-BOX TESTING)
 * ============================================================================
 * Principio:
 * Las pruebas de caja blanca examinan la estructura interna del código fuente,
 * garantizando la cobertura de caminos básicos (Basis Path Testing), decisiones
 * condicionales (Branch/Decision Coverage), bucles y ramas de captura de excepciones.
 *
 * Técnicas aplicadas:
 * 1. Cobertura de Caminos de Decisión en Funciones de Dominio (procesarCaducidad, calcularDias)
 * 2. Cobertura de Sentencias y Ramas en Middlewares de Manejo de Excepciones
 * 3. Inspección del Flujo de Estado Interno y Manejo de Errores Asíncronos
 */

describe('Suite de Pruebas: CAJA BLANCA (White-Box)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. RAMAS Y DECISIONES: Algoritmo de Caducidad y Días Transcurridos
  // --------------------------------------------------------------------------
  describe('Caminos de Decisión: publicaciones.service (procesarCaducidad)', () => {
    it('[Rama 1: Guard]: Si el objeto publicación es nulo o indefinido, retorna de inmediato', async () => {
      Publicacion.findById.mockResolvedValue(null);
      await expect(publicacionesService.obtener('no-existe')).rejects.toThrow(HttpError);
    });

    it('[Rama 2: Decisión totalDias <= 0]: Si expirationDays es 0, cambia Disponible a Caducado y ejecuta save()', async () => {
      const mockSave = jest.fn().mockResolvedValue({});
      const mockItem = {
        _id: 'pub-01',
        title: 'Mesa',
        status: 'Disponible',
        expirationDays: 0,
        createdAt: new Date(),
        save: mockSave,
      };
      Publicacion.findById.mockResolvedValue(mockItem);

      const resultado = await publicacionesService.obtener('pub-01');

      expect(resultado.status).toBe('Caducado');
      expect(mockSave).toHaveBeenCalled();
    });

    it('[Rama 3: Decisión status Reservado]: Si está Reservado y vence el tiempo, cambia a Caducado', async () => {
      const mockSave = jest.fn().mockResolvedValue({});
      const fechaVieja = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // Hace 40 días
      const mockItem = {
        _id: 'pub-02',
        title: 'Chaqueta',
        status: 'Reservado',
        expirationDays: 30,
        createdAt: fechaVieja,
        save: mockSave,
      };
      Publicacion.findById.mockResolvedValue(mockItem);

      const resultado = await publicacionesService.obtener('pub-02');

      expect(resultado.status).toBe('Caducado');
      expect(mockSave).toHaveBeenCalled();
    });

    it('[Rama 4: Condición Negativa]: Si ya está en Donado, NO muta a Caducado aunque hayan pasado 50 días', async () => {
      const mockSave = jest.fn();
      const fechaVieja = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000);
      const mockItem = {
        _id: 'pub-03',
        title: 'Libro Donado',
        status: 'Donado',
        expirationDays: 30,
        createdAt: fechaVieja,
        save: mockSave,
      };
      Publicacion.findById.mockResolvedValue(mockItem);

      const resultado = await publicacionesService.obtener('pub-03');

      expect(resultado.status).toBe('Donado');
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('[Rama 5: Excepción en save()]: Si save() asíncrono falla, la promesa catch absorbe el error sin tumbar el hilo', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const mockSave = jest.fn().mockRejectedValue(new Error('Fallo de conexión a Mongo'));
      const mockItem = {
        _id: 'pub-04',
        title: 'Monitor',
        status: 'Disponible',
        expirationDays: 0,
        createdAt: new Date(),
        save: mockSave,
      };
      Publicacion.findById.mockResolvedValue(mockItem);

      const resultado = await publicacionesService.obtener('pub-04');

      expect(resultado.status).toBe('Caducado');
      expect(mockSave).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // 2. RAMAS Y TIPOS DE ERROR: Middleware manejarErrores
  // --------------------------------------------------------------------------
  describe('Caminos de Excepción: manejarErrores', () => {
    const crearRes = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    it('[Rama HttpError]: Debe mapear el código y mensaje exacto de una instancia HttpError', () => {
      const error = new HttpError(403, 'Acceso prohibido');
      const res = crearRes();

      manejarErrores(error, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Acceso prohibido',
          mensaje: 'Acceso prohibido',
        })
      );
    });

    it('[Rama Mongoose ValidationError]: Debe mapear múltiples errores de validación a un código 400', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          title: { message: 'El título es requerido' },
          category: { message: 'La categoría es inválida' },
        },
      };
      const res = crearRes();

      manejarErrores(error, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'El título es requerido. La categoría es inválida',
          errores: ['El título es requerido', 'La categoría es inválida'],
        })
      );
    });

    it('[Rama Mongoose CastError]: Debe retornar 400 con mensaje de identificador no válido', () => {
      const error = { name: 'CastError', value: '123-invalido' };
      const res = crearRes();

      manejarErrores(error, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Identificador no válido: 123-invalido',
        })
      );
    });

    it('[Rama MongoDB Duplicate (11000)]: Debe retornar 409 con mensaje de valor ya registrado', () => {
      const error = {
        code: 11000,
        keyPattern: { correo: 1 },
      };
      const res = crearRes();

      manejarErrores(error, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "El valor para el campo 'correo' ya se encuentra registrado.",
        })
      );
    });

    it('[Rama SyntaxError JSON]: Debe retornar 400 cuando el parser detecta JSON malformado', () => {
      const error = new SyntaxError('Unexpected token');
      error.status = 400;
      error.body = '{ malformed';
      const res = crearRes();

      manejarErrores(error, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error de sintaxis en el formato JSON enviado.',
        })
      );
    });

    it('[Rama Fallback 500]: Errores no controlados deben ocultar trazas sensibles y responder 500', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Segmentation fault en librería nativa');
      const res = crearRes();

      manejarErrores(error, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error interno del servidor.',
        })
      );
      consoleSpy.mockRestore();
    });
  });
});
