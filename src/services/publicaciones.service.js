const Publicacion = require('../models/publicacion.models');
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

async function actualizar(id, cambios) {
  const actualizada = await Publicacion.findByIdAndUpdate(id, cambios, {
    new: true,
    runValidators: true,
  });

  if (!actualizada) {
    throw new HttpError(404, 'Publicación no encontrada');
  }

  return actualizada;
}

async function eliminar(id) {
  const eliminada = await Publicacion.findByIdAndDelete(id);
  if (!eliminada) {
    throw new HttpError(404, 'Publicación no encontrada');
  }
  return eliminada;
}

// Sembrar datos iniciales si la colección está vacía
async function sembrarDatosIniciales() {
  try {
    const conteo = await Publicacion.countDocuments();
    if (conteo === 0) {
      console.log('Sembrando publicaciones iniciales en MongoDB...');
      const publicacionesDemo = [
        {
          title: 'Chaqueta de Jean Oversize',
          category: 'ROPA',
          modality: 'Intercambio',
          condition: 'Como nuevo',
          description: 'Chaqueta de jean estilo oversize vintage, excelente tela y corte amplio.',
          details: 'Talla M · Como nuevo · Chapinero, Bogotá',
          requests: 4,
          status: 'Disponible',
          daysElapsed: 12,
          imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=80',
          author: 'Camila Rojas',
          publishedAt: '2026-10-14',
          tags: ['chaqueta', 'jean', 'vintage', 'oversize'],
          talla: 'M',
          genero: 'Unisex',
          clima: 'Frío',
          autorizaDonacion: true,
          codigo: 'PRN-001',
          categoriaPrenda: 'Chaquetas',
          modalidad: 'INTERCAMBIO',
          estadoFisico: 'Como nuevo',
          ubicacion: 'Chapinero, Bogotá',
        },
        {
          title: 'Camiseta Básica Algodón Orgánico',
          category: 'ROPA',
          modality: 'Donación',
          condition: 'Buen Estado',
          description: 'Camiseta blanca 100% algodón suave y transpirable para uso diario.',
          details: 'Talla S · Buen estado · Teusaquillo, Bogotá',
          requests: 2,
          status: 'Reservado',
          daysElapsed: 26,
          imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=80',
          author: 'Mateo Vargas',
          publishedAt: '2026-09-30',
          tags: ['camiseta', 'algodón', 'básicos'],
          talla: 'S',
          genero: 'Unisex',
          clima: 'Cálido',
          autorizaDonacion: true,
          codigo: 'PRN-002',
          categoriaPrenda: 'Camisetas',
          modalidad: 'DONACIÓN',
          estadoFisico: 'Buen estado',
          ubicacion: 'Teusaquillo, Bogotá',
        },
        {
          title: 'Tenis Urbanos Blancos Talla 39',
          category: 'CALZADO',
          modality: 'Intercambio',
          condition: 'Buen Estado',
          description: 'Zapatillas urbanas cómodas con suela de goma reforzada.',
          details: 'Talla 39 · Buen estado · Usaquén, Bogotá',
          requests: 0,
          status: 'Caducado',
          daysElapsed: 30,
          imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80',
          author: 'Valentina Gómez',
          publishedAt: '2026-09-25',
          tags: ['tenis', 'calzado', 'zapatillas'],
          talla: '39',
          genero: 'Unisex',
          clima: 'Templado',
          autorizaDonacion: false,
          codigo: 'PRN-003',
          categoriaPrenda: 'Calzado',
          modalidad: 'INTERCAMBIO',
          estadoFisico: 'Buen estado',
          ubicacion: 'Usaquén, Bogotá',
        },
        {
          title: 'Buso Tejido Lana Gris',
          category: 'ROPA',
          modality: 'Donación',
          condition: 'Nuevo',
          description: 'Buso abrigado de punto gris, ideal para climas templados o fríos.',
          details: 'Talla L · Nuevo con etiqueta · Suba, Bogotá',
          requests: 6,
          status: 'Donado',
          daysElapsed: 30,
          imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&auto=format&fit=crop&q=80',
          author: 'Fundación Unidona',
          publishedAt: '2026-09-20',
          tags: ['buso', 'lana', 'invierno', 'abrigado'],
          talla: 'L',
          genero: 'Unisex',
          clima: 'Frío',
          autorizaDonacion: true,
          codigo: 'PRN-004',
          categoriaPrenda: 'Chaquetas',
          modalidad: 'DONACIÓN',
          estadoFisico: 'Nuevo con etiqueta',
          ubicacion: 'Suba, Bogotá',
        },
      ];

      await Publicacion.insertMany(publicacionesDemo);
      console.log('✔ 4 publicaciones demo sembradas con éxito en MongoDB.');
    }
  } catch (error) {
    console.error('Error al sembrar publicaciones:', error.message);
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  sembrarDatosIniciales,
};
