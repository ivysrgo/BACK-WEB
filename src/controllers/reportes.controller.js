const servicio = require('../services/reportes.service');

const manejar = (accion) => async (req, res, next) => {
  try {
    await accion(req, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crear: manejar(async (req, res) => {
    res.status(201).json(await servicio.crear(req.body ?? {}, req.usuario));
  }),
  listar: manejar(async (req, res) => {
    res.status(200).json(await servicio.listar(req.query.tipo));
  }),
  obtener: manejar(async (req, res) => {
    res.status(200).json(await servicio.obtener(req.params.id));
  }),
  ignorar: manejar(async (req, res) => {
    res.status(200).json(await servicio.ignorar(req.params.id, req.usuario));
  }),
  eliminarPublicacion: manejar(async (req, res) => {
    res.status(200).json(await servicio.eliminarPublicacion(req.params.id, req.usuario));
  }),
};
