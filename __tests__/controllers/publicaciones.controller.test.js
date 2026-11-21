const controller = require('../../src/controllers/publicaciones.controller');
const servicio = require('../../src/services/publicaciones.service');

jest.mock('../../src/services/publicaciones.service');

describe('Controlador: publicaciones.controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      usuario: { id: 'user-1' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe responder 200 con la lista de publicaciones (happy path)', async () => {
      const mockList = [{ id: '1', title: 'Articulo 1' }];
      servicio.listar.mockResolvedValue(mockList);

      await controller.listar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockList);
      expect(next).not.toHaveBeenCalled();
    });

    it('debe propagar el error a next() si el servicio falla', async () => {
      const error = new Error('Error en BD');
      servicio.listar.mockRejectedValue(error);

      await controller.listar(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('obtener', () => {
    it('debe responder 200 con la publicación solicitada', async () => {
      req.params.id = 'pub-100';
      const mockPub = { id: 'pub-100', title: 'Mochila' };
      servicio.obtener.mockResolvedValue(mockPub);

      await controller.obtener(req, res, next);

      expect(servicio.obtener).toHaveBeenCalledWith('pub-100');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPub);
    });

    it('debe llamar a next(error) si no existe', async () => {
      req.params.id = 'pub-inexistente';
      const error = new Error('No encontrada');
      servicio.obtener.mockRejectedValue(error);

      await controller.obtener(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crear', () => {
    it('debe responder 201 con la publicación creada (happy path)', async () => {
      req.body = { title: 'Libro' };
      const creada = { id: 'pub-nueva', title: 'Libro' };
      servicio.crear.mockResolvedValue(creada);

      await controller.crear(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(creada);
    });
  });

  describe('actualizar', () => {
    it('debe responder 200 con la publicación actualizada', async () => {
      req.params.id = 'pub-1';
      req.body = { title: 'Libro Editado' };
      const actualizada = { id: 'pub-1', title: 'Libro Editado' };
      servicio.actualizar.mockResolvedValue(actualizada);

      await controller.actualizar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(actualizada);
    });
  });

  describe('eliminar', () => {
    it('debe responder 204 sin contenido tras eliminación', async () => {
      req.params.id = 'pub-1';
      servicio.eliminar.mockResolvedValue();

      await controller.eliminar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('obtenerEstadisticas', () => {
    it('debe responder 200 con las métricas calculadas', async () => {
      const mockStats = { articulosDisponibles: 5, residuosEvitadosKg: 20 };
      servicio.obtenerEstadisticas.mockResolvedValue(mockStats);

      await controller.obtenerEstadisticas(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStats);
    });
  });
});
