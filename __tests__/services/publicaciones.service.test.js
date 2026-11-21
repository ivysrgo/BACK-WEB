const servicio = require('../../src/services/publicaciones.service');
const Publicacion = require('../../src/models/publicacion.models');
const Favorito = require('../../src/models/favorito.models');
const Solicitud = require('../../src/models/solicitud.models');
const HttpError = require('../../src/utils/HttpError');
const notificacionesService = require('../../src/services/notificaciones.service');

jest.mock('../../src/models/publicacion.models');
jest.mock('../../src/models/favorito.models');
jest.mock('../../src/models/solicitud.models');
jest.mock('../../src/services/notificaciones.service');
jest.mock('../../src/utils/imagenesPublicacion', () => ({
  guardarImagenesPublicacion: jest.fn().mockResolvedValue([{ url: '/uploads/foto1.jpg' }]),
  eliminarImagenesPublicacion: jest.fn().mockResolvedValue(true),
}));

describe('Servicio: publicaciones.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe listar publicaciones con filtro por defecto status != Intercambiado', async () => {
      const mockQuery = { sort: jest.fn().mockResolvedValue([{ id: 'pub-1', title: 'Libro' }]) };
      Publicacion.find.mockReturnValue(mockQuery);

      const res = await servicio.listar();

      expect(Publicacion.find).toHaveBeenCalledWith({
        status: { $ne: 'Intercambiado' },
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res).toEqual([{ id: 'pub-1', title: 'Libro' }]);
    });

    it('debe aplicar filtros de categoría, estado y término de búsqueda', async () => {
      const mockQuery = { sort: jest.fn().mockResolvedValue([]) };
      Publicacion.find.mockReturnValue(mockQuery);

      await servicio.listar({
        categoria: 'ROPA',
        estado: 'Disponible',
        q: 'camisa',
      });

      expect(Publicacion.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Disponible',
          $or: expect.any(Array),
        })
      );
    });
  });

  describe('obtener', () => {
    it('debe devolver la publicación si existe (happy path)', async () => {
      const mockPub = { _id: 'pub-123', title: 'Mesa' };
      Publicacion.findById.mockResolvedValue(mockPub);

      const res = await servicio.obtener('pub-123');
      expect(res).toEqual(mockPub);
    });

    it('debe lanzar HttpError(404) si la publicación no existe', async () => {
      Publicacion.findById.mockResolvedValue(null);

      await expect(servicio.obtener('pub-inexistente')).rejects.toThrow(HttpError);
      await expect(servicio.obtener('pub-inexistente')).rejects.toThrow('Publicación no encontrada');
    });
  });

  describe('crear', () => {
    it('debe guardar una publicación con imágenes procesadas', async () => {
      const datos = {
        title: 'Chaqueta',
        category: 'ROPA',
        images: ['data:image/png;base64,...'],
      };

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'pub-nueva',
        ...datos,
        imageUrl: '/uploads/foto1.jpg',
      });

      Publicacion.mockImplementation((obj) => ({
        ...obj,
        save: mockSave,
      }));

      const resultado = await servicio.crear(datos);

      expect(mockSave).toHaveBeenCalled();
      expect(resultado.imageUrl).toBe('/uploads/foto1.jpg');
    });
  });

  describe('actualizar', () => {
    it('debe lanzar HttpError(404) si la publicación no existe', async () => {
      Publicacion.findById.mockResolvedValue(null);

      await expect(
        servicio.actualizar('pub-inexistente', { title: 'Nuevo' }, { role: 'admin' })
      ).rejects.toThrow('Publicación no encontrada');
    });

    it('debe lanzar HttpError(403) si el usuario no es el dueño ni admin', async () => {
      const mockPub = {
        _id: 'pub-1',
        usuarioId: 'user-duenio',
        author: 'Dueño Original',
        status: 'Disponible',
      };
      Publicacion.findById.mockResolvedValue(mockPub);

      const usuarioAjeno = {
        _id: 'user-ajeno',
        id: 'user-ajeno',
        role: 'user',
        nombre: 'Usuario Ajeno',
      };

      await expect(
        servicio.actualizar('pub-1', { title: 'Nuevo' }, usuarioAjeno)
      ).rejects.toThrow('No tienes permisos para modificar esta publicación');
    });

    it('debe actualizar correctamente si el usuario es el dueño (happy path)', async () => {
      const mockPub = {
        _id: 'pub-1',
        id: 'pub-1',
        usuarioId: 'user-1',
        author: 'Sergio',
        title: 'Titulo Viejo',
        status: 'Disponible',
        save: jest.fn().mockResolvedValue({ _id: 'pub-1', title: 'Titulo Actualizado' }),
      };
      Publicacion.findById.mockResolvedValue(mockPub);

      const usuarioDuenio = { _id: 'user-1', id: 'user-1', role: 'user', nombre: 'Sergio' };
      const resultado = await servicio.actualizar(
        'pub-1',
        { title: 'Titulo Actualizado' },
        usuarioDuenio
      );

      expect(mockPub.save).toHaveBeenCalled();
      expect(resultado.title).toBe('Titulo Actualizado');
    });
  });

  describe('eliminar', () => {
    it('debe lanzar 404 si la publicación no existe', async () => {
      Publicacion.findById.mockResolvedValue(null);
      await expect(servicio.eliminar('pub-inexistente')).rejects.toThrow('Publicación no encontrada');
    });

    it('debe lanzar 403 si el usuario no tiene permisos para eliminar', async () => {
      const mockPub = {
        _id: 'pub-1',
        usuarioId: 'user-autor',
      };
      Publicacion.findById.mockResolvedValue(mockPub);

      const usuarioSinPermiso = { _id: 'user-otro', id: 'user-otro', role: 'user' };
      await expect(servicio.eliminar('pub-1', usuarioSinPermiso)).rejects.toThrow(
        'No tienes permiso para eliminar esta publicación'
      );
    });

    it('debe eliminar la publicación y limpiar favoritos asociados (happy path)', async () => {
      const mockPub = {
        _id: 'pub-1',
        usuarioId: 'user-admin',
        imageUrls: ['/uploads/img.jpg'],
      };
      Publicacion.findById.mockResolvedValue(mockPub);
      Publicacion.findByIdAndDelete.mockResolvedValue(mockPub);
      Favorito.deleteMany.mockResolvedValue({ deletedCount: 2 });

      const adminUser = { role: 'admin' };
      const resultado = await servicio.eliminar('pub-1', adminUser);

      expect(Favorito.deleteMany).toHaveBeenCalledWith({ articuloId: 'pub-1' });
      expect(Publicacion.findByIdAndDelete).toHaveBeenCalledWith('pub-1');
      expect(resultado).toEqual(mockPub);
    });
  });

  describe('obtenerEstadisticas', () => {
    it('debe calcular métricas agregadas y residuos evitados correctamente', async () => {
      Publicacion.countDocuments
        .mockResolvedValueOnce(10) // articulosDisponibles
        .mockResolvedValueOnce(3)  // intercambiosPublicacion
        .mockResolvedValueOnce(5)  // donacionesPublicacion
        .mockResolvedValueOnce(1); // caducadosPublicacion
      Solicitud.countDocuments
        .mockResolvedValueOnce(4)  // intercambiosSolicitud
        .mockResolvedValueOnce(6); // donacionesSolicitud

      const stats = await servicio.obtenerEstadisticas();

      expect(stats.articulosDisponibles).toBe(10);
      expect(stats.intercambiosLocales).toBe(4);
      expect(stats.escaladosUnidona).toBe(7); // max(6+1, 5+1) = 7
      expect(stats.residuosEvitadosKg).toBe(Math.round((10 + 4 + 7) * 2.5));
    });
  });
});
