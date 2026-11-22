const { manejarErrores, rutaNoEncontrada } = require('../../src/middlewares/manejarErrores');
const { verificarToken, verificarTokenOpcional, requerirRol, requerirAdmin } = require('../../src/middlewares/auth.middleware');
const publicacionesService = require('../../src/services/publicaciones.service');
const Publicacion = require('../../src/models/publicacion.models');
const Solicitud = require('../../src/models/solicitud.models');
const Favorito = require('../../src/models/favorito.models');
const Usuario = require('../../src/models/usuario.models');
const notificacionesService = require('../../src/services/notificaciones.service');
const { guardarImagenesPublicacion, eliminarImagenesPublicacion } = require('../../src/utils/imagenesPublicacion');
const HttpError = require('../../src/utils/HttpError');
const jwt = require('jsonwebtoken');

jest.mock('../../src/models/publicacion.models');
jest.mock('../../src/models/solicitud.models');
jest.mock('../../src/models/favorito.models');
jest.mock('../../src/models/usuario.models');
jest.mock('../../src/services/notificaciones.service');
jest.mock('../../src/utils/imagenesPublicacion');
jest.mock('jsonwebtoken');

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
 * 1. Cobertura de Caminos de Decisión en Funciones de Dominio (procesarCaducidad, calcularDias, filtros)
 * 2. Cobertura de Sentencias y Ramas en Middlewares de Seguridad y Manejo de Excepciones
 * 3. Inspección del Flujo de Estado Interno, Transiciones y Manejo de Errores Asíncronos
 */

