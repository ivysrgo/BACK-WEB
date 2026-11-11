const HttpError = require('../utils/HttpError');

function rutaNoEncontrada(req, res, next) {
  next(new HttpError(404, 'Ruta no encontrada'));
}

function manejarErrores(err, req, res, next) {
  // 1. Error HTTP explícito
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: err.message,
      mensaje: err.message,
    });
  }

  // 2. Errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    const mensajes = Object.values(err.errors).map((e) => e.message);
    const mensajeFinal = mensajes.join('. ');
    return res.status(400).json({
      error: mensajeFinal,
      mensaje: mensajeFinal,
      errores: mensajes,
    });
  }

  // 3. Error de CastError en Mongoose (ID no válido)
  if (err.name === 'CastError') {
    const mensajeCast = `Identificador no válido: ${err.value}`;
    return res.status(400).json({
      error: mensajeCast,
      mensaje: mensajeCast,
    });
  }

  // 4. Error de clave duplicada en Mongo (E11000)
  if (err.code === 11000) {
    const campo = Object.keys(err.keyPattern || {})[0] || 'campo';
    const mensajeDuplicado = `El valor para el campo '${campo}' ya se encuentra registrado.`;
    return res.status(409).json({
      error: mensajeDuplicado,
      mensaje: mensajeDuplicado,
    });
  }

  // 5. Error de parseo JSON en el cuerpo
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const mensajeSintaxis = 'Error de sintaxis en el formato JSON enviado.';
    return res.status(400).json({
      error: mensajeSintaxis,
      mensaje: mensajeSintaxis,
    });
  }

  if (err.type === 'entity.too.large') {
    const mensaje = 'El tamaño total de las imágenes no debe superar 20 MB.';
    return res.status(413).json({
      error: mensaje,
      mensaje,
    });
  }

  // 6. Error interno no controlado
  console.error('Error no controlado en el servidor:', err);
  const mensajeServidor = 'Error interno del servidor.';
  return res.status(500).json({
    error: mensajeServidor,
    mensaje: mensajeServidor,
  });
}

module.exports = {
  rutaNoEncontrada,
  manejarErrores,
};
