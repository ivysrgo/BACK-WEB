const servicio = require('../services/notificaciones.service');

async function listarMias(req, res, next) {
  try {
    const notificaciones = await servicio.listarDeUsuario(req.usuario);
    res.status(200).json(notificaciones);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarMias,
};
