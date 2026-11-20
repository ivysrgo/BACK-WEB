const Solicitud = require('../models/solicitud.models');
const Publicacion = require('../models/publicacion.models');
const Usuario = require('../models/usuario.models');
const Favorito = require('../models/favorito.models');
const HttpError = require('../utils/HttpError');

const ESTADOS_EN_CURSO = ['Pendiente', 'Aceptado'];
const ESTADOS_HISTORIAL = ['Donado', 'Rechazado', 'Cancelado'];

async function listar(filtros = {}, usuario = null) {
  const query = {};
  if (filtros.status) query.status = filtros.status;
  if (filtros.type) query.type = filtros.type;
  if (filtros.tipo) query.type = filtros.tipo;
  if (usuario && usuario.id) {
    query.$or = [{ solicitanteId: usuario.id }, { destinatarioId: usuario.id }];
  }
  const lista = await Solicitud.find(query).sort({ createdAt: -1 });
  return lista.map((s) => ({
    id: String(s._id),
    type: s.type,
    title: s.title,
    author: s.author,
    message: s.message,
    date: s.date,
    status: s.status,
    solicitanteId: String(s.solicitanteId),
    destinatarioId: String(s.destinatarioId),
    articuloId: s.articuloId,
    articuloOfrecidoId: s.articuloOfrecidoId,
  }));
}

function formatearSolicitud(s, setFavoritos = new Set(), usuarioId = null, pubMap = new Map(), userMap = new Map()) {
  const artId = s.articuloId ? String(s.articuloId) : '';
  const artOfrecidoId = s.articuloOfrecidoId ? String(s.articuloOfrecidoId) : '';
  const isOwner = usuarioId ? String(s.destinatarioId) === String(usuarioId) : false;
  const artSolicitado = pubMap.get(artId);
  const artOfrecido = pubMap.get(artOfrecidoId);

  const solicitante = userMap.get(String(s.solicitanteId));
  const destinatario = userMap.get(String(s.destinatarioId));

  const targetUserId = isOwner ? String(s.solicitanteId) : String(s.destinatarioId);
  const targetUserName = isOwner
    ? (solicitante?.nombre || s.author || 'Usuario')
    : (destinatario?.nombre || artSolicitado?.author || 'Usuario');
  const targetUserAvatarUrl = isOwner
    ? (solicitante?.avatarUrl || '')
    : (destinatario?.avatarUrl || '');

  return {
    id: String(s._id),
    _id: s._id,
    type: String(s.type).toUpperCase().includes('INTER') ? 'INTERCAMBIO' : 'DONACIÓN',
    title: s.title || artSolicitado?.title || 'Artículo',
    author: s.author,
    message: s.message,
    date: s.date || 'Reciente',
    status: s.status,
    articuloId: artId,
    articuloOfrecidoId: artOfrecidoId || undefined,
    articuloOfrecidoTitle: artOfrecido?.title || undefined,
    articuloSolicitadoTitle: artSolicitado?.title || s.title || undefined,
    solicitanteId: String(s.solicitanteId),
    destinatarioId: String(s.destinatarioId),
    targetUserId,
    targetUserName,
    targetUserAvatarUrl,
    authorAvatarUrl: solicitante?.avatarUrl || '',
    calificacion: s.calificacion ?? null,
    isFavorite: Boolean(artId && setFavoritos.has(artId)),
    isOwner,
    donationRole: isOwner ? 'DONASTE' : 'RECIBISTE',
  };
}

