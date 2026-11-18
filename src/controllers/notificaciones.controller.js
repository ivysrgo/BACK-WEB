const servicio = require('../services/notificaciones.service');

async function listar(req, res, next) {
  try {
    const notificaciones = await servicio.listarPorUsuario(req.usuario._id);
    res.status(200).json(notificaciones);
  } catch (error) {
    next(error);
  }
}

async function contarNoLeidas(req, res, next) {
  try {
    const resultado = await servicio.contarNoLeidas(req.usuario._id);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

async function marcarLeida(req, res, next) {
  try {
    const actualizada = await servicio.marcarComoLeida(req.params.id, req.usuario._id);
    res.status(200).json(actualizada);
  } catch (error) {
    next(error);
  }
}

async function marcarTodasLeidas(req, res, next) {
  try {
    const resultado = await servicio.marcarTodasComoLeidas(req.usuario._id);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    await servicio.eliminarNotificacion(req.params.id, req.usuario._id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
  eliminar,
};
