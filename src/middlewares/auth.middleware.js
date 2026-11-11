const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.models');
const HttpError = require('../utils/HttpError');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe configurarse con al menos 32 caracteres.');
}

/**
 * Middleware para verificar la validez del token JWT en peticiones protegidas.
 */
async function verificarToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'No se proporcionó un token de autenticación válido');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw new HttpError(401, 'La sesión ha expirado, por favor inicia sesión nuevamente');
      }
      throw new HttpError(401, 'Token de autenticación inválido o alterado');
    }

    const usuario = await Usuario.findById(decoded.id);

    if (!usuario) {
      throw new HttpError(401, 'El usuario asociado a este token ya no existe');
    }

    if (usuario.bloqueado) {
      throw new HttpError(403, 'Tu cuenta está temporalmente bloqueada. Restablece tu contraseña.');
    }

    // Inyectamos el usuario autenticado en la petición
    req.usuario = usuario;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware opcional: si hay token válido, inyecta req.usuario.
 * Si no hay token o es inválido, continúa sin error dejando req.usuario = null.
 */
async function verificarTokenOpcional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.usuario = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      req.usuario = null;
      return next();
    }

    const usuario = await Usuario.findById(decoded.id);
    req.usuario = usuario && !usuario.bloqueado ? usuario : null;
    next();
  } catch {
    req.usuario = null;
    next();
  }
}

/**
 * Middleware para asegurar que el usuario tenga privilegios de Administrador.
 */
function requerirAdmin(req, res, next) {
  if (!req.usuario) {
    return next(new HttpError(401, 'Usuario no autenticado'));
  }

  const esAdmin = req.usuario.role === 'admin' || req.usuario.role === 'Administrador';

  if (!esAdmin) {
    return next(
      new HttpError(403, 'Acceso denegado: esta acción requiere permisos de administrador')
    );
  }

  next();
}

/**
 * Middleware flexible para validar múltiples roles autorizados.
 */
function requerirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(new HttpError(401, 'Usuario no autenticado'));
    }

    // Normalizar aliases (ej. Administrador -> admin, Miembro de la comunidad -> user)
    const rolActual =
      req.usuario.role === 'Administrador'
        ? 'admin'
        : req.usuario.role === 'Miembro de la comunidad'
        ? 'user'
        : req.usuario.role;

    const permitidosNormalizados = rolesPermitidos.map((r) =>
      r === 'Administrador' ? 'admin' : r === 'Miembro de la comunidad' ? 'user' : r
    );

    if (!permitidosNormalizados.includes(rolActual)) {
      return next(
        new HttpError(
          403,
          `Acceso denegado: tu rol (${rolActual}) no tiene permisos para esta acción`
        )
      );
    }

    next();
  };
}

module.exports = {
  verificarToken,
  verificarTokenOpcional,
  requerirAdmin,
  requerirRol,
};
