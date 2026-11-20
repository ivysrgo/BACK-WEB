const Publicacion = require('../models/publicacion.models');
const Solicitud = require('../models/solicitud.models');
const Favorito = require('../models/favorito.models');
const HttpError = require('../utils/HttpError');
const { guardarImagenesPublicacion, eliminarImagenesPublicacion } = require('../utils/imagenesPublicacion');

async function listar(filtros = {}) {
  const query = {};

  // Filtro por categoría (ej: 'ROPA', 'LIBROS', 'CALZADO')
  if (filtros.categoria && filtros.categoria !== 'Todas' && filtros.categoria !== 'TODAS') {
    query.category = new RegExp(`^${filtros.categoria.trim()}$`, 'i');
  }

  // Filtro por estado (ej: 'Disponible', 'Reservado', 'Donado', 'Caducado')
  if (filtros.estado && filtros.estado !== 'Todos' && filtros.estado !== 'TODOS') {
    query.status = filtros.estado;
  } else {
    query.status = { $ne: 'Intercambiado' };
  }

  // Filtro por modalidad (ej: 'Donación', 'Intercambio')
  if (filtros.modalidad && filtros.modalidad !== 'Todas') {
    query.modality = new RegExp(`^${filtros.modalidad.trim()}$`, 'i');
  }

  // Búsqueda general (q o busqueda)
  const termino = filtros.q || filtros.busqueda;
  if (termino && termino.trim() !== '') {
    const regExp = new RegExp(termino.trim(), 'i');
    query.$or = [
      { title: regExp },
      { description: regExp },
      { details: regExp },
      { category: regExp },
      { tags: regExp },
      { author: regExp },
    ];
  }

  return await Publicacion.find(query).sort({ createdAt: -1 });
}

async function listarDeUsuario(usuarioId) {
  return await Publicacion.find({
    usuarioId,
    status: { $ne: 'Intercambiado' },
  }).sort({ createdAt: -1 });
}

async function obtener(id) {
  const publicacion = await Publicacion.findById(id);
  if (!publicacion) {
    throw new HttpError(404, 'Publicación no encontrada');
  }
  return publicacion;
}

async function crear(datos) {
  const { images, ...datosPublicacion } = datos;
  const imagenesGuardadas = images?.length
    ? await guardarImagenesPublicacion(images)
    : [];
  const urls = imagenesGuardadas.map((imagen) => imagen.url);

  try {
    const nueva = new Publicacion({
      ...datosPublicacion,
      ...(urls.length > 0 ? { imageUrl: urls[0], imageUrls: urls } : {}),
    });
    return await nueva.save();
  } catch (error) {
    await eliminarImagenesPublicacion(imagenesGuardadas);
    throw error;
  }
}

async function actualizar(id, cambios, usuario) {
  const publicacion = await Publicacion.findById(id);
  if (!publicacion) {
    throw new HttpError(404, 'Publicación no encontrada');
  }

  // Validación de permisos si se provee usuario
  if (usuario) {
    const esAdmin = usuario.role === 'admin' || usuario.role === 'Administrador';
    const esDuenio = publicacion.usuarioId && publicacion.usuarioId.toString() === (usuario._id || usuario.id).toString();
    const coincideAutor = publicacion.author && usuario.nombre && publicacion.author.toLowerCase() === usuario.nombre.toLowerCase();

    if (!esAdmin && publicacion.usuarioId && !esDuenio && !coincideAutor) {
      throw new HttpError(403, 'No tienes permisos para modificar esta publicación');
    }
  }

  const estadoAnterior = publicacion.status;
  Object.assign(publicacion, cambios);
  const actualizada = await publicacion.save();

  // Si el artículo fue donado a Unidona, se crea una notificación para el propietario
  if (cambios.status === 'Donado' && estadoAnterior !== 'Donado') {
    const targetUserId = publicacion.usuarioId || (usuario ? (usuario._id || usuario.id) : null);
    if (targetUserId) {
      await notificacionesService.crearNotificacion({
        usuarioId: targetUserId,
        title: 'Artículo donado a Unidona',
        message: `Tu artículo "${publicacion.title}" ha sido escalado exitosamente a la red de Unidona.`,
        type: 'donacion',
        referenciaId: publicacion.id,
        link: '/publicaciones',
      });
    }
  }

  return actualizada;
}

