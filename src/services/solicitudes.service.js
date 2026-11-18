const Solicitud = require('../models/solicitud.models');
const Publicacion = require('../models/publicacion.models');
const Usuario = require('../models/usuario.models');
const Favorito = require('../models/favorito.models');
const HttpError = require('../utils/HttpError');

const ESTADOS_EN_CURSO = ['Pendiente', 'Aceptado'];
const ESTADOS_HISTORIAL = ['Donado', 'Rechazado', 'Cancelado'];

async function listarDeUsuario(usuarioId) {
  const [enviadas, recibidas, historial, favoritos] = await Promise.all([
    Solicitud.find({ solicitanteId: usuarioId, status: { $in: ESTADOS_EN_CURSO } }).sort({ createdAt: -1 }),
    Solicitud.find({ destinatarioId: usuarioId, status: { $in: ESTADOS_EN_CURSO } }).sort({ createdAt: -1 }),
    Solicitud.find({
      $or: [{ solicitanteId: usuarioId }, { destinatarioId: usuarioId }],
      status: { $in: ESTADOS_HISTORIAL },
    }).sort({ createdAt: -1 }),
    Favorito.countDocuments({ usuarioId }),
  ]);

  return { enviadas, recibidas, historial, favoritos };
}

async function obtener(id, usuarioId) {
  const solicitud = await Solicitud.findById(id);
  if (!solicitud) throw new HttpError(404, 'Solicitud no encontrada');

  if (![solicitud.solicitanteId, solicitud.destinatarioId].some((idUsuario) => String(idUsuario) === String(usuarioId))) {
    throw new HttpError(403, 'No tienes permiso para ver esta solicitud');
  }

  return solicitud;
}

async function crear(datos, usuario) {
  const articulo = await Publicacion.findById(datos.articuloId);
  if (!articulo) throw new HttpError(404, 'El artículo solicitado no existe');
  if (String(articulo.usuarioId) === String(usuario.id)) {
    throw new HttpError(400, 'No puedes solicitar tu propia publicación');
  }
  if (!articulo.usuarioId) {
    throw new HttpError(400, 'Esta publicación no está asociada a una cuenta y no puede recibir solicitudes');
  }
  if (articulo.status !== 'Disponible') {
    throw new HttpError(409, 'Esta publicación ya no está disponible');
  }

  if (datos.articuloOfrecidoId) {
    const articuloOfrecido = await Publicacion.findOne({
      _id: datos.articuloOfrecidoId,
      usuarioId: usuario.id,
      status: 'Disponible',
    });
    if (!articuloOfrecido) {
      throw new HttpError(400, 'El artículo ofrecido no es una publicación disponible tuya');
    }
  }

  const solicitudPendiente = await Solicitud.findOne({
    solicitanteId: usuario.id,
    articuloId: articulo.id,
    status: { $in: ESTADOS_EN_CURSO },
  });
  if (solicitudPendiente) {
    throw new HttpError(409, 'Ya tienes una solicitud pendiente para este artículo');
  }

  const nueva = new Solicitud({
    ...datos,
    title: articulo.title,
    author: usuario.nombre,
    solicitanteId: usuario.id,
    destinatarioId: articulo.usuarioId,
    articuloId: articulo.id,
  });

  const solicitudGuardada = await nueva.save();
  await Publicacion.updateOne({ _id: articulo.id }, { $inc: { requests: 1 } });
  return solicitudGuardada;
}

async function actualizarEstado(id, status, usuarioId) {
  const solicitud = await Solicitud.findById(id);
  if (!solicitud) throw new HttpError(404, 'Solicitud no encontrada');

  const esSolicitante = String(solicitud.solicitanteId) === String(usuarioId);
  const esDestinatario = String(solicitud.destinatarioId) === String(usuarioId);
  const estadoAnterior = solicitud.status;
  const puedeCancelar = esSolicitante && status === 'Cancelado' && estadoAnterior === 'Pendiente';
  const puedeResponder = esDestinatario &&
    estadoAnterior === 'Pendiente' &&
    ['Aceptado', 'Rechazado'].includes(status);
  const puedeCompletar = esDestinatario && estadoAnterior === 'Aceptado' && status === 'Donado';

  if (!puedeCancelar && !puedeResponder && !puedeCompletar) {
    throw new HttpError(409, 'La solicitud no puede cambiar a ese estado');
  }

  const actualizada = await Solicitud.findOneAndUpdate(
    { _id: id, status: estadoAnterior },
    { $set: { status } },
    { new: true, runValidators: true }
  );
  if (!actualizada) throw new HttpError(409, 'La solicitud ya fue actualizada');
  return actualizada;
}

async function confirmarIntercambio(id, calificacion, usuarioId) {
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    throw new HttpError(400, 'La calificación debe ser un número entero entre 1 y 5');
  }

  const solicitud = await Solicitud.findById(id);
  if (!solicitud) throw new HttpError(404, 'Solicitud no encontrada');
  if (String(solicitud.destinatarioId) !== String(usuarioId)) {
    throw new HttpError(403, 'Solo quien recibió la solicitud puede confirmar el intercambio');
  }
  if (solicitud.type !== 'INTERCAMBIO' || solicitud.status !== 'Pendiente') {
    throw new HttpError(409, 'Este intercambio ya no se puede confirmar');
  }
  const solicitante = await Usuario.findById(solicitud.solicitanteId);
  if (!solicitante) throw new HttpError(404, 'El usuario solicitante ya no existe');

  const actualizada = await Solicitud.findOneAndUpdate(
    {
      _id: id,
      destinatarioId: usuarioId,
      type: 'INTERCAMBIO',
      status: 'Pendiente',
    },
    { $set: { status: 'Donado', calificacion } },
    { new: true, runValidators: true }
  );
  if (!actualizada) throw new HttpError(409, 'Este intercambio ya no se puede confirmar');

  const cantidadCalificaciones = solicitante.ratingCount || 0;
  solicitante.rating =
    (solicitante.rating * cantidadCalificaciones + calificacion) / (cantidadCalificaciones + 1);
  solicitante.ratingCount = cantidadCalificaciones + 1;
  await solicitante.save();

  return actualizada;
}

module.exports = {
  listarDeUsuario,
  obtener,
  crear,
  actualizarEstado,
  confirmarIntercambio,
};
