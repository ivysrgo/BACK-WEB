const servicio = require('../services/solicitudes.service');

async function listarMias(req, res, next) {
  try {
    const solicitudes = await servicio.listarDeUsuario(req.usuario.id);
    res.status(200).json(solicitudes);
  } catch (error) {
    next(error);
  }
}

async function obtener(req, res, next) {
  try {
    const solicitud = await servicio.obtener(req.params.id, req.usuario.id);
    res.status(200).json(solicitud);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const nueva = await servicio.crear(req.body, req.usuario);
    res.status(201).json(nueva);
  } catch (error) {
    next(error);
  }
}

async function actualizarEstado(req, res, next) {
  try {
    const actualizada = await servicio.actualizarEstado(
      req.params.id,
      req.body.status,
      req.usuario.id
    );
    res.status(200).json(actualizada);
  } catch (error) {
    next(error);
  }
}

async function confirmarIntercambio(req, res, next) {
  try {
    const actualizada = await servicio.confirmarIntercambio(
      req.params.id,
      req.body.calificacion,
      req.usuario.id
    );
    res.status(200).json(actualizada);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarMias,
  obtener,
  crear,
  actualizarEstado,
  confirmarIntercambio,
};
