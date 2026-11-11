const HttpError = require('../utils/HttpError');

function validarCreacionPublicacion(req, res, next) {
  const body = req.body ?? {};

  // Soporte bidireccional (español e inglés)
  const title = body.title || body.titulo;
  const category = body.category || body.categoria || body.categoriaPrenda || 'ROPA';
  const modality = body.modality || body.modalidad || 'Donación';
  const condition = body.condition || body.estado || body.estadoFisico || 'Buen Estado';
  const description = body.description || body.descripcion || '';
  const details = body.details || body.detalles || '';
  const author = req.usuario?.nombre || body.author || body.autor || 'Juan José Perez Cespedes';
  const usuarioId = req.usuario?.id || body.usuarioId || null;
  const imageUrl = body.imageUrl || body.imagenUrl || body.imagen;
  const talla = body.talla || '';
  const genero = body.genero || '';
  const clima = body.clima || '';
  const autorizaDonacion = body.autorizaDonacion !== undefined ? Boolean(body.autorizaDonacion) : true;
  const tags = Array.isArray(body.tags) ? body.tags : [];
  const status = body.status || body.estadoPublicacion || 'Disponible';

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
    author: author.trim(),
    usuarioId,
    imageUrl: imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? imageUrl.trim() : undefined,
    talla: talla.trim(),
    genero: genero.trim(),
    clima: clima.trim(),
    autorizaDonacion,
    tags,
    status,
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

  if (body.title !== undefined || body.titulo !== undefined) {
    const title = (body.title || body.titulo);
    if (typeof title !== 'string' || title.trim().length < 3) {
      throw new HttpError(400, 'El título debe tener al menos 3 caracteres');
    }
    cambios.title = title.trim();
  }

  if (body.category !== undefined || body.categoria !== undefined) {
    cambios.category = String(body.category || body.categoria).trim().toUpperCase();
  }

  if (body.modality !== undefined || body.modalidad !== undefined) {
    const mod = String(body.modality || body.modalidad);
    cambios.modality = mod.toLowerCase().includes('inter') ? 'Intercambio' : 'Donación';
  }

  if (body.condition !== undefined || body.estado !== undefined || body.estadoFisico !== undefined) {
    cambios.condition = String(body.condition || body.estado || body.estadoFisico).trim();
  }

  if (body.description !== undefined || body.descripcion !== undefined) {
    cambios.description = String(body.description || body.descripcion).trim();
  }

  if (body.details !== undefined || body.detalles !== undefined) {
    cambios.details = String(body.details || body.detalles).trim();
  }

  if (body.status !== undefined || body.estadoPublicacion !== undefined) {
    const st = String(body.status || body.estadoPublicacion);
    const estadosPermitidos = ['Disponible', 'Reservado', 'Donado', 'Caducado'];
    if (!estadosPermitidos.includes(st)) {
      throw new HttpError(400, `El estado debe ser uno de: ${estadosPermitidos.join(', ')}`);
    }
    cambios.status = st;
  }

  if (body.imageUrl !== undefined || body.imagenUrl !== undefined) {
    cambios.imageUrl = String(body.imageUrl || body.imagenUrl).trim();
  }

  if (body.requests !== undefined) {
    cambios.requests = Number(body.requests);
  }

  if (body.daysElapsed !== undefined) {
    cambios.daysElapsed = Number(body.daysElapsed);
  }

  if (body.tags !== undefined && Array.isArray(body.tags)) {
    cambios.tags = body.tags;
  }

  if (body.talla !== undefined) cambios.talla = String(body.talla).trim();
  if (body.genero !== undefined) cambios.genero = String(body.genero).trim();
  if (body.clima !== undefined) cambios.clima = String(body.clima).trim();
  if (body.autorizaDonacion !== undefined) cambios.autorizaDonacion = Boolean(body.autorizaDonacion);

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
