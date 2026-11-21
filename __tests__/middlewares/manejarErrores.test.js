const {
  rutaNoEncontrada,
  manejarErrores,
} = require('../../src/middlewares/manejarErrores');
const HttpError = require('../../src/utils/HttpError');

describe('Middleware: manejarErrores', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    // Suprimir logs de error de consola esperados durante pruebas
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('rutaNoEncontrada', () => {
    it('debe pasar un HttpError 404 a next()', () => {
      rutaNoEncontrada(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(HttpError);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Ruta no encontrada');
    });
  });

  describe('manejarErrores', () => {
    it('debe manejar HttpError con su código de estado correspondiente', () => {
      const error = new HttpError(403, 'Acceso prohibido');
      manejarErrores(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Acceso prohibido',
        mensaje: 'Acceso prohibido',
      });
    });

    it('debe manejar ValidationError de Mongoose con código 400', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          campo1: { message: 'El campo1 es requerido' },
          campo2: { message: 'El campo2 es inválido' },
        },
      };

      manejarErrores(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'El campo1 es requerido. El campo2 es inválido',
        mensaje: 'El campo1 es requerido. El campo2 es inválido',
        errores: ['El campo1 es requerido', 'El campo2 es inválido'],
      });
    });

    it('debe manejar CastError de Mongoose (ID inválido) con código 400', () => {
      const error = {
        name: 'CastError',
        value: 'id-malformado',
      };

      manejarErrores(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Identificador no válido: id-malformado',
        mensaje: 'Identificador no válido: id-malformado',
      });
    });

    it('debe manejar error de duplicado de MongoDB (code 11000) con código 409', () => {
      const error = {
        code: 11000,
        keyPattern: { correo: 1 },
      };

      manejarErrores(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "El valor para el campo 'correo' ya se encuentra registrado.",
        mensaje: "El valor para el campo 'correo' ya se encuentra registrado.",
      });
    });

    it('debe manejar error de sintaxis JSON con código 400', () => {
      const error = new SyntaxError('Unexpected token');
      error.status = 400;
      error.body = '{ malformed';

      manejarErrores(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error de sintaxis en el formato JSON enviado.',
        mensaje: 'Error de sintaxis en el formato JSON enviado.',
      });
    });

    it('debe responder 500 para errores internos desconocidos', () => {
      const error = new Error('Falla catastrófica desconocida');

      manejarErrores(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error interno del servidor.',
        mensaje: 'Error interno del servidor.',
      });
    });
  });
});
