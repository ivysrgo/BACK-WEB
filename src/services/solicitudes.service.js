const Solicitud = require('../models/solicitud.models');
const HttpError = require('../utils/HttpError');

async function listar(filtros = {}) {
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

  return await Solicitud.find(query).sort({ createdAt: -1 });
}

async function obtener(id) {
  const solicitud = await Solicitud.findById(id);
  if (!solicitud) {
    throw new HttpError(404, 'Solicitud no encontrada');
  }
  return solicitud;
}

async function crear(datos) {
  const nueva = new Solicitud(datos);
  return await nueva.save();
}

async function actualizar(id, cambios) {
  const actualizada = await Solicitud.findByIdAndUpdate(id, cambios, {
    new: true,
    runValidators: true,
  });

  if (!actualizada) {
    throw new HttpError(404, 'Solicitud no encontrada');
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
