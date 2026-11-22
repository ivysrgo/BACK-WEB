const { requerirAdmin } = require('../../src/middlewares/auth.middleware');
const publicacionesService = require('../../src/services/publicaciones.service');
const Publicacion = require('../../src/models/publicacion.models');
const Favorito = require('../../src/models/favorito.models');
const HttpError = require('../../src/utils/HttpError');

jest.mock('../../src/models/publicacion.models');
jest.mock('../../src/models/favorito.models');
jest.mock('../../src/models/solicitud.models');
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
 * 3. Máquina de Estados y Protección de Privacidad en DTOs
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
});
