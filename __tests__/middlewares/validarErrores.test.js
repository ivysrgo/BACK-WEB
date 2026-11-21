const {
  validarCreacionPublicacion,
  validarCambioPublicacion,
  validarRegistro,
  validarLogin,
  validarCambioContrasena,
  validarCreacionSolicitud,
  validarCambioSolicitud,
} = require('../../src/middlewares/validarErrores');
const HttpError = require('../../src/utils/HttpError');

describe('Middleware: validarErrores', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { body: {} };
    res = {};
    next = jest.fn();
  });

  describe('validarCreacionPublicacion', () => {
    it('debe normalizar y llamar a next() con datos válidos (happy path)', () => {
      req.body = {
        title: 'Bicicleta de montaña',
        category: 'ROPA',
        modality: 'Donación',
        condition: 'Buen Estado',
        description: 'Bicicleta en buen estado',
        details: 'Rodado 26',
        tags: ['bici', 'deporte'],
      };

      validarCreacionPublicacion(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body.title).toBe('Bicicleta de montaña');
      expect(req.body.category).toBe('ROPA');
      expect(req.body.modality).toBe('Donación');
      expect(req.body.autorizaDonacion).toBe(true);
    });

    it('debe lanzar HttpError(400) si el título falta o es menor a 3 caracteres', () => {
      req.body = { title: 'ab' };
      expect(() => validarCreacionPublicacion(req, res, next)).toThrow(HttpError);
      expect(() => validarCreacionPublicacion(req, res, next)).toThrow(
        'El título es obligatorio y debe tener al menos 3 caracteres'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debe lanzar HttpError(400) si images no es un array', () => {
      req.body = { title: 'Bicicleta', images: 'no-es-array' };
      expect(() => validarCreacionPublicacion(req, res, next)).toThrow(HttpError);
      expect(() => validarCreacionPublicacion(req, res, next)).toThrow(
        'Las imágenes deben enviarse como una lista'
      );
    });
  });

  describe('validarCambioPublicacion', () => {
    it('debe validar y filtrar los campos permitidos en actualización', () => {
      req.body = {
        title: 'Nuevo título válido',
        status: 'Donado',
        talla: 'M',
      };

      validarCambioPublicacion(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body).toEqual({
        title: 'Nuevo título válido',
        status: 'Donado',
        talla: 'M',
      });
    });

    it('debe lanzar HttpError(400) si el body está vacío', () => {
      req.body = {};
      expect(() => validarCambioPublicacion(req, res, next)).toThrow(HttpError);
      expect(() => validarCambioPublicacion(req, res, next)).toThrow(
        'No se enviaron datos para actualizar'
      );
    });

    it('debe lanzar HttpError(400) si el estado no es permitido', () => {
      req.body = { status: 'EstadoInvalido' };
      expect(() => validarCambioPublicacion(req, res, next)).toThrow(HttpError);
      expect(() => validarCambioPublicacion(req, res, next)).toThrow(/El estado debe ser uno de/);
    });
  });

  describe('validarRegistro', () => {
    it('debe pasar y normalizar campos cuando los datos son válidos', () => {
      req.body = {
        nombre: ' Juan Perez ',
        correo: 'JUAN@Example.COM ',
        contrasena: 'Valida123!',
        phone: '123456789',
      };

      validarRegistro(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body.nombre).toBe('Juan Perez');
      expect(req.body.correo).toBe('juan@example.com');
      expect(req.body.phone).toBe('123456789');
    });

    it('debe lanzar HttpError(400) si el nombre tiene menos de 2 caracteres', () => {
      req.body = { nombre: 'J', correo: 'a@b.com', contrasena: 'Valida123!' };
      expect(() => validarRegistro(req, res, next)).toThrow(HttpError);
      expect(() => validarRegistro(req, res, next)).toThrow(/al menos 2 caracteres/);
    });

    it('debe lanzar HttpError(400) si el correo no tiene formato válido', () => {
      req.body = { nombre: 'Juan', correo: 'correo-invalido', contrasena: 'Valida123!' };
      expect(() => validarRegistro(req, res, next)).toThrow(HttpError);
      expect(() => validarRegistro(req, res, next)).toThrow('El correo electrónico no es válido');
    });

    it('debe lanzar HttpError(400) si la contraseña no cumple requisitos de seguridad', () => {
      req.body = { nombre: 'Juan', correo: 'juan@test.com', contrasena: 'simple' };
      expect(() => validarRegistro(req, res, next)).toThrow(HttpError);
    });
  });

  describe('validarLogin', () => {
    it('debe aceptar correo y contraseña válidos', () => {
      req.body = { correo: ' USUARIO@TEST.COM ', contrasena: '123456' };
      validarLogin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body.correo).toBe('usuario@test.com');
    });

    it('debe lanzar HttpError(400) si falta el correo o la contraseña', () => {
      req.body = { correo: 'usuario@test.com' };
      expect(() => validarLogin(req, res, next)).toThrow(HttpError);
      expect(() => validarLogin(req, res, next)).toThrow(
        'El correo y la contraseña son obligatorios'
      );
    });
  });

  describe('validarCambioContrasena', () => {
    it('debe validar cambio cuando la contraseña nueva es segura y diferente', () => {
      req.body = { contrasenaActual: 'Vieja123!', nuevaContrasena: 'Nueva456#' };
      validarCambioContrasena(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar HttpError(400) si falta la contraseña actual', () => {
      req.body = { nuevaContrasena: 'Nueva456#' };
      expect(() => validarCambioContrasena(req, res, next)).toThrow(
        'Debes ingresar tu contraseña actual'
      );
    });

    it('debe lanzar HttpError(400) si la nueva contraseña es igual a la actual', () => {
      req.body = { contrasenaActual: 'Misma123!', nuevaContrasena: 'Misma123!' };
      expect(() => validarCambioContrasena(req, res, next)).toThrow(
        'La nueva contraseña debe ser diferente a la actual'
      );
    });
  });

  describe('validarCreacionSolicitud', () => {
    it('debe validar una solicitud de tipo DONACIÓN con datos válidos', () => {
      req.body = {
        title: 'Solicitud libro',
        message: 'Me gustaría recibir este libro para mis clases',
        type: 'DONACIÓN',
        articuloId: 'art-123',
      };

      validarCreacionSolicitud(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body.type).toBe('DONACIÓN');
    });

    it('debe lanzar HttpError(400) para INTERCAMBIO si falta articuloOfrecidoId', () => {
      req.body = {
        title: 'Intercambio prenda',
        message: 'Quiero cambiar mi chaqueta',
        type: 'INTERCAMBIO',
        articuloId: 'art-123',
      };

      expect(() => validarCreacionSolicitud(req, res, next)).toThrow(
        'Debes seleccionar un artículo para ofrecer en el intercambio'
      );
    });
  });

  describe('validarCambioSolicitud', () => {
    it('debe aceptar estados válidos de solicitud', () => {
      req.body = { status: 'Aceptado' };
      validarCambioSolicitud(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body.status).toBe('Aceptado');
    });

    it('debe lanzar HttpError(400) para estado no permitido', () => {
      req.body = { status: 'Pendiente' };
      expect(() => validarCambioSolicitud(req, res, next)).toThrow(
        /El estado debe ser uno de: Aceptado, Donado, Rechazado, Cancelado/
      );
    });
  });
});