describe('Suite de Pruebas: CAJA BLANCA (White-Box)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. RAMAS Y DECISIONES: Algoritmo de Caducidad y Días Transcurridos
  // --------------------------------------------------------------------------
  describe('Caminos de Decisión: publicaciones.service (procesarCaducidad y ciclo de vida)', () => {
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

    it('[Rama 6: Filtros dinámicos en listar]: evalúa categoría, estado, modalidad y búsqueda q', async () => {
      Publicacion.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { _id: 'p1', title: 'Calculadora Casio', status: 'Disponible', createdAt: new Date() },
        ]),
      });

      const res = await publicacionesService.listar({
        categoria: 'LIBROS',
        estado: 'Disponible',
        modalidad: 'Intercambio',
        q: 'casio',
      });

      expect(Publicacion.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Disponible',
          $or: expect.any(Array),
        })
      );
      expect(res).toHaveLength(1);
    });

    it('[Rama 7: Listar de usuario]: procesa lista de publicaciones asociadas al usuario', async () => {
      Publicacion.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { _id: 'u-1', title: 'Item 1', status: 'Disponible', createdAt: new Date() },
        ]),
      });

      const res = await publicacionesService.listarDeUsuario('usr-456');
      expect(Publicacion.find).toHaveBeenCalledWith({
        usuarioId: 'usr-456',
        status: { $ne: 'Intercambiado' },
      });
      expect(res).toHaveLength(1);
    });

    it('[Rama 8: Crear publicación con imágenes]: gestiona guardado y limpieza en caso de error', async () => {
      guardarImagenesPublicacion.mockResolvedValue([{ url: 'https://img.com/1.jpg' }]);
      Publicacion.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue({ _id: 'new-id', ...data }),
      }));

      const res = await publicacionesService.crear({
        title: 'Nuevo producto',
        images: ['data:image/png;base64,...'],
      });
      expect(guardarImagenesPublicacion).toHaveBeenCalled();
      expect(res).toBeDefined();

      // Camino de fallo al guardar: debe eliminar imágenes subidas
      Publicacion.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Mongo Write Error')),
      }));
      await expect(
        publicacionesService.crear({ title: 'Fallo', images: ['data:image...'] })
      ).rejects.toThrow('Mongo Write Error');
      expect(eliminarImagenesPublicacion).toHaveBeenCalled();
    });

    it('[Rama 9: Transición a Donado y Notificación]: notifica cuando pasa a Donado', async () => {
      const mockPub = {
        _id: 'pub-50',
        id: 'pub-50',
        title: 'Ropa donable',
        status: 'Disponible',
        usuarioId: 'usr-12',
        save: jest.fn().mockResolvedValue({ _id: 'pub-50', status: 'Donado' }),
      };
      Publicacion.findById.mockResolvedValue(mockPub);
      notificacionesService.crearNotificacion = jest.fn().mockResolvedValue({});

      await publicacionesService.actualizar('pub-50', { status: 'Donado' }, { _id: 'usr-12', role: 'user' });

      expect(mockPub.save).toHaveBeenCalled();
      expect(notificacionesService.crearNotificacion).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: 'usr-12',
          type: 'donacion',
        })
      );
    });

    it('[Rama 10: Eliminar publicación]: no autorizado vs autorizado con imágenes y favoritos', async () => {
      Publicacion.findById.mockResolvedValue(null);
      await expect(publicacionesService.eliminar('inexistente', { role: 'admin' })).rejects.toThrow(HttpError);

      const pubConImg = {
        _id: 'pub-60',
        usuarioId: 'usr-60',
        imageUrls: ['https://img.com/a.jpg'],
      };
      Publicacion.findById.mockResolvedValue(pubConImg);
      Publicacion.findByIdAndDelete.mockResolvedValue(pubConImg);
      Favorito.deleteMany.mockResolvedValue({ deletedCount: 1 });
      eliminarImagenesPublicacion.mockResolvedValue();

      // Intruso
      await expect(
        publicacionesService.eliminar('pub-60', { _id: 'usr-otro', role: 'user' })
      ).rejects.toThrow(HttpError);

      // Propietario autorizado
      const eliminada = await publicacionesService.eliminar('pub-60', { _id: 'usr-60', role: 'user' });
      expect(Favorito.deleteMany).toHaveBeenCalledWith({ articuloId: 'pub-60' });
      expect(Publicacion.findByIdAndDelete).toHaveBeenCalledWith('pub-60');
      expect(eliminada).toBeDefined();
    });

    it('[Rama 11: Estadísticas de plataforma]: computa métricas agregadas', async () => {
      Publicacion.countDocuments = jest.fn()
        .mockResolvedValueOnce(10) // articulosDisponibles
        .mockResolvedValueOnce(3)  // intercambiosPublicacion
        .mockResolvedValueOnce(2)  // donacionesPublicacion
        .mockResolvedValueOnce(1); // caducadosPublicacion
      Solicitud.countDocuments = jest.fn()
        .mockResolvedValueOnce(4)  // intercambiosSolicitud
        .mockResolvedValueOnce(5); // donacionesSolicitud

      const stats = await publicacionesService.obtenerEstadisticas();
      expect(stats.articulosDisponibles).toBe(10);
      expect(stats.intercambiosLocales).toBe(4);
      expect(stats.escaladosUnidona).toBe(6);
      expect(stats.residuosEvitadosKg).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. RAMAS Y DECISIONES: Middleware de Autenticación y Autorización (auth.middleware)
  // --------------------------------------------------------------------------
  describe('Caminos de Decisión: auth.middleware (verificarToken y requerirRol)', () => {
    it('[verificarToken]: Rechaza si el header authorization no existe o no tiene formato Bearer', async () => {
      const next1 = jest.fn();
      await verificarToken({ headers: {} }, {}, next1);
      expect(next1).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));

      const next2 = jest.fn();
      await verificarToken({ headers: { authorization: 'Basic 123456' } }, {}, next2);
      expect(next2).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('[verificarToken]: Rechaza si el token expiró (TokenExpiredError)', async () => {
      const next = jest.fn();
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => { throw err; });

      await verificarToken({ headers: { authorization: 'Bearer token-expirado' } }, {}, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringMatching(/sesión ha expirado/i),
        })
      );
    });

    it('[verificarToken]: Rechaza si el token es alterado o inválido', async () => {
      const next = jest.fn();
      jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

      await verificarToken({ headers: { authorization: 'Bearer token-falso' } }, {}, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringMatching(/inválido o alterado/i),
        })
      );
    });

    it('[verificarToken]: Rechaza si el usuario ya no existe en la base de datos', async () => {
      const next = jest.fn();
      jwt.verify.mockReturnValue({ id: 'usr-inexistente' });
      Usuario.findById.mockResolvedValue(null);

      await verificarToken({ headers: { authorization: 'Bearer token-valido' } }, {}, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringMatching(/ya no existe/i),
        })
      );
    });

    it('[verificarToken]: Rechaza con 403 si el usuario está bloqueado o suspendido', async () => {
      jwt.verify.mockReturnValue({ id: 'usr-bloqueado' });
      
      // Caso 1: bloqueado
      Usuario.findById.mockResolvedValue({
        estaBloqueado: () => true,
        suspendido: false,
      });
      const next1 = jest.fn();
      await verificarToken({ headers: { authorization: 'Bearer tk1' } }, {}, next1);
      expect(next1).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));

      // Caso 2: suspendido
      Usuario.findById.mockResolvedValue({
        estaBloqueado: () => false,
        suspendido: true,
      });
      const next2 = jest.fn();
      await verificarToken({ headers: { authorization: 'Bearer tk2' } }, {}, next2);
      expect(next2).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('[verificarToken]: Happy Path inyecta req.usuario y llama a next()', async () => {
      const req = { headers: { authorization: 'Bearer token-correcto' } };
      const mockUsuario = {
        _id: 'usr-100',
        nombre: 'Carlos',
        estaBloqueado: () => false,
        suspendido: false,
      };
      jwt.verify.mockReturnValue({ id: 'usr-100' });
      Usuario.findById.mockResolvedValue(mockUsuario);

      const next = jest.fn();
      await verificarToken(req, {}, next);

      expect(req.usuario).toBe(mockUsuario);
      expect(next).toHaveBeenCalledWith();
    });

    it('[verificarTokenOpcional]: Cubre sin token, token inválido y token activo', async () => {
      const req1 = { headers: {} };
      const next1 = jest.fn();
      await verificarTokenOpcional(req1, {}, next1);
      expect(req1.usuario).toBeNull();
      expect(next1).toHaveBeenCalled();

      // Token que arroja excepción
      const req2 = { headers: { authorization: 'Bearer invalido' } };
      jwt.verify.mockImplementation(() => { throw new Error('Bad token'); });
      const next2 = jest.fn();
      await verificarTokenOpcional(req2, {}, next2);
      expect(req2.usuario).toBeNull();

      // Token válido pero usuario bloqueado
      const req3 = { headers: { authorization: 'Bearer valido' } };
      jwt.verify.mockReturnValue({ id: 'usr-ok' });
      Usuario.findById.mockResolvedValue({
        estaBloqueado: () => true,
        suspendido: false,
      });
      const next3 = jest.fn();
      await verificarTokenOpcional(req3, {}, next3);
      expect(req3.usuario).toBeNull();
    });

    it('[requerirRol]: Evalúa falta de sesión, rol no autorizado y rol normalizado', () => {
      const middleware = requerirRol('admin', 'moderador');

      // Sin usuario autenticado
      const next1 = jest.fn();
      middleware({}, {}, next1);
      expect(next1).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));

      // Rol no permitido
      const next2 = jest.fn();
      middleware({ usuario: { role: 'user' } }, {}, next2);
      expect(next2).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));

      // Rol permitido con alias (Administrador)
      const next3 = jest.fn();
      middleware({ usuario: { role: 'Administrador' } }, {}, next3);
      expect(next3).toHaveBeenCalledWith();
    });

    it('[requerirAdmin]: Falla si no hay usuario o si el rol no es administrador', () => {
      const next1 = jest.fn();
      requerirAdmin({}, {}, next1);
      expect(next1).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));

      const next2 = jest.fn();
      requerirAdmin({ usuario: { role: 'invitado' } }, {}, next2);
      expect(next2).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });

  // --------------------------------------------------------------------------
  // 3. RAMAS Y TIPOS DE ERROR: Middleware manejarErrores
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

    it('[Ruta No Encontrada]: Responde 404 para cualquier endpoint inexistente', () => {
      const req = { method: 'PATCH', originalUrl: '/api/desconocida' };
      const res = crearRes();
      const next = jest.fn();
      rutaNoEncontrada(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringMatching(/Ruta no encontrada/i),
        })
      );
    });
  });
});
