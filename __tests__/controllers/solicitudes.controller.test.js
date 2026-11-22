const controller = require('../../src/controllers/solicitudes.controller');
const servicio = require('../../src/services/solicitudes.service');

jest.mock('../../src/services/solicitudes.service');

describe('Controlador: solicitudes.controller', () => {
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
    it('debe responder 200 con la lista de solicitudes (happy path)', async () => {
      const mockList = [{ id: 'sol-1', title: 'Solicitud 1' }];
      servicio.listar.mockResolvedValue(mockList);

      await controller.listar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockList);
    });

    it('debe propagar error a next() si el servicio falla', async () => {
      const err = new Error('Error al listar');
      servicio.listar.mockRejectedValue(err);

      await controller.listar(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('listarMias', () => {
    it('debe retornar estructura vacía si req.usuario no existe', async () => {
      req.usuario = null;
      await controller.listarMias(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        enviadas: [],
        recibidas: [],
        historial: [],
        favoritos: 0,
      });
    });

    it('debe responder 200 con las solicitudes del usuario', async () => {
      const mockData = { enviadas: [{ id: 's1' }], recibidas: [], historial: [], favoritos: 1 };
      servicio.listarDeUsuario.mockResolvedValue(mockData);

      await controller.listarMias(req, res, next);

      expect(servicio.listarDeUsuario).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockData);
    });

    it('debe propagar error a next si listarDeUsuario falla', async () => {
      const err = new Error('Error al listar');
      servicio.listarDeUsuario.mockRejectedValue(err);

      await controller.listarMias(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('obtener', () => {
    it('debe responder 200 con la solicitud encontrada', async () => {
      req.params.id = 'sol-123';
      const mockSol = { id: 'sol-123', title: 'Solicitud' };
      servicio.obtener.mockResolvedValue(mockSol);

      await controller.obtener(req, res, next);

      expect(servicio.obtener).toHaveBeenCalledWith('sol-123', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSol);
    });

    it('debe soportar usuario nulo en obtener', async () => {
      req.usuario = null;
      req.params.id = 'sol-123';
      servicio.obtener.mockResolvedValue({ id: 'sol-123' });

      await controller.obtener(req, res, next);
      expect(servicio.obtener).toHaveBeenCalledWith('sol-123', null);
    });

    it('debe llamar a next si obtener falla', async () => {
      req.params.id = 'sol-123';
      const err = new Error('No encontrada');
      servicio.obtener.mockRejectedValue(err);

      await controller.obtener(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('crear', () => {
    it('debe responder 201 con la nueva solicitud creada', async () => {
      req.body = { title: 'Donación ropa' };
      const creada = { id: 'sol-nueva', title: 'Donación ropa' };
      servicio.crear.mockResolvedValue(creada);

      await controller.crear(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(creada);
    });

    it('debe llamar a next si crear falla', async () => {
      const err = new Error('Error al crear');
      servicio.crear.mockRejectedValue(err);

      await controller.crear(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('actualizar', () => {
    it('debe responder 200 con la solicitud actualizada', async () => {
      req.params.id = 'sol-1';
      req.body = { status: 'Aceptado' };
      const actualizada = { id: 'sol-1', status: 'Aceptado' };
      servicio.actualizarEstado.mockResolvedValue(actualizada);

      await controller.actualizar(req, res, next);

      expect(servicio.actualizarEstado).toHaveBeenCalledWith('sol-1', 'Aceptado', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(actualizada);
    });

    it('debe soportar req.body.estado y usuario nulo', async () => {
      req.usuario = null;
      req.params.id = 'sol-2';
      req.body = { estado: 'Donado' };
      servicio.actualizarEstado.mockResolvedValue({ id: 'sol-2', status: 'Donado' });

      await controller.actualizar(req, res, next);
      expect(servicio.actualizarEstado).toHaveBeenCalledWith('sol-2', 'Donado', null);
    });

    it('debe llamar a next si actualizar falla', async () => {
      req.params.id = 'sol-1';
      req.body = { status: 'Rechazado' };
      const err = new Error('Error al actualizar');
      servicio.actualizarEstado.mockRejectedValue(err);

      await controller.actualizar(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('confirmarIntercambio', () => {
    it('debe responder 200 con el intercambio confirmado', async () => {
      req.params.id = 'sol-1';
      req.body = { calificacion: 5 };
      const confirmada = { id: 'sol-1', status: 'Donado' };
      servicio.confirmarIntercambio.mockResolvedValue(confirmada);

      await controller.confirmarIntercambio(req, res, next);

      expect(servicio.confirmarIntercambio).toHaveBeenCalledWith('sol-1', 5, 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(confirmada);
    });

    it('debe soportar usuario nulo en confirmarIntercambio', async () => {
      req.usuario = null;
      req.params.id = 'sol-1';
      req.body = { calificacion: 4 };
      servicio.confirmarIntercambio.mockResolvedValue({ id: 'sol-1' });

      await controller.confirmarIntercambio(req, res, next);
      expect(servicio.confirmarIntercambio).toHaveBeenCalledWith('sol-1', 4, null);
    });

    it('debe llamar a next si confirmarIntercambio falla', async () => {
      const err = new Error('Error al confirmar');
      servicio.confirmarIntercambio.mockRejectedValue(err);

      await controller.confirmarIntercambio(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('eliminar', () => {
    it('debe responder 204 sin contenido al eliminar solicitud', async () => {
      req.params.id = 'sol-1';
      servicio.eliminar.mockResolvedValue();

      await controller.eliminar(req, res, next);

      expect(servicio.eliminar).toHaveBeenCalledWith('sol-1', 'user-1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('debe soportar usuario nulo en eliminar', async () => {
      req.usuario = null;
      req.params.id = 'sol-9';
      servicio.eliminar.mockResolvedValue();

      await controller.eliminar(req, res, next);
      expect(servicio.eliminar).toHaveBeenCalledWith('sol-9', null);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('debe llamar a next si eliminar falla', async () => {
      req.params.id = 'sol-1';
      const err = new Error('Error al eliminar');
      servicio.eliminar.mockRejectedValue(err);

      await controller.eliminar(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
