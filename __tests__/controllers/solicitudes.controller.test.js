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
  });
});
