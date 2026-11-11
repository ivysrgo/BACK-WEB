const Publicacion = require('../models/publicacion.models');
const HttpError = require('../utils/HttpError');

function escaparRegExp(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function esAdministrador(usuario) {
  return usuario.role === 'admin' || usuario.role === 'Administrador';
}

function verificarPropietario(publicacion, usuario) {
  if (esAdministrador(usuario)) return;
  if (String(publicacion.usuarioId) !== String(usuario._id)) {
    throw new HttpError(404, 'Publicación no encontrada');
  }
}

function leerFiltroTexto(valor, campo) {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string') {
    throw new HttpError(400, `El filtro ${campo} debe ser texto`);
  }
  return valor.trim();
}

async function listar(filtros = {}) {
  const query = {};
  const categoria = leerFiltroTexto(filtros.categoria, 'categoria');
  const estado = leerFiltroTexto(filtros.estado, 'estado');
  const modalidad = leerFiltroTexto(filtros.modalidad, 'modalidad');

  // Filtro por categoría (ej: 'ROPA', 'LIBROS', 'CALZADO')
  if (categoria && categoria.toLowerCase() !== 'todas') {
    const categoriaNormalizada = categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const aliases = {
      ropa: /^ROPA$/i,
      libros: /^LIBROS?$/i,
      utiles: /^[ÚU]?TILES?(?: ESCOLARES?)?$/i,
      'utiles escolares': /^[ÚU]?TILES?(?: ESCOLARES?)?$/i,
      muebles: /^MUEBLES?(?: PEQUEÑOS?)?$/i,
      'muebles pequenos': /^MUEBLES?(?: PEQUEÑOS?)?$/i,
    };
    query.category = aliases[categoriaNormalizada] || new RegExp(`^${escaparRegExp(categoria)}$`, 'i');
  }

  // Filtro por estado (ej: 'Disponible', 'Reservado', 'Donado', 'Caducado')
  if (estado && estado.toLowerCase() !== 'todos') {
    query.status = estado;
  }

  // Filtro por modalidad (ej: 'Donación', 'Intercambio')
  if (modalidad && modalidad.toLowerCase() !== 'todas') {
    query.modality = new RegExp(`^${escaparRegExp(modalidad)}$`, 'i');
  }

  // Búsqueda general (q o busqueda)
  const termino = leerFiltroTexto(filtros.q ?? filtros.busqueda, 'q');
  if (termino) {
    const regExp = new RegExp(escaparRegExp(termino), 'i');
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

async function listarPorUsuario(usuarioId) {
  return await Publicacion.find({ usuarioId }).sort({ createdAt: -1 });
}

async function obtener(id) {
  const publicacion = await Publicacion.findById(id);
  if (!publicacion) {
    throw new HttpError(404, 'Publicación no encontrada');
  }
  return publicacion;
}

async function crear(datos, usuario) {
  const nueva = new Publicacion({
    ...datos,
    author: usuario.nombre,
    usuarioId: usuario._id,
    status: 'Disponible',
    requests: 0,
    daysElapsed: 0,
  });
  return await nueva.save();
}

async function actualizar(id, cambios, usuario) {
  const publicacion = await Publicacion.findById(id);
  if (!publicacion) {
    throw new HttpError(404, 'Publicación no encontrada');
  }

  verificarPropietario(publicacion, usuario);
  Object.assign(publicacion, cambios);
  return await publicacion.save();
}

async function eliminar(id, usuario) {
  const publicacion = await Publicacion.findById(id);
  if (!publicacion) {
    throw new HttpError(404, 'Publicación no encontrada');
  }

  verificarPropietario(publicacion, usuario);
  await publicacion.deleteOne();
  return publicacion;
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
  listarPorUsuario,
  obtener,
  crear,
  actualizar,
  eliminar,
  sembrarDatosIniciales,
};
