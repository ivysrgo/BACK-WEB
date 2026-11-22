const { requerirAdmin } = require('../../src/middlewares/auth.middleware');
const publicacionesService = require('../../src/services/publicaciones.service');
const authService = require('../../src/services/auth.service');
const Publicacion = require('../../src/models/publicacion.models');
const Favorito = require('../../src/models/favorito.models');
const Usuario = require('../../src/models/usuario.models');
const HttpError = require('../../src/utils/HttpError');

jest.mock('../../src/models/publicacion.models');
jest.mock('../../src/models/favorito.models');
jest.mock('../../src/models/solicitud.models');
jest.mock('../../src/models/usuario.models');
jest.mock('../../src/services/notificaciones.service');

/**
 * ============================================================================
 * SUITE DE PRUEBAS: CAJA GRIS (GREY-BOX TESTING)
 * ============================================================================
 * Principio:
 * Las pruebas de caja gris combinan la perspectiva del usuario/cliente externo
 * con el conocimiento parcial de la arquitectura interna (esquemas de datos,
 * roles RBAC, transiciones de estado y efectos colaterales de persistencia).
 *
 * Técnicas aplicadas:
 * 1. Matriz de Control de Acceso Basada en Roles (RBAC Matrix)
 * 2. Pruebas de Integridad Referencial y Eliminación en Cascada (Cascading Deletes)
 * 3. Máquina de Estados y Protección de Privacidad en DTOs y Cuentas (Bloqueo, PIN, Perfil)
 */

