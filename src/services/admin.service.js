const mongoose = require('mongoose');
const Usuario = require('../models/usuario.models');
const Publicacion = require('../models/publicacion.models');
const Solicitud = require('../models/solicitud.models');
const Reporte = require('../models/reporte.models');
const HttpError = require('../utils/HttpError');

const ESTADOS_ACTIVOS_PUBLICACION = ['Disponible', 'Reservado'];

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function esAdmin(usuario) {
  return usuario.role === 'admin' || usuario.role === 'Administrador';
}

function calificacionDel(usuario) {
  return usuario.ratingCount > 0 ? usuario.rating : 0;
}

function filtroPublicacionesDe(usuario) {
  return {
    $or: [
      { usuarioId: usuario._id },
      { usuarioId: null, author: new RegExp(`^${escaparRegex(usuario.nombre)}$`, 'i') },
    ],
  };
}

function resumenUsuario(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    role: esAdmin(usuario) ? 'admin' : 'user',
    phone: usuario.phone ?? '',
    rating: calificacionDel(usuario),
    ratingCount: usuario.ratingCount ?? 0,
    avatarUrl: usuario.avatarUrl || '',
    suspendido: Boolean(usuario.suspendido),
    suspendidoEn: usuario.suspendidoEn ?? null,
    createdAt: usuario.createdAt,
  };
}

async function listarUsuarios() {
  const usuarios = await Usuario.find().sort({ createdAt: -1 });
  return usuarios.filter((usuario) => !esAdmin(usuario)).map(resumenUsuario);
}

async function obtenerUsuario(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new HttpError(404, 'Usuario no encontrado');
  const usuario = await Usuario.findById(id);
  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');

  const filtro = filtroPublicacionesDe(usuario);
  const [publicaciones, reportesRecibidos] = await Promise.all([
    Publicacion.find(filtro).sort({ createdAt: -1 }),
    Reporte.countDocuments({ reportadoId: usuario._id }),
  ]);

  return {
    ...resumenUsuario(usuario),
    reportesRecibidos,
    publicacionesActivas: publicaciones.filter((p) => ESTADOS_ACTIVOS_PUBLICACION.includes(p.status)).length,
    publicaciones,
  };
}

async function cambiarSuspension(id, suspender, admin) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new HttpError(404, 'Usuario no encontrado');
  const usuario = await Usuario.findById(id);
  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');
  if (usuario.id === admin.id || esAdmin(usuario)) {
    throw new HttpError(400, 'No se puede suspender una cuenta de administrador');
  }

  usuario.suspendido = Boolean(suspender);
  usuario.suspendidoEn = suspender ? new Date() : null;
  await usuario.save();
  return resumenUsuario(usuario);
}

