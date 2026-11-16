const mongoose = require('mongoose');
const Reporte = require('../models/reporte.models');
const Publicacion = require('../models/publicacion.models');
const Usuario = require('../models/usuario.models');
const HttpError = require('../utils/HttpError');
const publicacionesServicio = require('./publicaciones.service');

const ESTADOS_ACTIVOS_PUBLICACION = ['Disponible', 'Reservado'];

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function idValido(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Muchas publicaciones antiguas no tienen `usuarioId`; en ese caso se intenta
// ubicar al autor por su nombre exacto.
async function buscarAutor(publicacion) {
  if (publicacion.usuarioId) return Usuario.findById(publicacion.usuarioId);
  if (!publicacion.author) return null;
  return Usuario.findOne({ nombre: new RegExp(`^${escaparRegex(publicacion.author.trim())}$`, 'i') });
}

function resumen(reporte) {
  return {
    id: reporte.id,
    estado: reporte.estado,
    motivo: reporte.motivo,
    createdAt: reporte.createdAt,
    resueltoEn: reporte.resueltoEn,
    publicacionId: reporte.publicacionId?.toString() ?? null,
    reportadoId: reporte.reportadoId?.toString() ?? null,
    publicacion: reporte.publicacion,
  };
}

async function crear({ publicacionId, motivo, descripcion = '' }, reportante) {
  if (!idValido(publicacionId)) throw new HttpError(400, 'La publicación no es válida');
  if (!motivo || typeof motivo !== 'string' || !motivo.trim()) {
    throw new HttpError(400, 'Debes indicar el motivo del reporte');
  }

  const publicacion = await Publicacion.findById(publicacionId);
  if (!publicacion) throw new HttpError(404, 'Publicación no encontrada');

  const autor = await buscarAutor(publicacion);
  if (autor && autor.id === reportante.id) {
    throw new HttpError(400, 'No puedes reportar tu propia publicación');
  }

  // Si la misma persona ya tiene un reporte pendiente sobre esta publicación,
  // no se crea uno duplicado.
  const existente = await Reporte.findOne({
    publicacionId,
    reportanteId: reportante.id,
    estado: 'Pendiente',
  });
  if (existente) return resumen(existente);

  const reporte = await Reporte.create({
    publicacionId,
    reportanteId: reportante.id,
    reportadoId: autor?._id ?? null,
    motivo: motivo.trim(),
    descripcion: typeof descripcion === 'string' ? descripcion.trim() : '',
    publicacion: {
      title: publicacion.title,
      modality: publicacion.modality,
      category: publicacion.category,
      condition: publicacion.condition,
      description: publicacion.description,
      author: publicacion.author,
      imageUrl: publicacion.imageUrls?.[0] || publicacion.imageUrl || '',
      tags: publicacion.tags?.length
        ? publicacion.tags
        : [publicacion.talla, publicacion.genero, publicacion.clima].filter(Boolean),
    },
  });
  return resumen(reporte);
}

async function listar(tipo = 'pendientes') {
  const filtro = tipo === 'historial'
    ? { estado: { $in: ['Eliminada', 'Ignorado'] } }
    : { estado: 'Pendiente' };
  const orden = tipo === 'historial' ? { resueltoEn: -1 } : { createdAt: -1 };
  const reportes = await Reporte.find(filtro).sort(orden);
  return reportes.map(resumen);
}

async function obtener(id) {
  if (!idValido(id)) throw new HttpError(404, 'Reporte no encontrado');
  const reporte = await Reporte.findById(id);
  if (!reporte) throw new HttpError(404, 'Reporte no encontrado');

  const [reportante, publicacion] = await Promise.all([
    Usuario.findById(reporte.reportanteId),
    Publicacion.findById(reporte.publicacionId),
  ]);

  let reportado = reporte.reportadoId ? await Usuario.findById(reporte.reportadoId) : null;
  if (!reportado && publicacion) reportado = await buscarAutor(publicacion);

  let estadisticas = { publicacionesActivas: null, reportesPrevios: null, activoDesde: null };
  if (reportado) {
    const [publicacionesActivas, reportesPrevios] = await Promise.all([
      Publicacion.countDocuments({
        status: { $in: ESTADOS_ACTIVOS_PUBLICACION },
        $or: [
          { usuarioId: reportado._id },
          { usuarioId: null, author: new RegExp(`^${escaparRegex(reportado.nombre)}$`, 'i') },
        ],
      }),
      Reporte.countDocuments({ reportadoId: reportado._id, _id: { $ne: reporte._id } }),
    ]);
    estadisticas = { publicacionesActivas, reportesPrevios, activoDesde: reportado.createdAt };
  }

  return {
    ...resumen(reporte),
    descripcion: reporte.descripcion,
    reportante: reportante ? { id: reportante.id, nombre: reportante.nombre } : null,
    reportado: {
      id: reportado?.id ?? null,
      nombre: reportado?.nombre ?? reporte.publicacion?.author ?? 'Usuario desconocido',
      ...estadisticas,
    },
    publicacionExiste: Boolean(publicacion),
    publicacionActual: publicacion
      ? {
          daysElapsed: publicacion.daysElapsed ?? 0,
          expirationDays: publicacion.expirationDays ?? 30,
          status: publicacion.status,
        }
      : null,
  };
}

async function resolverPendientesDe(publicacionId, estado, adminId) {
  await Reporte.updateMany(
    { publicacionId, estado: 'Pendiente' },
    { $set: { estado, resueltoPor: adminId, resueltoEn: new Date() } }
  );
}

async function ignorar(id, admin) {
  if (!idValido(id)) throw new HttpError(404, 'Reporte no encontrado');
  const reporte = await Reporte.findById(id);
  if (!reporte) throw new HttpError(404, 'Reporte no encontrado');
  if (reporte.estado !== 'Pendiente') throw new HttpError(409, 'Este reporte ya fue resuelto');

  reporte.estado = 'Ignorado';
  reporte.resueltoPor = admin._id;
  reporte.resueltoEn = new Date();
  await reporte.save();
  return resumen(reporte);
}

// Elimina la publicación reportada y cierra todos los reportes pendientes
// que existan sobre ella.
async function eliminarPublicacion(id, admin) {
  if (!idValido(id)) throw new HttpError(404, 'Reporte no encontrado');
  const reporte = await Reporte.findById(id);
  if (!reporte) throw new HttpError(404, 'Reporte no encontrado');
  if (reporte.estado !== 'Pendiente') throw new HttpError(409, 'Este reporte ya fue resuelto');

  const publicacion = await Publicacion.findById(reporte.publicacionId);
  if (publicacion) await publicacionesServicio.eliminar(publicacion.id);

  await resolverPendientesDe(reporte.publicacionId, 'Eliminada', admin._id);
  return resumen(await Reporte.findById(id));
}

module.exports = {
  crear,
  listar,
  obtener,
  ignorar,
  eliminarPublicacion,
  resolverPendientesDe,
};
