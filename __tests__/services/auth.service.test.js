const servicio = require('../../src/services/auth.service');
const Usuario = require('../../src/models/usuario.models');
const jwt = require('jsonwebtoken');
const HttpError = require('../../src/utils/HttpError');

jest.mock('../../src/models/usuario.models');
jest.mock('jsonwebtoken');

describe('Servicio: auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe lanzar 401 si el usuario no existe', async () => {
      Usuario.findOne.mockResolvedValue(null);

      await expect(
        servicio.login({ correo: 'inexistente@test.com', contrasena: '123' })
      ).rejects.toThrow('Credenciales incorrectas');
    });

    it('debe lanzar 403 si el usuario está suspendido', async () => {
      Usuario.findOne.mockResolvedValue({
        suspendido: true,
      });

      await expect(
        servicio.login({ correo: 'suspendido@test.com', contrasena: '123' })
      ).rejects.toThrow('Tu cuenta fue suspendida por un administrador');
    });

    it('debe lanzar 403 si la cuenta está bloqueada', async () => {
      Usuario.findOne.mockResolvedValue({
        suspendido: false,
        estaBloqueado: () => true,
      });

      await expect(
        servicio.login({ correo: 'bloqueado@test.com', contrasena: '123' })
      ).rejects.toThrow(/bloqueada/);
    });

    it('debe incrementar intentos fallidos y lanzar 401 si la contraseña es incorrecta', async () => {
      const mockUsuario = {
        suspendido: false,
        estaBloqueado: () => false,
        bloqueado: false,
        intentosFallidos: 0,
        compararContrasena: jest.fn().mockResolvedValue(false),
        save: jest.fn().mockResolvedValue(true),
      };
      Usuario.findOne.mockResolvedValue(mockUsuario);

      await expect(
        servicio.login({ correo: 'usuario@test.com', contrasena: 'mal' })
      ).rejects.toThrow('Credenciales incorrectas');

      expect(mockUsuario.intentosFallidos).toBe(1);
      expect(mockUsuario.save).toHaveBeenCalled();
    });

    it('debe bloquear la cuenta al alcanzar el tercer intento fallido', async () => {
      const mockUsuario = {
        suspendido: false,
        estaBloqueado: () => false,
        bloqueado: false,
        intentosFallidos: 2,
        compararContrasena: jest.fn().mockResolvedValue(false),
        save: jest.fn().mockResolvedValue(true),
      };
      Usuario.findOne.mockResolvedValue(mockUsuario);

      await expect(
        servicio.login({ correo: 'usuario@test.com', contrasena: 'mal' })
      ).rejects.toThrow(/bloqueada/);

      expect(mockUsuario.bloqueado).toBe(true);
      expect(mockUsuario.intentosFallidos).toBe(3);
    });

    it('debe autenticar exitosamente y retornar token JWT (happy path)', async () => {
      const mockUsuario = {
        id: 'user-1',
        nombre: 'Ana',
        correo: 'ana@test.com',
        role: 'user',
        phone: '12345',
        rating: 4.8,
        ratingCount: 5,
        avatarUrl: '/uploads/avatar.jpg',
        suspendido: false,
        estaBloqueado: () => false,
        bloqueado: false,
        intentosFallidos: 1,
        compararContrasena: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Usuario.findOne.mockResolvedValue(mockUsuario);
      jwt.sign.mockReturnValue('jwt-mock-token');

      const res = await servicio.login({ correo: 'ana@test.com', contrasena: 'Valida123!' });

      expect(res.token).toBe('jwt-mock-token');
      expect(res.usuario.nombre).toBe('Ana');
      expect(res.usuario.correo).toBe('ana@test.com');
      expect(mockUsuario.intentosFallidos).toBe(0);
      expect(mockUsuario.save).toHaveBeenCalled();
    });
  });

  describe('registrar', () => {
    it('debe lanzar 409 si el correo ya se encuentra registrado', async () => {
      Usuario.findOne.mockResolvedValue({ id: 'existente' });

      await expect(
        servicio.registrar({
          nombre: 'Juan',
          correo: 'juan@test.com',
          contrasena: 'Valida123!',
        })
      ).rejects.toThrow('El correo electrónico ya está registrado');
    });

    it('debe crear un nuevo usuario y retornar token (happy path)', async () => {
      Usuario.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      Usuario.mockImplementation((data) => ({
        ...data,
        id: 'new-id-123',
        save: mockSave,
      }));
      jwt.sign.mockReturnValue('new-token');

      const res = await servicio.registrar({
        nombre: 'Pedro',
        correo: 'pedro@test.com',
        contrasena: 'Segura123!',
      });

      expect(mockSave).toHaveBeenCalled();
      expect(res.token).toBe('new-token');
      expect(res.usuario.nombre).toBe('Pedro');
      expect(res.usuario.correo).toBe('pedro@test.com');
    });
  });

  describe('obtenerPerfil', () => {
    it('debe lanzar 404 si el usuario no existe', async () => {
      Usuario.findById.mockResolvedValue(null);
      await expect(servicio.obtenerPerfil('id-inexistente')).rejects.toThrow('Usuario no encontrado');
    });

    it('debe devolver datos del usuario (happy path)', async () => {
      Usuario.findById.mockResolvedValue({
        id: 'user-1',
        nombre: 'Maria',
        correo: 'maria@test.com',
        role: 'user',
        phone: '987654',
        rating: 5,
        ratingCount: 1,
        avatarUrl: null,
      });

      const perfil = await servicio.obtenerPerfil('user-1');
      expect(perfil.nombre).toBe('Maria');
      expect(perfil.rating).toBe(5);
    });
  });

  describe('recuperación de contraseña', () => {
    it('solicitarRecuperacion: debe lanzar 404 si el correo no existe', async () => {
      Usuario.findOne.mockResolvedValue(null);
      await expect(servicio.solicitarRecuperacion('noexiste@test.com')).rejects.toThrow(
        'No existe una cuenta registrada'
      );
    });

    it('solicitarRecuperacion: guarda el PIN y retorna confirmación (happy path)', async () => {
      const mockUser = { save: jest.fn().mockResolvedValue(true) };
      Usuario.findOne.mockResolvedValue(mockUser);

      const res = await servicio.solicitarRecuperacion('usuario@test.com');
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.mensaje).toMatch(/PIN de recuperación/);
    });

    it('verificarCodigo: lanza 400 si el PIN no coincide', async () => {
      Usuario.findOne.mockResolvedValue({ pinRecuperacion: '9999' });
      await expect(servicio.verificarCodigo('usuario@test.com', '1234')).rejects.toThrow(
        'El PIN ingresado es incorrecto o ha expirado'
      );
    });

    it('verificarCodigo: valida exitosamente cuando el PIN coincide (happy path)', async () => {
      Usuario.findOne.mockResolvedValue({ pinRecuperacion: '1234' });
      const res = await servicio.verificarCodigo('usuario@test.com', '1234');
      expect(res.mensaje).toBe('Código verificado correctamente');
    });
  });
});
