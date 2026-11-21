const {
  verificarToken,
  verificarTokenOpcional,
  requerirAdmin,
} = require('../../src/middlewares/auth.middleware');
const Usuario = require('../../src/models/usuario.models');
const jwt = require('jsonwebtoken');
const HttpError = require('../../src/utils/HttpError');

jest.mock('../../src/models/usuario.models');
jest.mock('jsonwebtoken');

describe('Middleware: auth.middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('verificarToken', () => {
    it('debe lanzar 401 si no hay header Authorization', async () => {
      await verificarToken(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toMatch(/No se proporcionó un token/);
    });

    it('debe lanzar 401 si el token expiró', async () => {
      req.headers.authorization = 'Bearer token-expirado';
      jwt.verify.mockImplementation(() => {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      });

      await verificarToken(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toMatch(/La sesión ha expirado/);
    });

    it('debe lanzar 401 si el usuario no existe en la base de datos', async () => {
      req.headers.authorization = 'Bearer token-valido';
      jwt.verify.mockReturnValue({ id: 'user-inexistente' });
      Usuario.findById.mockResolvedValue(null);

      await verificarToken(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toMatch(/El usuario asociado a este token ya no existe/);
    });

    it('debe lanzar 403 si la cuenta está bloqueada', async () => {
      req.headers.authorization = 'Bearer token-valido';
      jwt.verify.mockReturnValue({ id: 'user-bloqueado' });
      Usuario.findById.mockResolvedValue({
        estaBloqueado: () => true,
        suspendido: false,
      });

      await verificarToken(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toMatch(/temporalmente bloqueada/);
    });

    it('debe lanzar 403 si la cuenta está suspendida por un admin', async () => {
      req.headers.authorization = 'Bearer token-valido';
      jwt.verify.mockReturnValue({ id: 'user-suspendido' });
      Usuario.findById.mockResolvedValue({
        estaBloqueado: () => false,
        suspendido: true,
      });

      await verificarToken(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toMatch(/suspendida por un administrador/);
    });

    it('debe inyectar req.usuario y llamar a next() con token válido (happy path)', async () => {
      req.headers.authorization = 'Bearer token-valido';
      jwt.verify.mockReturnValue({ id: 'user-123' });
      const mockUsuario = {
        _id: 'user-123',
        nombre: 'Carlos Perez',
        role: 'user',
        estaBloqueado: () => false,
        suspendido: false,
      };
      Usuario.findById.mockResolvedValue(mockUsuario);

      await verificarToken(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.usuario).toEqual(mockUsuario);
    });
  });

  describe('verificarTokenOpcional', () => {
    it('debe asignar req.usuario = null si no hay token y continuar', async () => {
      await verificarTokenOpcional(req, res, next);
      expect(req.usuario).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('debe inyectar req.usuario si el token es válido', async () => {
      req.headers.authorization = 'Bearer token-valido';
      jwt.verify.mockReturnValue({ id: 'user-123' });
      const mockUsuario = {
        _id: 'user-123',
        estaBloqueado: () => false,
        suspendido: false,
      };
      Usuario.findById.mockResolvedValue(mockUsuario);

      await verificarTokenOpcional(req, res, next);
      expect(req.usuario).toEqual(mockUsuario);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requerirAdmin', () => {
    it('debe lanzar 401 si req.usuario no existe', () => {
      requerirAdmin(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toMatch(/Usuario no autenticado/);
    });

    it('debe lanzar 403 si el rol no es administrador', () => {
      req.usuario = { role: 'user' };
      requerirAdmin(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toMatch(/requiere permisos de administrador/);
    });

    it('debe llamar a next() si el rol es admin (happy path)', () => {
      req.usuario = { role: 'admin' };
      requerirAdmin(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('debe llamar a next() si el rol es Administrador (happy path)', () => {
      req.usuario = { role: 'Administrador' };
      requerirAdmin(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
