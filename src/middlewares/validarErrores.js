const HttpError = require('../utils/HttpError');

function validarCreacionPublicacion(req, res, next) {
  const body = req.body ?? {};

  // Soporte bidireccional (español e inglés)
  const title = body.title ?? body.titulo;
  const category = body.category ?? body.categoria ?? body.categoriaPrenda ?? 'ROPA';
  const modality = body.modality ?? body.modalidad ?? 'Donación';
  const condition = body.condition ?? body.estado ?? body.estadoFisico ?? 'Buen Estado';
  const description = body.description ?? body.descripcion ?? '';
  const details = body.details ?? body.detalles ?? '';
  const imageUrl = body.imageUrl ?? body.imagenUrl ?? body.imagen;
  const images = body.images;
  const talla = body.talla ?? '';
  const genero = body.genero ?? '';
  const clima = body.clima ?? '';
  const autorizaDonacion = body.autorizaDonacion ?? true;
  const tags = body.tags ?? [];

  for (const [field, value] of Object.entries({
    category, modality, condition, description, details, talla, genero, clima,
  })) {
    if (typeof value !== 'string') {
      throw new HttpError(400, `El campo ${field} debe ser texto`);
    }
  }

  if (imageUrl !== undefined && typeof imageUrl !== 'string') {
    throw new HttpError(400, 'La imagen debe enviarse como una URL de texto');
  }
  if (images !== undefined) {
    if (!Array.isArray(images) || images.length < 1 || images.length > 5) {
      throw new HttpError(400, 'Debes subir entre 1 y 5 imágenes');
    }

    let totalBytes = 0;
    for (const image of images) {
      const match = typeof image === 'string'
        ? image.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/)
        : null;
      if (!match) {
        throw new HttpError(400, 'Cada imagen debe ser JPG o PNG válida');
      }

      const bytes = Buffer.from(match[2], 'base64');
      if (bytes.length > 5 * 1024 * 1024) {
        throw new HttpError(400, 'Cada imagen debe pesar máximo 5 MB');
      }
      totalBytes += bytes.length;
      if (totalBytes > 20 * 1024 * 1024) {
        throw new HttpError(400, 'El tamaño total de las imágenes no debe superar 20 MB');
      }
    }
  }
  if (typeof autorizaDonacion !== 'boolean') {
    throw new HttpError(400, 'autorizaDonacion debe ser verdadero o falso');
  }
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
    throw new HttpError(400, 'tags debe ser una lista de textos');
  }

  // Validación de título
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    throw new HttpError(400, 'El título es obligatorio y debe tener al menos 3 caracteres');
  }

  // Normalización hacia el esquema de Mongoose
  req.body = {
    title: title.trim(),
    category: String(category).trim().toUpperCase(),
    modality: modality.toLowerCase().includes('inter') ? 'Intercambio' : 'Donación',
    condition: condition.trim(),
    description: description.trim(),
    details: details.trim(),
    imageUrl: imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? imageUrl.trim() : undefined,
    ...(images !== undefined ? { images } : {}),
    talla: talla.trim(),
    genero: genero.trim(),
    clima: clima.trim(),
    autorizaDonacion,
    tags: tags.map((tag) => tag.trim()),
    // Compatibilidad
    codigo: body.codigo || '',
    categoriaPrenda: body.categoriaPrenda || category,
    modalidad: body.modalidad || modality,
    estadoFisico: body.estadoFisico || condition,
    ubicacion: body.ubicacion || 'Bogotá, Colombia',
  };

  next();
}

function validarCambioPublicacion(req, res, next) {
  const body = req.body ?? {};

  if (!body || Object.keys(body).length === 0) {
    throw new HttpError(400, 'No se enviaron datos para actualizar');
  }

  const cambios = {};
  const texto = (value, campo) => {
    if (typeof value !== 'string') {
      throw new HttpError(400, `El campo ${campo} debe ser texto`);
    }
    return value.trim();
  };

  if (body.title !== undefined || body.titulo !== undefined) {
    const title = body.title ?? body.titulo;
    if (typeof title !== 'string' || title.trim().length < 3) {
      throw new HttpError(400, 'El título debe tener al menos 3 caracteres');
    }
    cambios.title = title.trim();
  }

  if (body.category !== undefined || body.categoria !== undefined) {
    cambios.category = texto(body.category ?? body.categoria, 'category').toUpperCase();
  }

  if (body.modality !== undefined || body.modalidad !== undefined) {
    const mod = texto(body.modality ?? body.modalidad, 'modality');
    cambios.modality = mod.toLowerCase().includes('inter') ? 'Intercambio' : 'Donación';
  }

  if (body.condition !== undefined || body.estado !== undefined || body.estadoFisico !== undefined) {
    cambios.condition = texto(body.condition ?? body.estado ?? body.estadoFisico, 'condition');
  }

  if (body.description !== undefined || body.descripcion !== undefined) {
    cambios.description = texto(body.description ?? body.descripcion, 'description');
  }

  if (body.details !== undefined || body.detalles !== undefined) {
    cambios.details = texto(body.details ?? body.detalles, 'details');
  }

  if (body.status !== undefined || body.estadoPublicacion !== undefined) {
    const st = texto(body.status ?? body.estadoPublicacion, 'status');
    const estadosPermitidos = ['Disponible', 'Reservado', 'Donado', 'Caducado'];
    if (!estadosPermitidos.includes(st)) {
      throw new HttpError(400, `El estado debe ser uno de: ${estadosPermitidos.join(', ')}`);
    }
    cambios.status = st;
  }

  if (body.imageUrl !== undefined || body.imagenUrl !== undefined) {
    cambios.imageUrl = texto(body.imageUrl ?? body.imagenUrl, 'imageUrl');
  }

  if (body.tags !== undefined && Array.isArray(body.tags)) {
    if (body.tags.some((tag) => typeof tag !== 'string')) {
      throw new HttpError(400, 'tags debe ser una lista de textos');
    }
    cambios.tags = body.tags.map((tag) => tag.trim());
  } else if (body.tags !== undefined) {
    throw new HttpError(400, 'tags debe ser una lista de textos');
  }

  if (body.talla !== undefined) cambios.talla = texto(body.talla, 'talla');
  if (body.genero !== undefined) cambios.genero = texto(body.genero, 'genero');
  if (body.clima !== undefined) cambios.clima = texto(body.clima, 'clima');
  if (body.autorizaDonacion !== undefined) {
    if (typeof body.autorizaDonacion !== 'boolean') {
      throw new HttpError(400, 'autorizaDonacion debe ser verdadero o falso');
    }
    cambios.autorizaDonacion = body.autorizaDonacion;
  }

  if (Object.keys(cambios).length === 0) {
    throw new HttpError(400, 'No se enviaron campos válidos para actualizar');
  }

  req.body = cambios;
  next();
}

