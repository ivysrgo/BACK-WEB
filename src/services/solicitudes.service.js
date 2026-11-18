const Solicitud = require('../models/solicitud.models');
const Publicacion = require('../models/publicacion.models');
const notificacionesService = require('./notificaciones.service');
const HttpError = require('../utils/HttpError');

async function listar(filtros = {}, usuario = null) {
  const query = {};

  if (filtros.status) {
    query.status = filtros.status;
  }

  if (filtros.type || filtros.tipo) {
    const t = filtros.type || filtros.tipo;
    query.type = new RegExp(t, 'i');
  }

  if (filtros.esFavorito !== undefined || filtros.isFavorite !== undefined) {
    const fav = filtros.esFavorito !== undefined ? filtros.esFavorito : filtros.isFavorite;
    query.esFavorito = fav === 'true' || fav === true;
  }

  if (filtros.recibidas && usuario) {
    query.$or = [{ propietarioId: usuario._id || usuario.id }, { propietarioId: null }];
  } else if (filtros.enviadas && usuario) {
    query.solicitanteId = usuario._id || usuario.id;
  }

  return await Solicitud.find(query).sort({ createdAt: -1 });
}

async function obtener(id) {
  const solicitud = await Solicitud.findById(id);
  if (!solicitud) {
    throw new HttpError(404, 'Solicitud no encontrada');
  }
  return solicitud;
}

async function crear(datos, usuario = null) {
  const payload = { ...datos };

  if (usuario) {
    payload.author = usuario.nombre || payload.author;
    payload.solicitanteId = usuario._id || usuario.id;
  }

  // Buscar publicación asociada si se suministra articuloId o por coincidencia de título
  let publicacionAsociada = null;
  if (payload.articuloId) {
    try {
      publicacionAsociada = await Publicacion.findById(payload.articuloId);
    } catch {
      // Ignorar error de casting de id
    }
  }

  if (!publicacionAsociada && payload.title) {
    const baseTitle = payload.title.split('·')[0].trim();
    publicacionAsociada = await Publicacion.findOne({
      title: new RegExp(`^${baseTitle}`, 'i'),
    });
  }

  if (publicacionAsociada) {
    payload.articuloId = publicacionAsociada._id.toString();
    payload.propietarioId = publicacionAsociada.usuarioId;

    // Incrementar contador de solicitudes del artículo
    publicacionAsociada.requests = (publicacionAsociada.requests || 0) + 1;
    await publicacionAsociada.save();

    // Notificar al propietario del artículo
    if (publicacionAsociada.usuarioId) {
      const tipoNormalizado = payload.type && payload.type.toUpperCase().includes('INTER') ? 'intercambio' : 'donacion';
      const tituloNotif = tipoNormalizado === 'intercambio'
        ? `Propuesta de intercambio para "${publicacionAsociada.title}"`
        : `Solicitud de donación para "${publicacionAsociada.title}"`;

      await notificacionesService.crearNotificacion({
        usuarioId: publicacionAsociada.usuarioId,
        title: tituloNotif,
        message: `${payload.author} está interesado en tu artículo "${publicacionAsociada.title}": "${payload.message}"`,
        type: tipoNormalizado,
        referenciaId: publicacionAsociada.id,
        link: '/solicitudes/recibidas',
      });
    }
  }

  const nueva = new Solicitud(payload);
  return await nueva.save();
}

