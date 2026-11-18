const servicio = require('../services/admin.service');
const reportesServicio = require('../services/reportes.service');
const publicacionesServicio = require('../services/publicaciones.service');

const manejar = (accion) => async (req, res, next) => {
  try {
    await accion(req, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listarUsuarios: manejar(async (req, res) => {
    res.status(200).json(await servicio.listarUsuarios());
  }),
  obtenerUsuario: manejar(async (req, res) => {
    res.status(200).json(await servicio.obtenerUsuario(req.params.id));
  }),
  cambiarSuspension: manejar(async (req, res) => {
    const suspender = req.body?.suspendido !== false;
    res.status(200).json(await servicio.cambiarSuspension(req.params.id, suspender, req.usuario));
  }),
  listarDonaciones: manejar(async (req, res) => {
    res.status(200).json(await servicio.listarDonaciones(req.query));
  }),
  actualizarCaducidad: manejar(async (req, res) => {
    res.status(200).json(await servicio.actualizarCaducidad(req.params.id, req.body?.diasRestantes));
  }),
  obtenerMetricas: manejar(async (req, res) => {
    res.status(200).json(await servicio.obtenerMetricas());
  }),
  eliminarPublicacion: manejar(async (req, res) => {
    await publicacionesServicio.eliminar(req.params.id, req.usuario);
    await reportesServicio.resolverPendientesDe(req.params.id, 'Eliminada', req.usuario._id);
    res.status(204).send();
  }),
};
