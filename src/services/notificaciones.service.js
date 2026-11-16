const Publicacion = require('../models/publicacion.models');
const Solicitud = require('../models/solicitud.models');

// Una publicación se avisa como "próxima a caducar" cuando le quedan estos días o menos
const DIAS_AVISO_CADUCIDAD = 7;
// Las respuestas a solicitudes enviadas se avisan durante estos días
const DIAS_AVISO_RESPUESTA = 14;
const MS_POR_DIA = 86_400_000;

function diasTranscurridos(publicacion) {
  const fecha = new Date(publicacion.publishedAt || publicacion.createdAt);
  const desdeFecha = Number.isNaN(fecha.getTime())
    ? 0
    : Math.floor((Date.now() - fecha.getTime()) / MS_POR_DIA);
  return Math.max(publicacion.daysElapsed || 0, desdeFecha, 0);
}

function textoSolicitudes(cantidad) {
  return cantidad === 1 ? '1 solicitud' : `${cantidad} solicitudes`;
}

/**
 * Arma las notificaciones del usuario a partir de sus propias publicaciones y solicitudes.
 */
async function listarDeUsuario(usuarioId) {
  const limiteRespuestas = new Date(Date.now() - DIAS_AVISO_RESPUESTA * MS_POR_DIA);

  const [publicaciones, pendientesRecibidas, respuestas] = await Promise.all([
    Publicacion.find({ usuarioId, status: { $in: ['Disponible', 'Reservado'] } }),
    Solicitud.find({ destinatarioId: usuarioId, status: 'Pendiente' }, { articuloId: 1 }),
    Solicitud.find({
      solicitanteId: usuarioId,
      status: { $in: ['Aceptado', 'Rechazado'] },
      updatedAt: { $gte: limiteRespuestas },
    }).sort({ updatedAt: -1 }),
  ]);

  const pendientesPorArticulo = new Map();
  pendientesRecibidas.forEach(({ articuloId }) => {
    pendientesPorArticulo.set(articuloId, (pendientesPorArticulo.get(articuloId) || 0) + 1);
  });

  const notificaciones = [];

  publicaciones.forEach((publicacion) => {
    const id = publicacion.id;
    const pendientes = pendientesPorArticulo.get(id) || 0;
    const diasRestantes = Math.max(0, (publicacion.expirationDays || 30) - diasTranscurridos(publicacion));
    const textoCaducidad = diasRestantes === 1 ? '1 día para caducar' : `${diasRestantes} días para caducar`;

    if (pendientes > 0) {
      notificaciones.push({
        id: `solicitudes-${id}`,
        type: 'intercambio',
        title: publicacion.title,
        details: [
          textoSolicitudes(pendientes),
          textoCaducidad,
          publicacion.modality === 'Intercambio' ? 'Oportunidad de intercambio' : 'Oportunidad de donación',
        ],
        path: '/solicitudes/recibidas',
      });
    } else if (diasRestantes <= DIAS_AVISO_CADUCIDAD) {
      notificaciones.push({
        id: `caducidad-${id}`,
        type: 'caducar',
        title: publicacion.title,
        details: ['Sin solicitudes', textoCaducidad, 'Oportunidad de donación a Unidona'],
        path: '/publicaciones',
      });
    }
  });

  respuestas.forEach((solicitud) => {
    notificaciones.push({
      id: `respuesta-${solicitud.id}`,
      type: 'respuesta',
      title: solicitud.title,
      details: [
        solicitud.status === 'Aceptado' ? 'Tu solicitud fue aceptada' : 'Tu solicitud fue rechazada',
      ],
      path: '/solicitudes',
    });
  });

  return notificaciones;
}

module.exports = {
  listarDeUsuario,
};