async function actualizar(id, cambios, usuario = null) {
  const solicitud = await Solicitud.findById(id);
  if (!solicitud) {
    throw new HttpError(404, 'Solicitud no encontrada');
  }

  const estadoAnterior = solicitud.status;
  Object.assign(solicitud, cambios);
  const actualizada = await solicitud.save();

  // 1. Si la solicitud pasa a 'Aceptado' (Intercambio exitoso)
  if (cambios.status === 'Aceptado' && estadoAnterior !== 'Aceptado') {
    if (solicitud.solicitanteId) {
      await notificacionesService.crearNotificacion({
        usuarioId: solicitud.solicitanteId,
        title: '¡Intercambio Aceptado!',
        message: `¡Tu solicitud para el artículo "${solicitud.title}" ha sido aceptada exitosamente!`,
        type: 'intercambio',
        referenciaId: solicitud.id,
        link: '/solicitudes/enviadas',
      });
    }

    if (solicitud.articuloId) {
      try {
        const pub = await Publicacion.findById(solicitud.articuloId);
        if (pub) {
          pub.status = solicitud.type && solicitud.type.toUpperCase().includes('INTER') ? 'Reservado' : 'Donado';
          await pub.save();
        }
      } catch {
        // En caso de que el ID no sea de mongoose
      }
    }
  }

  // 2. Si la solicitud pasa a 'Rechazado'
  if (cambios.status === 'Rechazado' && estadoAnterior !== 'Rechazado') {
    if (solicitud.solicitanteId) {
      await notificacionesService.crearNotificacion({
        usuarioId: solicitud.solicitanteId,
        title: 'Solicitud no aceptada',
        message: `Tu solicitud para "${solicitud.title}" no fue aceptada en esta ocasión.`,
        type: 'intercambio',
        referenciaId: solicitud.id,
        link: '/solicitudes/enviadas',
      });
    }
  }

  // 3. Si se marca como 'Donado'
  if (cambios.status === 'Donado' && estadoAnterior !== 'Donado') {
    const destinoId = solicitud.propietarioId || (usuario ? (usuario._id || usuario.id) : null);
    if (destinoId) {
      await notificacionesService.crearNotificacion({
        usuarioId: destinoId,
        title: 'Artículo donado a Unidona',
        message: `El artículo "${solicitud.title}" ha sido registrado formalmente como donado a Unidona.`,
        type: 'donacion',
        referenciaId: solicitud.id,
        link: '/publicaciones',
      });
    }
  }

  return actualizada;
}

async function eliminar(id) {
  const eliminada = await Solicitud.findByIdAndDelete(id);
  if (!eliminada) {
    throw new HttpError(404, 'Solicitud no encontrada');
  }
  return eliminada;
}

async function sembrarSolicitudesIniciales() {
  try {
    const conteo = await Solicitud.countDocuments();
    if (conteo === 0) {
      console.log('Sembrando solicitudes iniciales en MongoDB...');
      const solicitudesDemo = [
        {
          type: 'INTERCAMBIO',
          author: 'Camila Rojas',
          title: 'Chaqueta de Jean Oversize · Talla M',
          message: 'Hola, tengo una chaqueta impermeable negra talla M en perfecto estado para intercambiar.',
          date: 'Hace 2 días',
          status: 'Pendiente',
          esFavorito: true,
          daysRemaining: 4,
        },
        {
          type: 'DONACIÓN',
          author: 'Mateo Vargas',
          title: 'Camiseta Básica Algodón Orgánico · Talla S',
          message: 'Me interesa para la jornada de donación universitaria de esta semana en Chapinero.',
          date: 'Hace 5 días',
          status: 'Aceptado',
          esFavorito: true,
          daysRemaining: 12,
        },
        {
          type: 'INTERCAMBIO',
          author: 'Valentina Gómez',
          title: 'Pantalón Cargo Beige · Talla 30',
          message: 'Puedo acercarme a la estación de TransMilenio más cercana para hacer el cambio.',
          date: '12 Oct 2026',
          status: 'Rechazado',
          esFavorito: false,
          daysRemaining: 0,
        },
        {
          type: 'DONACIÓN',
          author: 'Fundación Unidona',
          title: 'Buso Tejido Lana Gris · Talla L',
          message: 'Recibido exitosamente en el punto de recolección del Banco de Ropa Unidona.',
          date: '08 Oct 2026',
          status: 'Donado',
          esFavorito: false,
          daysRemaining: 0,
        },
      ];

      await Solicitud.insertMany(solicitudesDemo);
      console.log('✔ 4 solicitudes demo sembradas con éxito en MongoDB.');
    }
  } catch (error) {
    console.error('Error al sembrar solicitudes:', error.message);
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  sembrarSolicitudesIniciales,
};