// Historial de donaciones: solicitudes completadas (estado "Donado") más las
// publicaciones marcadas como donadas que no tengan una solicitud asociada.
async function listarDonaciones({ desde, hasta } = {}) {
  const rango = {};
  if (desde) {
    const fecha = new Date(desde);
    if (!Number.isNaN(fecha.getTime())) rango.$gte = fecha;
  }
  if (hasta) {
    const fecha = new Date(hasta);
    if (!Number.isNaN(fecha.getTime())) {
      fecha.setHours(23, 59, 59, 999);
      rango.$lte = fecha;
    }
  }
  const filtroFecha = Object.keys(rango).length ? { updatedAt: rango } : {};

  const [solicitudes, publicacionesDonadas] = await Promise.all([
    Solicitud.find({ status: 'Donado', ...filtroFecha }).sort({ updatedAt: -1 }),
    Publicacion.find({ status: 'Donado', ...filtroFecha }).sort({ updatedAt: -1 }),
  ]);

  const idsArticulos = solicitudes
    .map((solicitud) => solicitud.articuloId)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  const [articulos, donantes] = await Promise.all([
    Publicacion.find({ _id: { $in: idsArticulos } }),
    Usuario.find({ _id: { $in: solicitudes.map((solicitud) => solicitud.destinatarioId) } }, 'nombre'),
  ]);
  const articuloPorId = new Map(articulos.map((articulo) => [articulo.id, articulo]));
  const donantePorId = new Map(donantes.map((donante) => [donante.id, donante.nombre]));

  const vistos = new Set();
  const donaciones = [];

  for (const solicitud of solicitudes) {
    const articulo = articuloPorId.get(solicitud.articuloId);
    vistos.add(solicitud.articuloId);
    donaciones.push({
      id: solicitud.id,
      articuloId: articulo ? articulo.id : null,
      type: String(solicitud.type).toUpperCase().includes('INTER') ? 'INTERCAMBIO' : 'DONACIÓN',
      title: articulo?.title ?? solicitud.title,
      // Quien donó es el destinatario de la solicitud (dueño de la publicación)
      author: articulo?.author ?? donantePorId.get(String(solicitud.destinatarioId)) ?? 'Usuario de la comunidad',
      category: articulo?.category ?? '',
      description: articulo?.description ?? 'La publicación ya no está disponible.',
      fecha: solicitud.updatedAt,
    });
  }

  for (const publicacion of publicacionesDonadas) {
    if (vistos.has(publicacion.id)) continue;
    donaciones.push({
      id: publicacion.id,
      articuloId: publicacion.id,
      type: String(publicacion.modality).toUpperCase().includes('INTER') ? 'INTERCAMBIO' : 'DONACIÓN',
      title: publicacion.title,
      author: publicacion.author,
      category: publicacion.category,
      description: publicacion.description,
      fecha: publicacion.updatedAt,
    });
  }

  return donaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// El administrador añade días adicionales al tiempo de caducidad de la publicación.
async function actualizarCaducidad(publicacionId, diasSumar) {
  if (!mongoose.Types.ObjectId.isValid(publicacionId)) {
    throw new HttpError(404, 'Publicación no encontrada');
  }
  const dias = Number(diasSumar);
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    throw new HttpError(400, 'Los días a sumar deben ser un número entero entre 1 y 365');
  }

  const publicacion = await Publicacion.findById(publicacionId);
  if (!publicacion) throw new HttpError(404, 'Publicación no encontrada');

  const baseExpiration = publicacion.expirationDays ?? 30;
  publicacion.expirationDays = baseExpiration + dias;
  if (publicacion.status === 'Caducado') publicacion.status = 'Disponible';
  await publicacion.save();
  return publicacion;
}

// Métricas globales reales de la comunidad y del sistema para el panel de administración
async function obtenerMetricas() {
  const [
    donadosComunidad,
    intercambiadosComunidad,
    donadosUnidona,
    reportesComunidad,
    calificaciones,
  ] = await Promise.all([
    Solicitud.countDocuments({ status: 'Donado', type: { $in: ['DONACIÓN', 'Donación'] } }),
    Solicitud.countDocuments({ status: 'Donado', type: { $in: ['INTERCAMBIO', 'Intercambio'] } }),
    Publicacion.countDocuments({ status: { $in: ['Donado', 'Caducado'] } }),
    Reporte.countDocuments({}),
    Solicitud.find({ status: 'Donado', calificacion: { $exists: true, $ne: null } }, 'calificacion'),
  ]);

  let promedio = 5.0;
  if (calificaciones.length > 0) {
    const suma = calificaciones.reduce((acc, c) => acc + (c.calificacion || 0), 0);
    promedio = Number((suma / calificaciones.length).toFixed(1));
  } else {
    const usuariosConRating = await Usuario.find({ rating: { $gt: 0 } }, 'rating');
    if (usuariosConRating.length > 0) {
      const suma = usuariosConRating.reduce((acc, u) => acc + u.rating, 0);
      promedio = Number((suma / usuariosConRating.length).toFixed(1));
    }
  }

  return [
    { id: 'm1', valor: donadosComunidad, descripcion: 'Artículos donados entre la comunidad' },
    { id: 'm2', valor: intercambiadosComunidad, descripcion: 'Artículos intercambiados entre la comunidad' },
    { id: 'm3', valor: donadosUnidona, descripcion: 'Artículos donados a Unidona' },
    { id: 'm4', valor: reportesComunidad, descripcion: 'Reportes de publicaciones de la comunidad' },
    { id: 'm5', valor: promedio, descripcion: 'Calificación promedio de los intercambios de la comunidad' },
  ];
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  cambiarSuspension,
  listarDonaciones,
  actualizarCaducidad,
  obtenerMetricas,
};