function validarRegistro(req, res, next) {
  const { nombre, correo, contrasena, phone } = req.body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    throw new HttpError(400, 'El nombre es obligatorio y debe tener al menos 2 caracteres');
  }

  if (!correo || typeof correo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
    throw new HttpError(400, 'El correo electrónico no es válido');
  }

  if (!contrasena || typeof contrasena !== 'string') {
    throw new HttpError(400, 'La contraseña es obligatoria');
  }

  if (contrasena.length < 5) {
    throw new HttpError(400, 'La contraseña debe tener como mínimo 5 caracteres');
  }

  if (!/[A-Z]/.test(contrasena)) {
    throw new HttpError(400, 'La contraseña debe contener al menos una letra mayúscula');
  }

  if (!/[a-z]/.test(contrasena)) {
    throw new HttpError(400, 'La contraseña debe contener al menos una letra minúscula');
  }

  if (!/[0-9]/.test(contrasena)) {
    throw new HttpError(400, 'La contraseña debe contener al menos un número');
  }

  if (!/[^A-Za-z0-9]/.test(contrasena)) {
    throw new HttpError(400, 'La contraseña debe contener al menos un carácter especial');
  }

  req.body.nombre = nombre.trim();
  req.body.correo = correo.trim().toLowerCase();
  req.body.contrasena = contrasena;
  req.body.phone = phone ? String(phone).trim() : '';

  next();
}

function validarLogin(req, res, next) {
  const { correo, contrasena } = req.body ?? {};

  if (!correo || !contrasena) {
    throw new HttpError(400, 'El correo y la contraseña son obligatorios');
  }

  req.body.correo = String(correo).trim().toLowerCase();
  next();
}

function validarCreacionSolicitud(req, res, next) {
  const body = req.body ?? {};
  const title = body.title || body.titulo;
  const message = body.message || body.mensaje;
  const type = body.type || body.tipo || 'DONACIÓN';
  const author = body.author || body.autor || 'Usuario de la comunidad';

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    throw new HttpError(400, 'El título es obligatorio y debe tener al menos 3 caracteres');
  }

  if (!message || typeof message !== 'string' || message.trim().length < 3) {
    throw new HttpError(400, 'El mensaje es obligatorio y debe tener al menos 3 caracteres');
  }

  req.body = {
    title: title.trim(),
    message: message.trim(),
    type: String(type).toUpperCase().includes('INTER') ? 'INTERCAMBIO' : 'DONACIÓN',
    author: author.trim(),
    articuloId: body.articuloId || null,
    articuloOfrecidoId: body.articuloOfrecidoId || null,
    esFavorito: Boolean(body.esFavorito || body.isFavorite),
  };

  next();
}

function validarCambioSolicitud(req, res, next) {
  const body = req.body ?? {};
  if (!body || Object.keys(body).length === 0) {
    throw new HttpError(400, 'No se enviaron datos para actualizar');
  }

  const cambios = {};
  if (body.status !== undefined || body.estado !== undefined) {
    const st = body.status || body.estado;
    const permitidos = ['Pendiente', 'Aceptado', 'Donado', 'Rechazado'];
    if (!permitidos.includes(st)) {
      throw new HttpError(400, `El estado debe ser uno de: ${permitidos.join(', ')}`);
    }
    cambios.status = st;
  }

  if (body.esFavorito !== undefined || body.isFavorite !== undefined) {
    cambios.esFavorito = Boolean(body.esFavorito !== undefined ? body.esFavorito : body.isFavorite);
  }

  if (body.message !== undefined) cambios.message = String(body.message).trim();

  if (Object.keys(cambios).length === 0) {
    throw new HttpError(400, 'No se enviaron campos válidos para actualizar');
  }

  req.body = cambios;
  next();
}

module.exports = {
  validarCreacionPublicacion,
  validarCambioPublicacion,
  validarRegistro,
  validarLogin,
  validarCreacionSolicitud,
  validarCambioSolicitud,
};
