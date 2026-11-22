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

    it('debe reiniciar bloqueo si el tiempo de bloqueo ya venció', async () => {
      const mockUsuario = {
        suspendido: false,
        estaBloqueado: () => false,
        bloqueado: true,
        bloqueadoHasta: new Date(Date.now() - 1000),
        intentosFallidos: 3,
        compararContrasena: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
        id: 'usr-desbloqueado',
        nombre: 'Usuario',
        correo: 'user@test.com',
        role: 'user',
      };
      Usuario.findOne.mockResolvedValue(mockUsuario);
      jwt.sign.mockReturnValue('token-ok');

      await servicio.login({ correo: 'user@test.com', contrasena: 'Password1!' });

      expect(mockUsuario.bloqueado).toBe(false);
      expect(mockUsuario.bloqueadoHasta).toBeNull();
      expect(mockUsuario.intentosFallidos).toBe(0);
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

    it('verificarCodigo: lanza 404 si el usuario no existe', async () => {
      Usuario.findOne.mockResolvedValue(null);
      await expect(servicio.verificarCodigo('nadie@test.com', '1234')).rejects.toThrow('Usuario no encontrado');
    });
  });

  describe('restablecerContrasena', () => {
    it('debe lanzar 404 si el usuario no existe', async () => {
      Usuario.findOne.mockResolvedValue(null);
      await expect(servicio.restablecerContrasena('nadie@test.com', '1234', 'Nueva123!')).rejects.toThrow(
        'Usuario no encontrado'
      );
    });

    it('debe lanzar 400 si el PIN es inválido', async () => {
      Usuario.findOne.mockResolvedValue({ pinRecuperacion: '9999' });
      await expect(servicio.restablecerContrasena('alguien@test.com', '1234', 'Nueva123!')).rejects.toThrow(
        'PIN inválido'
      );
    });

    it('debe restablecer contraseña y desbloquear usuario (happy path)', async () => {
      const mockUser = {
        pinRecuperacion: '1234',
        bloqueado: true,
        intentosFallidos: 3,
        save: jest.fn().mockResolvedValue(true),
      };
      Usuario.findOne.mockResolvedValue(mockUser);

      const res = await servicio.restablecerContrasena('usuario@test.com', '1234', 'NuevaSegura123!');

      expect(mockUser.contrasena).toBe('NuevaSegura123!');
      expect(mockUser.bloqueado).toBe(false);
      expect(mockUser.intentosFallidos).toBe(0);
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.mensaje).toMatch(/Contraseña restablecida/);
    });
  });

  describe('cambiarContrasena', () => {
    it('debe lanzar 404 si el usuario no existe', async () => {
      Usuario.findById.mockResolvedValue(null);
      await expect(servicio.cambiarContrasena('usr-inexistente', 'Vieja', 'Nueva')).rejects.toThrow(
        'Usuario no encontrado'
      );
    });

    it('debe lanzar 400 si la contraseña actual no es correcta', async () => {
      const mockUser = { compararContrasena: jest.fn().mockResolvedValue(false) };
      Usuario.findById.mockResolvedValue(mockUser);

      await expect(servicio.cambiarContrasena('usr-1', 'ViejaMal', 'Nueva')).rejects.toThrow(
        'La contraseña actual no es correcta'
      );
    });

    it('debe actualizar la contraseña cuando es correcta (happy path)', async () => {
      const mockUser = {
        compararContrasena: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Usuario.findById.mockResolvedValue(mockUser);

      const res = await servicio.cambiarContrasena('usr-1', 'ViejaOk', 'NuevaOk123!');
      expect(mockUser.contrasena).toBe('NuevaOk123!');
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.mensaje).toMatch(/Contraseña actualizada correctamente/);
    });
  });

  describe('actualizarPerfil', () => {
    it('debe lanzar 404 si el usuario no existe', async () => {
      Usuario.findById.mockResolvedValue(null);
      await expect(servicio.actualizarPerfil('usr-inexistente', { nombre: 'Nuevo' })).rejects.toThrow(
        'Usuario no encontrado'
      );
    });

    it('debe lanzar 409 si el correo ya está registrado por otro usuario', async () => {
      const mockUser = { id: 'usr-1', correo: 'viejo@test.com' };
      Usuario.findById.mockResolvedValue(mockUser);
      Usuario.findOne.mockResolvedValue({ id: 'usr-otro', correo: 'duplicado@test.com' });

      await expect(
        servicio.actualizarPerfil('usr-1', { correo: 'duplicado@test.com' })
      ).rejects.toThrow('El correo electrónico ya está registrado por otro usuario');
    });

    it('debe actualizar los datos de perfil correctamente (happy path)', async () => {
      const mockUser = {
        id: 'usr-1',
        nombre: 'Viejo',
        correo: 'viejo@test.com',
        phone: '111',
        avatarUrl: '/viejo.jpg',
        role: 'user',
        save: jest.fn().mockResolvedValue(true),
      };
      Usuario.findById.mockResolvedValue(mockUser);
      Usuario.findOne.mockResolvedValue(null);

      const res = await servicio.actualizarPerfil('usr-1', {
        nombre: 'Nuevo Nombre',
        correo: 'nuevo@test.com',
        phone: '222',
        avatarUrl: '/nuevo.jpg',
      });

      expect(mockUser.nombre).toBe('Nuevo Nombre');
      expect(mockUser.correo).toBe('nuevo@test.com');
      expect(mockUser.phone).toBe('222');
      expect(mockUser.avatarUrl).toBe('/nuevo.jpg');
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.nombre).toBe('Nuevo Nombre');
    });
  });

  describe('obtenerPerfilPublico', () => {
    it('debe lanzar 404 si el ID no es un ObjectId válido', async () => {
      await expect(servicio.obtenerPerfilPublico('id-invalido')).rejects.toThrow('Usuario no encontrado');
    });

    it('debe retornar perfil público y publicaciones asociadas (happy path)', async () => {
      const Publicacion = require('../../src/models/publicacion.models');
      const validId = '507f1f77bcf86cd799439011';
      const mockUser = {
        _id: validId,
        nombre: 'Juan Publico',
        correo: 'juan@test.com',
        phone: '3001234567',
        role: 'Administrador',
      };
      Usuario.findById.mockResolvedValue(mockUser);

      const mockPubs = [
        {
          _id: 'pub-1',
          title: 'Silla',
          category: 'MUEBLES',
          status: 'Disponible',
          createdAt: new Date(),
          expirationDays: 30,
          daysElapsed: 0,
        },
        {
          _id: 'pub-2',
          title: 'Mesa',
          category: 'MUEBLES',
          status: 'Disponible',
          createdAt: new Date(),
          expirationDays: 0,
          daysElapsed: 0,
        },
      ];
      Publicacion.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockPubs),
      });

      const res = await servicio.obtenerPerfilPublico(validId);

      expect(res.usuario.nombre).toBe('Juan Publico');
      expect(res.usuario.role).toBe('admin');
      expect(res.publicaciones).toHaveLength(2);
      expect(res.publicaciones[1].status).toBe('Caducado');
    });
  });

  describe('sembrarUsuariosIniciales', () => {
    it('debe crear usuarios semilla si no existen', async () => {
      Usuario.findOne.mockResolvedValue(null);
      Usuario.create = jest.fn().mockResolvedValue({});

      await servicio.sembrarUsuariosIniciales();

      expect(Usuario.create).toHaveBeenCalledTimes(2);
    });

    it('debe actualizar rol si ya existen con rol diferente', async () => {
      const mockAdmin = { role: 'otro', save: jest.fn().mockResolvedValue(true) };
      const mockUser = { role: 'Miembro de la comunidad', save: jest.fn().mockResolvedValue(true) };
      Usuario.findOne
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUser);

      await servicio.sembrarUsuariosIniciales();

      expect(mockAdmin.role).toBe('admin');
      expect(mockUser.role).toBe('user');
      expect(mockAdmin.save).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
