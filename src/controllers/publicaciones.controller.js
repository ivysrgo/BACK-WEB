const servicio = require('../services/publicaciones.service');

async function listar(req, res, next) {
  try {
    const publicaciones = await servicio.listar(req.query);
    res.status(200).json(publicaciones);
  } catch (error) {
    next(error);
  }
}

async function obtener(req, res, next) {
  try {
    const publicacion = await servicio.obtener(req.params.id);
    res.status(200).json(publicacion);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const nueva = await servicio.crear(req.body);
    res.status(201).json(nueva);
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const actualizada = await servicio.actualizar(req.params.id, req.body);
    res.status(200).json(actualizada);
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    await servicio.eliminar(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
};
