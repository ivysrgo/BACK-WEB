const controller = require('../../src/controllers/auth.controller');
const servicio = require('../../src/services/auth.service');

jest.mock('../../src/services/auth.service');

describe('Controlador: auth.controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      usuario: { id: 'user-1' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe responder 200 con el token y datos de usuario (happy path)', async () => {
      req.body = { correo: 'test@test.com', contrasena: '123456' };
      const respuestaServicio = { token: 'jwt-123', usuario: { id: 'user-1', nombre: 'Test' } };
      servicio.login.mockResolvedValue(respuestaServicio);

      await controller.login(req, res, next);

      expect(servicio.login).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(respuestaServicio);
      expect(next).not.toHaveBeenCalled();
    });

    it('debe enviar error a next() si falla la autenticación', async () => {
      const err = new Error('Credenciales incorrectas');
      servicio.login.mockRejectedValue(err);

      await controller.login(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('registrar', () => {
    it('debe responder 201 al crear un nuevo usuario (happy path)', async () => {
      req.body = { nombre: 'Nuevo', correo: 'nuevo@test.com', contrasena: '123' };
      const resultado = { token: 'jwt-nuevo', usuario: { id: 'user-2' } };
      servicio.registrar.mockResolvedValue(resultado);

      await controller.registrar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(resultado);
    });
  });

  describe('perfil', () => {
    it('debe responder 200 con el perfil del usuario autenticado', async () => {
      const mockUsuario = { id: 'user-1', nombre: 'Test' };
      servicio.obtenerPerfil.mockResolvedValue(mockUsuario);

      await controller.perfil(req, res, next);

      expect(servicio.obtenerPerfil).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ usuario: mockUsuario });
    });
  });

  describe('forgotPassword', () => {
    it('debe responder 400 si falta el correo', async () => {
      req.body = {};
      await controller.forgotPassword(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'El correo es obligatorio' }));
    });

    it('debe responder 200 si el correo es provisto (happy path)', async () => {
      req.body = { correo: 'test@test.com' };
      servicio.solicitarRecuperacion.mockResolvedValue({ mensaje: 'PIN enviado' });

      await controller.forgotPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'PIN enviado' });
    });
  });

  describe('verifyCode', () => {
    it('debe responder 400 si falta el código PIN', async () => {
      req.body = { correo: 'test@test.com' };
      await controller.verifyCode(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 si el código es válido (happy path)', async () => {
      req.body = { correo: 'test@test.com', pin: '1234' };
      servicio.verificarCodigo.mockResolvedValue({ mensaje: 'Código verificado' });

      await controller.verifyCode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Código verificado' });
    });
  });

  describe('actualizarPerfil', () => {
    it('debe responder 200 con el perfil actualizado y mensaje de confirmación', async () => {
      req.body = { nombre: 'Nombre Editado', avatarUrl: '/uploads/avatar.jpg' };
      const usuarioActualizado = { id: 'user-1', nombre: 'Nombre Editado', avatarUrl: '/uploads/avatar.jpg' };
      servicio.actualizarPerfil.mockResolvedValue(usuarioActualizado);

      await controller.actualizarPerfil(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        usuario: usuarioActualizado,
        mensaje: 'Perfil actualizado exitosamente',
      });
    });
  });
});
