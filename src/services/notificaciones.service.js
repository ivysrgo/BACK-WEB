const Notificacion = require('../models/notificacion.models');
const HttpError = require('../utils/HttpError');

/**
 * Crea una nueva notificación asociada a un usuario específico.
 */
async function crearNotificacion({
  usuarioId,
  title,
  message,
  type = 'intercambio',
  referenciaId = null,
  link = '/publicaciones',
}) {
  if (!usuarioId) return null;

  const notificacion = new Notificacion({
    usuarioId,
    title,
    message,
    type,
    read: false,
    referenciaId,
    link,
  });

  return await notificacion.save();
}

/**
 * Obtiene todas las notificaciones de un usuario, ordenadas de más reciente a más antigua.
 */
async function listarPorUsuario(usuarioId) {
  return await Notificacion.find({ usuarioId }).sort({ createdAt: -1 }).limit(50);
}

/**
 * Retorna el conteo de notificaciones no leídas de un usuario.
 */
async function contarNoLeidas(usuarioId) {
  const count = await Notificacion.countDocuments({ usuarioId, read: false });
  return {
    count,
    hasUnread: count > 0,
  };
}

/**
 * Marca una notificación puntual como leída.
 */
async function marcarComoLeida(id, usuarioId) {
  const notificacion = await Notificacion.findOne({ _id: id, usuarioId });
  if (!notificacion) {
    throw new HttpError(404, 'Notificación no encontrada');
  }

  notificacion.read = true;
  return await notificacion.save();
}

/**
 * Marca todas las notificaciones no leídas de un usuario como leídas.
 */
async function marcarTodasComoLeidas(usuarioId) {
  const res = await Notificacion.updateMany(
    { usuarioId, read: false },
    { $set: { read: true } }
  );

  return {
    mensaje: 'Todas las notificaciones fueron marcadas como leídas',
    modificados: res.modifiedCount,
  };
}

/**
 * Elimina una notificación de un usuario.
 */
async function eliminarNotificacion(id, usuarioId) {
  const notificacion = await Notificacion.findOneAndDelete({ _id: id, usuarioId });
  if (!notificacion) {
    throw new HttpError(404, 'Notificación no encontrada');
  }
  return notificacion;
}

module.exports = {
  crearNotificacion,
  listarPorUsuario,
  contarNoLeidas,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
};
