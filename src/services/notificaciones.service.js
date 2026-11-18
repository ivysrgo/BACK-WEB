const Publicacion = require('../models/publicacion.models');
const Solicitud = require('../models/solicitud.models');
const Reporte = require('../models/reporte.models');

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
 * Arma las notificaciones del usuario o administrador a partir de datos reales de MongoDB.
 */
async function listarDeUsuario(usuarioParam) {
  const usuarioId = typeof usuarioParam === 'object' && usuarioParam !== null
    ? usuarioParam.id || usuarioParam._id
    : usuarioParam;
  const esAdmin = typeof usuarioParam === 'object' && usuarioParam !== null
    ? usuarioParam.role === 'admin' || usuarioParam.role === 'Administrador'
    : false;

  // Si es administrador, construir notificaciones basadas en reportes y caducidades globales reales
  if (esAdmin) {
    const [reportesPendientes, publicacionesComunidad] = await Promise.all([
      Reporte.find({ estado: 'Pendiente' }).sort({ createdAt: -1 }),
      Publicacion.find({ status: 'Disponible' }),
    ]);

    const notificacionesAdmin = [];

    if (reportesPendientes.length > 0) {
      notificacionesAdmin.push({
        id: 'admin-reports',
        type: 'reporte',
        title: 'Reportes pendientes',
        message: `${reportesPendientes.length} reporte(s) requieren moderación administrativa`,
        details: [
          reportesPendientes.length === 1
            ? '1 reporte requiere revisión'
            : `${reportesPendientes.length} reportes requieren revisión`,
        ],
        path: '/admin/reportes',
        link: '/admin/reportes',
        read: false,
      });
    }

    publicacionesComunidad.forEach((pub) => {
      const diasRestantes = Math.max(0, (pub.expirationDays || 30) - diasTranscurridos(pub));
      if (diasRestantes <= 5) {
        notificacionesAdmin.push({
          id: `caducidad-${pub.id}`,
          type: 'caducar',
          title: pub.title,
          message: `${diasRestantes} días restantes antes de caducar`,
          details: [`${diasRestantes} días restantes`],
          path: `/admin/articulo/${pub.id}`,
          link: `/admin/articulo/${pub.id}`,
          read: false,
        });
      }
    });

    return notificacionesAdmin;
  }

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
