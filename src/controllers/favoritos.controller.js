const servicio = require('../services/favoritos.service');

async function listar(req, res, next) {
  try {
    const favoritos = await servicio.listar(req.usuario.id);
    res.status(200).json(favoritos);
  } catch (error) {
    next(error);
  }
}

async function agregar(req, res, next) {
  try {
    const favorito = await servicio.agregar(req.body.articuloId, req.usuario.id);
    res.status(201).json(favorito);
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    await servicio.eliminar(req.params.articuloId, req.usuario.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  agregar,
  eliminar,
};