async function listarDeUsuario(usuarioId) {
  const [enviadas, recibidas, historial, favoritos, favoritosDocs] = await Promise.all([
    Solicitud.find({ solicitanteId: usuarioId, status: { $in: ESTADOS_EN_CURSO } }).sort({ createdAt: -1 }),
    Solicitud.find({ destinatarioId: usuarioId, status: { $in: ESTADOS_EN_CURSO } }).sort({ createdAt: -1 }),
    Solicitud.find({
      $or: [{ solicitanteId: usuarioId }, { destinatarioId: usuarioId }],
      status: { $in: ESTADOS_HISTORIAL },
    }).sort({ createdAt: -1 }),
    Favorito.countDocuments({ usuarioId }),
    Favorito.find({ usuarioId }, 'articuloId'),
  ]);

  const setFavoritos = new Set((favoritosDocs || []).map((f) => String(f.articuloId)));

  const allSolicitudes = [...enviadas, ...recibidas, ...historial];
  const allArtIds = [
    ...new Set(
      allSolicitudes
        .flatMap((s) => [s.articuloId, s.articuloOfrecidoId])
        .filter(Boolean)
    ),
  ];

  const allUserIds = [
    ...new Set(
      allSolicitudes
        .flatMap((s) => [s.solicitanteId, s.destinatarioId])
        .filter(Boolean)
        .map(String)
    ),
  ];

  const [publicaciones, usuarios] = await Promise.all([
    Publicacion.find({ _id: { $in: allArtIds } }),
    Usuario.find({ _id: { $in: allUserIds } }, 'nombre avatarUrl'),
  ]);

  const pubMap = new Map(publicaciones.map((p) => [String(p._id), p]));
  const userMap = new Map(usuarios.map((u) => [String(u._id), u]));

  return {
    enviadas: enviadas.map((s) => formatearSolicitud(s, setFavoritos, usuarioId, pubMap, userMap)),
    recibidas: recibidas.map((s) => formatearSolicitud(s, setFavoritos, usuarioId, pubMap, userMap)),
    historial: historial.map((s) => formatearSolicitud(s, setFavoritos, usuarioId, pubMap, userMap)),
    favoritos,
  };
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
  const califNum = Math.round(Number(calificacion));
  if (!Number.isInteger(califNum) || califNum < 1 || califNum > 5) {
    throw new HttpError(400, 'La calificación debe ser un número entero entre 1 y 5');
  }

  const solicitud = await Solicitud.findById(id);
  if (!solicitud) throw new HttpError(404, 'Solicitud no encontrada');
  if (usuarioId && String(solicitud.destinatarioId) !== String(usuarioId)) {
    throw new HttpError(403, 'Solo quien recibió la solicitud puede confirmar el intercambio');
  }
  if (solicitud.type !== 'INTERCAMBIO' || !['Pendiente', 'Aceptado'].includes(solicitud.status)) {
    throw new HttpError(409, 'Este intercambio ya no se puede confirmar');
  }
  const solicitante = await Usuario.findById(solicitud.solicitanteId);
  if (!solicitante) throw new HttpError(404, 'El usuario solicitante ya no existe');

  const query = {
    _id: id,
    type: 'INTERCAMBIO',
    status: { $in: ['Pendiente', 'Aceptado'] },
  };
  if (usuarioId) {
    query.destinatarioId = usuarioId;
  }

  const actualizada = await Solicitud.findOneAndUpdate(
    query,
    { $set: { status: 'Donado', calificacion: califNum } },
    { new: true, runValidators: true }
  );
  if (!actualizada) throw new HttpError(409, 'Este intercambio ya no se puede confirmar');

  if (solicitud.articuloId) {
    await Publicacion.updateOne({ _id: solicitud.articuloId }, { $set: { status: 'Intercambiado' } });
  }
  if (solicitud.articuloOfrecidoId) {
    await Publicacion.updateOne({ _id: solicitud.articuloOfrecidoId }, { $set: { status: 'Intercambiado' } });
  }

  const cantidadCalificaciones = solicitante.ratingCount || 0;
  solicitante.rating =
    (solicitante.rating * cantidadCalificaciones + califNum) / (cantidadCalificaciones + 1);
  solicitante.ratingCount = cantidadCalificaciones + 1;
  await solicitante.save();

  return formatearSolicitud(actualizada);
}

async function eliminar(id, usuarioId) {
  const solicitud = await Solicitud.findById(id);
  if (!solicitud) throw new HttpError(404, 'Solicitud no encontrada');
  if (
    usuarioId &&
    String(solicitud.solicitanteId) !== String(usuarioId) &&
    String(solicitud.destinatarioId) !== String(usuarioId)
  ) {
    throw new HttpError(403, 'No tienes permiso para eliminar esta solicitud');
  }
  await Solicitud.findByIdAndDelete(id);
}

module.exports = {
  listar,
  listarDeUsuario,
  obtener,
  crear,
  actualizarEstado,
  confirmarIntercambio,
  eliminar,
};