async function eliminar(id, usuario) {
  const publicacion = await Publicacion.findById(id);
  if (!publicacion) {
    throw new HttpError(404, 'Publicación no encontrada');
  }

  if (usuario && usuario.role !== 'admin' && usuario.role !== 'Administrador') {
    if (publicacion.usuarioId && String(publicacion.usuarioId) !== String(usuario._id || usuario.id)) {
      throw new HttpError(403, 'No tienes permiso para eliminar esta publicación');
    }
  }

  if (Array.isArray(publicacion.imageUrls) && publicacion.imageUrls.length > 0) {
    try {
      await eliminarImagenesPublicacion(publicacion.imageUrls);
    } catch (e) {
      console.warn('Error al limpiar imágenes de publicación eliminada:', e.message);
    }
  }

  await Favorito.deleteMany({ articuloId: id });
  const eliminada = await Publicacion.findByIdAndDelete(id);
  return eliminada;
}

// Sembrar publicaciones de ejemplo (src/seeds/publicaciones.seed.json).
// Inserta solo las que aún no existen (por `codigo`), así se pueden agregar
// productos nuevos al JSON sin borrar la base ni duplicar los que ya están.
async function sembrarDatosIniciales() {
  try {
    const semillas = require('../seeds/publicaciones.seed.json');
    const existentes = await Publicacion.distinct('codigo', {
      codigo: { $in: semillas.map((semilla) => semilla.codigo) },
    });
    const faltantes = semillas.filter((semilla) => !existentes.includes(semilla.codigo));

    if (faltantes.length > 0) {
      await Publicacion.insertMany(faltantes);
      console.log(`✔ ${faltantes.length} publicaciones semilla agregadas a MongoDB.`);
    }
  } catch (error) {
    console.error('Error al sembrar publicaciones:', error.message);
  }
}

async function obtenerEstadisticas() {
  const [
    articulosDisponibles,
    intercambiosSolicitud,
    intercambiosPublicacion,
    donacionesSolicitud,
    donacionesPublicacion,
    caducadosPublicacion,
  ] = await Promise.all([
    Publicacion.countDocuments({ status: { $nin: ['Donado', 'Intercambiado'] } }),
    Solicitud.countDocuments({
      type: { $regex: /inter/i },
      status: { $in: ['Donado', 'Aceptado'] },
    }),
    Publicacion.countDocuments({
      modality: { $regex: /inter/i },
      status: { $in: ['Donado', 'Intercambiado'] },
    }),
    Solicitud.countDocuments({
      type: { $regex: /dona/i },
      status: 'Donado',
    }),
    Publicacion.countDocuments({
      modality: { $regex: /dona/i },
      status: 'Donado',
    }),
    Publicacion.countDocuments({
      status: 'Caducado',
    }),
  ]);

  const intercambiosLocales = Math.max(intercambiosSolicitud, intercambiosPublicacion);
  const escaladosUnidona = Math.max(
    donacionesSolicitud + caducadosPublicacion,
    donacionesPublicacion + caducadosPublicacion
  );
  const totalCirculados = articulosDisponibles + intercambiosLocales + escaladosUnidona;
  const residuosEvitadosKg = Math.round(totalCirculados * 2.5);

  return {
    articulosDisponibles,
    intercambiosLocales,
    escaladosUnidona,
    residuosEvitadosKg,
  };
}

module.exports = {
  listar,
  listarDeUsuario,
  obtener,
  crear,
  actualizar,
  eliminar,
  sembrarDatosIniciales,
  obtenerEstadisticas,
};