describe('Suite de Pruebas: CAJA GRIS (Grey-Box)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. MATRIZ DE SEGURIDAD RBAC (Role-Based Access Control)
  // --------------------------------------------------------------------------
  describe('Matriz RBAC: Permisos de Acceso y Modificación', () => {
    it('[RBAC: Admin]: requerirAdmin permite continuar cuando el rol es "admin" o "Administrador"', () => {
      const next1 = jest.fn();
      requerirAdmin({ usuario: { role: 'admin' } }, {}, next1);
      expect(next1).toHaveBeenCalledWith();

      const next2 = jest.fn();
      requerirAdmin({ usuario: { role: 'Administrador' } }, {}, next2);
      expect(next2).toHaveBeenCalledWith();
    });

    it('[RBAC: Usuario Regular]: requerirAdmin rechaza con 403 a usuarios estándar', () => {
      const next = jest.fn();
      requerirAdmin({ usuario: { role: 'user' } }, {}, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringMatching(/administrador/i),
        })
      );
    });

    it('[RBAC: Propiedad de Recurso]: El dueño puede modificar su publicación', async () => {
      const mockPub = {
        _id: 'pub-99',
        usuarioId: 'user-propietario',
        title: 'Bicicleta Antigua',
        status: 'Disponible',
        save: jest.fn().mockResolvedValue({ _id: 'pub-99', title: 'Bicicleta Restaurada' }),
      };
      Publicacion.findById.mockResolvedValue(mockPub);

      const usuarioDuenio = { _id: 'user-propietario', role: 'user' };
      const resultado = await publicacionesService.actualizar(
        'pub-99',
        { title: 'Bicicleta Restaurada' },
        usuarioDuenio
      );

      expect(mockPub.save).toHaveBeenCalled();
      expect(resultado.title).toBe('Bicicleta Restaurada');
    });

    it('[RBAC: Violación de Propiedad]: Un usuario ajeno no puede modificar la publicación de otro (403)', async () => {
      const mockPub = {
        _id: 'pub-99',
        usuarioId: 'user-propietario',
        title: 'Bicicleta Antigua',
        status: 'Disponible',
      };
      Publicacion.findById.mockResolvedValue(mockPub);

      const usuarioIntruso = { _id: 'user-impostor', role: 'user' };

      await expect(
        publicacionesService.actualizar('pub-99', { title: 'Hack' }, usuarioIntruso)
      ).rejects.toThrow(HttpError);
    });

    it('[RBAC: Bypass Administrativo]: Un administrador puede modificar la publicación aunque no sea el creador', async () => {
      const mockPub = {
        _id: 'pub-99',
        usuarioId: 'user-propietario',
        title: 'Bicicleta Antigua',
        status: 'Disponible',
        save: jest.fn().mockResolvedValue({ _id: 'pub-99', title: 'Modificada por Admin' }),
      };
      Publicacion.findById.mockResolvedValue(mockPub);

      const usuarioAdmin = { _id: 'admin-01', role: 'admin' };
      const resultado = await publicacionesService.actualizar(
        'pub-99',
        { title: 'Modificada por Admin' },
        usuarioAdmin
      );

      expect(mockPub.save).toHaveBeenCalled();
      expect(resultado.title).toBe('Modificada por Admin');
    });
  });

  // --------------------------------------------------------------------------
  // 2. INTEGRIDAD REFERENCIAL Y EFECTOS COLATERALES EN MONGO
  // --------------------------------------------------------------------------
  describe('Integridad de Datos: Cascada al Eliminar Publicaciones', () => {
    it('Al eliminar una publicación, se garantiza la limpieza de Favoritos asociados', async () => {
      const mockPub = {
        _id: 'pub-100',
        usuarioId: 'user-100',
        imageUrls: [],
      };
      Publicacion.findById.mockResolvedValue(mockPub);
      Publicacion.findByIdAndDelete.mockResolvedValue(mockPub);
      Favorito.deleteMany.mockResolvedValue({ deletedCount: 5 });

      await publicacionesService.eliminar('pub-100', { _id: 'user-100', role: 'user' });

      expect(Publicacion.findByIdAndDelete).toHaveBeenCalledWith('pub-100');
      expect(Favorito.deleteMany).toHaveBeenCalledWith({ articuloId: 'pub-100' });
    });
  });

  // --------------------------------------------------------------------------
  // 3. MÁQUINA DE ESTADOS Y SEGURIDAD: auth.service (Cuentas, Bloqueos, PIN)
  // --------------------------------------------------------------------------
  describe('Máquina de Estados Interna: auth.service', () => {
    it('[Login]: Rechaza si el usuario no existe', async () => {
      Usuario.findOne.mockResolvedValue(null);
      await expect(
        authService.login({ correo: 'nadie@test.com', contrasena: '123' })
      ).rejects.toThrow(HttpError);
    });

    it('[Login]: Rechaza si el usuario se encuentra suspendido por el sistema', async () => {
      Usuario.findOne.mockResolvedValue({
        correo: 'suspendido@test.com',
        suspendido: true,
      });
      await expect(
        authService.login({ correo: 'suspendido@test.com', contrasena: '123' })
      ).rejects.toThrow(expect.objectContaining({ statusCode: 403 }));
    });

    it('[Login]: Rechaza si el usuario se encuentra temporalmente bloqueado', async () => {
      Usuario.findOne.mockResolvedValue({
        correo: 'bloqueado@test.com',
        suspendido: false,
        estaBloqueado: () => true,
      });
      await expect(
        authService.login({ correo: 'bloqueado@test.com', contrasena: '123' })
      ).rejects.toThrow(expect.objectContaining({ statusCode: 403 }));
    });

    it('[Login]: Incrementa intentos fallidos y bloquea al 3er intento erróneo', async () => {
      const mockUser = {
        correo: 'prueba@test.com',
        suspendido: false,
        intentosFallidos: 2,
        bloqueado: false,
        estaBloqueado: () => false,
        compararContrasena: jest.fn().mockResolvedValue(false),
        save: jest.fn().mockResolvedValue({}),
      };
      Usuario.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.login({ correo: 'prueba@test.com', contrasena: 'mal' })
      ).rejects.toThrow(expect.objectContaining({ statusCode: 403 }));

      expect(mockUser.bloqueado).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('[Login]: Exitoso para rol Administrador y Usuario regular', async () => {
      const mockUser = {
        id: 'usr-admin-id',
        nombre: 'Admin General',
        correo: 'admin@ecogolgi.com',
        role: 'Administrador',
        suspendido: false,
        bloqueado: true,
        intentosFallidos: 1,
        rating: 4.8,
        ratingCount: 5,
        estaBloqueado: () => false,
        compararContrasena: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue({}),
      };
      Usuario.findOne.mockResolvedValue(mockUser);

      const res = await authService.login({ correo: 'admin@ecogolgi.com', contrasena: 'Admin123' });

      expect(res.token).toBeDefined();
      expect(res.usuario.role).toBe('admin');
      expect(res.usuario.rating).toBe(4.8);
      expect(mockUser.bloqueado).toBe(false);
      expect(mockUser.intentosFallidos).toBe(0);
    });

    it('[Registro]: Rechaza si el correo ya existe, y registra exitosamente si es nuevo', async () => {
      Usuario.findOne.mockResolvedValueOnce({ correo: 'duplicado@test.com' });
      await expect(
        authService.registrar({ nombre: 'Juan', correo: 'duplicado@test.com', contrasena: '123456' })
      ).rejects.toThrow(expect.objectContaining({ statusCode: 409 }));

      // Registro exitoso
      Usuario.findOne.mockResolvedValueOnce(null);
      Usuario.mockImplementation((data) => ({
        ...data,
        id: 'new-user-id',
        save: jest.fn().mockResolvedValue({}),
      }));

      const nuevo = await authService.registrar({
        nombre: 'Pedro',
        correo: 'pedro@test.com',
        contrasena: '123456',
        phone: '3001234567',
      });
      expect(nuevo.token).toBeDefined();
      expect(nuevo.usuario.nombre).toBe('Pedro');
    });

    it('[Perfil]: Obtiene perfil autenticado y maneja 404', async () => {
      Usuario.findById.mockResolvedValueOnce(null);
      await expect(authService.obtenerPerfil('inexistente')).rejects.toThrow(HttpError);

      Usuario.findById.mockResolvedValueOnce({
        id: 'u-1',
        nombre: 'Maria',
        correo: 'maria@test.com',
        role: 'user',
        ratingCount: 0,
      });
      const perfil = await authService.obtenerPerfil('u-1');
      expect(perfil.nombre).toBe('Maria');
      expect(perfil.rating).toBe(0);
    });

    it('[Recuperación de Contraseña]: Solicitar PIN, verificar PIN y restablecer contraseña', async () => {
      // 1. Solicitar PIN
      Usuario.findOne.mockResolvedValueOnce(null);
      await expect(authService.solicitarRecuperacion('nadie@test.com')).rejects.toThrow(HttpError);

      const mockRecuperar = {
        correo: 'maria@test.com',
        save: jest.fn().mockResolvedValue({}),
      };
      Usuario.findOne.mockResolvedValueOnce(mockRecuperar);
      const resSol = await authService.solicitarRecuperacion('maria@test.com');
      expect(mockRecuperar.pinRecuperacion).toBe('1234');
      expect(resSol.pinSimulado).toBe('1234');

      // 2. Verificar PIN
      Usuario.findOne.mockResolvedValueOnce({ pinRecuperacion: '1234' });
      const resVer = await authService.verificarCodigo('maria@test.com', '1234');
      expect(resVer.mensaje).toMatch(/verificado correctamente/i);

      Usuario.findOne.mockResolvedValueOnce({ pinRecuperacion: '9999' });
      await expect(authService.verificarCodigo('maria@test.com', '0000')).rejects.toThrow(HttpError);

      // 3. Restablecer Contraseña
      const mockRestablecer = {
        pinRecuperacion: '1234',
        bloqueado: true,
        save: jest.fn().mockResolvedValue({}),
      };
      Usuario.findOne.mockResolvedValueOnce(mockRestablecer);
      const resReset = await authService.restablecerContrasena('maria@test.com', '1234', 'nueva123');
      expect(resReset.mensaje).toMatch(/restablecida exitosamente/i);
      expect(mockRestablecer.bloqueado).toBe(false);
      expect(mockRestablecer.contrasena).toBe('nueva123');
    });

    it('[Cambio de Contraseña]: Valida contraseña anterior y actualiza', async () => {
      const mockCambio = {
        compararContrasena: jest.fn().mockResolvedValue(false),
        save: jest.fn(),
      };
      Usuario.findById.mockResolvedValueOnce(mockCambio);
      await expect(authService.cambiarContrasena('u-1', 'erronea', 'nueva123')).rejects.toThrow(HttpError);

      mockCambio.compararContrasena.mockResolvedValueOnce(true);
      mockCambio.save.mockResolvedValueOnce({});
      Usuario.findById.mockResolvedValueOnce(mockCambio);
      const resCambio = await authService.cambiarContrasena('u-1', 'correcta', 'nueva123');
      expect(resCambio.mensaje).toMatch(/actualizada correctamente/i);
    });

    it('[Actualizar Perfil]: Control de duplicidad de correo y actualización de campos', async () => {
      const mockPerfil = {
        _id: 'u-1',
        correo: 'actual@test.com',
        nombre: 'Viejo Nombre',
        save: jest.fn().mockResolvedValue({}),
      };
      Usuario.findById.mockResolvedValue(mockPerfil);
      Usuario.findOne.mockResolvedValueOnce({ _id: 'u-otro', correo: 'tomado@test.com' });

      // Correo ya tomado por otro
      await expect(
        authService.actualizarPerfil('u-1', { correo: 'tomado@test.com' })
      ).rejects.toThrow(expect.objectContaining({ statusCode: 409 }));

      // Actualización limpia
      Usuario.findOne.mockResolvedValueOnce(null);
      const perfilActualizado = await authService.actualizarPerfil('u-1', {
        nombre: 'Nuevo Nombre',
        correo: 'nuevo@test.com',
        phone: '12345678',
        avatarUrl: 'https://img.com/avatar.png',
      });
      expect(perfilActualizado.nombre).toBe('Nuevo Nombre');
      expect(mockPerfil.save).toHaveBeenCalled();
    });

    it('[Perfil Público]: Obtiene perfil público con cálculo de caducidad de publicaciones', async () => {
      const mockPublicaciones = [
        {
          _id: 'pub-x',
          title: 'Zapatos',
          status: 'Disponible',
          expirationDays: 0,
          createdAt: new Date(),
        },
      ];
      Publicacion.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockPublicaciones),
      });
      Usuario.findById.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        nombre: 'Luis',
        correo: 'luis@test.com',
        role: 'user',
      });

      const resPub = await authService.obtenerPerfilPublico('507f1f77bcf86cd799439011');
      expect(resPub.usuario.nombre).toBe('Luis');
      expect(resPub.publicaciones[0].status).toBe('Caducado');
    });

    it('[Semillero de Usuarios]: Inicializa administradores y miembros si no existen', async () => {
      Usuario.findOne.mockResolvedValue(null);
      Usuario.create = jest.fn().mockResolvedValue({});

      await authService.sembrarUsuariosIniciales();
      expect(Usuario.create).toHaveBeenCalled();
    });
  });
});
