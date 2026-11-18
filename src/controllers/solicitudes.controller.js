const servicio = require('../services/solicitudes.service');

async function listar(req, res, next) {
  try {
    const solicitudes = await servicio.listar(req.query, req.usuario);
    res.status(200).json(solicitudes);
  } catch (error) {
    next(error);
  }
}

async function listarMias(req, res, next) {
  try {
    if (!req.usuario) {
      return res.status(200).json({ enviadas: [], recibidas: [], historial: [], favoritos: 0 });
    }
    const solicitudes = await servicio.listarDeUsuario(req.usuario.id);
    res.status(200).json(solicitudes);
  } catch (error) {
    next(error);
  }
}

async function obtener(req, res, next) {
  try {
    const solicitud = await servicio.obtener(req.params.id, req.usuario ? req.usuario.id : null);
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

async function actualizar(req, res, next) {
  try {
    const status = req.body.status || req.body.estado;
    const actualizada = await servicio.actualizarEstado(
      req.params.id,
      status,
      req.usuario ? req.usuario.id : null
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
      req.usuario ? req.usuario.id : null
    );
    res.status(200).json(actualizada);
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    await servicio.eliminar(req.params.id, req.usuario ? req.usuario.id : null);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  listarMias,
  obtener,
  crear,
  actualizar,
  actualizarEstado: actualizar,
  confirmarIntercambio,
  eliminar,
};
