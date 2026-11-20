const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.models');
const HttpError = require('../utils/HttpError');

const JWT_SECRET = process.env.JWT_SECRET || 'eco_golgi_jwt_super_secret_key_2026_secureroles';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const MAX_INTENTOS = 3;
const MINUTOS_BLOQUEO = 15;
const MENSAJE_BLOQUEO = `Demasiados intentos fallidos. Tu cuenta está bloqueada por ${MINUTOS_BLOQUEO} minutos; intenta más tarde o restablece tu contraseña.`;

function calificacionDel(usuario) {
  return usuario.ratingCount > 0 ? usuario.rating : 0;
}

/**
 * Autentica un usuario verificando credenciales, estado de bloqueo y emite un token JWT real.
 */
async function login({ correo, contrasena }) {
  const usuario = await Usuario.findOne({ correo: correo.toLowerCase().trim() });

  if (!usuario) {
    throw new HttpError(401, 'Credenciales incorrectas');
  }

  if (usuario.suspendido) {
    throw new HttpError(403, 'Tu cuenta fue suspendida por un administrador');
  }

  // Verificar si la cuenta se encuentra bloqueada por intentos fallidos
  if (usuario.estaBloqueado()) {
    throw new HttpError(403, MENSAJE_BLOQUEO);
  }
  if (usuario.bloqueado) {
    // El bloqueo ya venció: se reinicia el contador
    usuario.bloqueado = false;
    usuario.bloqueadoHasta = null;
    usuario.intentosFallidos = 0;
  }

  const esValida = await usuario.compararContrasena(contrasena);

  if (!esValida) {
    usuario.intentosFallidos = (usuario.intentosFallidos || 0) + 1;
    if (usuario.intentosFallidos >= MAX_INTENTOS) {
      usuario.bloqueado = true;
      usuario.bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60_000);
      await usuario.save();
      throw new HttpError(403, MENSAJE_BLOQUEO);
    }
    await usuario.save();
    throw new HttpError(401, 'Credenciales incorrectas');
  }

  usuario.intentosFallidos = 0;
  usuario.bloqueado = false;
  usuario.bloqueadoHasta = null;
  await usuario.save();

  const rolNormalizado =
    usuario.role === 'Administrador' || usuario.role === 'admin'
      ? 'admin'
      : 'user';

  const token = jwt.sign(
    {
      id: usuario.id,
      correo: usuario.correo,
      role: rolNormalizado,
      nombre: usuario.nombre,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      role: rolNormalizado,
      phone: usuario.phone,
      rating: calificacionDel(usuario),
      avatarUrl: usuario.avatarUrl,
    },
  };
}

/**
 * Registra un nuevo usuario en la plataforma. Por defecto, siempre es rol 'user' (usuario regular).
 */
async function registrar({ nombre, correo, contrasena, phone }) {
  const correoLimpio = correo.toLowerCase().trim();
  const existe = await Usuario.findOne({ correo: correoLimpio });

  if (existe) {
    throw new HttpError(409, 'El correo electrónico ya está registrado');
  }

  const nuevoUsuario = new Usuario({
    nombre: nombre.trim(),
    correo: correoLimpio,
    contrasena,
    phone: phone ? String(phone).trim() : '',
    role: 'user',
    rating: 0,
    ratingCount: 0,
  });

  await nuevoUsuario.save();

  const token = jwt.sign(
    {
      id: nuevoUsuario.id,
      correo: nuevoUsuario.correo,
      role: 'user',
      nombre: nuevoUsuario.nombre,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    usuario: {
      id: nuevoUsuario.id,
      nombre: nuevoUsuario.nombre,
      correo: nuevoUsuario.correo,
      role: 'user',
      phone: nuevoUsuario.phone,
      rating: calificacionDel(nuevoUsuario),
    },
  };
}

/**
 * Obtiene el perfil del usuario autenticado a partir de su ID.
 */
async function obtenerPerfil(usuarioId) {
  const usuario = await Usuario.findById(usuarioId);
  if (!usuario) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  const rolNormalizado =
    usuario.role === 'Administrador' || usuario.role === 'admin'
      ? 'admin'
      : 'user';

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    role: rolNormalizado,
    phone: usuario.phone,
    rating: calificacionDel(usuario),
    avatarUrl: usuario.avatarUrl,
  };
}

/**
 * Solicita PIN de recuperación de contraseña.
 */
async function solicitarRecuperacion(correo) {
  const usuario = await Usuario.findOne({ correo: correo.toLowerCase().trim() });
  if (!usuario) {
    throw new HttpError(404, 'No existe una cuenta registrada con ese correo electrónico');
  }

  const pin = '1234';
  usuario.pinRecuperacion = pin;
  await usuario.save();

  return {
    mensaje: 'PIN de recuperación enviado exitosamente al correo',
    pinSimulado: pin,
  };
}

/**
 * Valida el PIN de recuperación de contraseña.
 */
async function verificarCodigo(correo, pin) {
  const usuario = await Usuario.findOne({ correo: correo.toLowerCase().trim() });
  if (!usuario) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  if (!usuario.pinRecuperacion || usuario.pinRecuperacion !== pin.trim()) {
    throw new HttpError(400, 'El PIN ingresado es incorrecto o ha expirado');
  }

  return {
    mensaje: 'Código verificado correctamente',
  };
}

/**
 * Restablece la contraseña del usuario y desbloquea la cuenta.
 */
async function restablecerContrasena(correo, pin, nuevaContrasena) {
  const usuario = await Usuario.findOne({ correo: correo.toLowerCase().trim() });
  if (!usuario) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  if (usuario.pinRecuperacion && usuario.pinRecuperacion !== pin.trim()) {
    throw new HttpError(400, 'PIN inválido');
  }

  usuario.contrasena = nuevaContrasena;
  usuario.pinRecuperacion = null;
  usuario.bloqueado = false;
  usuario.bloqueadoHasta = null;
  usuario.intentosFallidos = 0;
  await usuario.save();

  return {
    mensaje: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.',
  };
}

/**
 * Cambia la contraseña de un usuario autenticado verificando primero la actual.
 */
async function cambiarContrasena(usuarioId, contrasenaActual, nuevaContrasena) {
  const usuario = await Usuario.findById(usuarioId);
  if (!usuario) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  const esValida = await usuario.compararContrasena(contrasenaActual);
  if (!esValida) {
    throw new HttpError(400, 'La contraseña actual no es correcta');
  }

  // El hook pre-save la hashea con bcrypt
  usuario.contrasena = nuevaContrasena;
  await usuario.save();

  return {
    mensaje: 'Contraseña actualizada correctamente',
  };
}

/**
 * Actualiza el perfil del usuario autenticado (nombre, correo, phone, avatarUrl).
 */
async function actualizarPerfil(usuarioId, { nombre, correo, phone, avatarUrl }) {
  const usuario = await Usuario.findById(usuarioId);
  if (!usuario) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  if (correo !== undefined) {
    const correoLimpio = String(correo).toLowerCase().trim();
    if (correoLimpio && correoLimpio !== usuario.correo) {
      const existe = await Usuario.findOne({ correo: correoLimpio, _id: { $ne: usuarioId } });
      if (existe) {
        throw new HttpError(409, 'El correo electrónico ya está registrado por otro usuario');
      }
      usuario.correo = correoLimpio;
    }
  }

  if (nombre !== undefined && String(nombre).trim()) {
    usuario.nombre = String(nombre).trim();
  }

  if (phone !== undefined) {
    usuario.phone = String(phone).trim();
  }

  if (avatarUrl !== undefined) {
    usuario.avatarUrl = String(avatarUrl).trim();
  }

  await usuario.save();

  const rolNormalizado =
    usuario.role === 'Administrador' || usuario.role === 'admin'
      ? 'admin'
      : 'user';

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    role: rolNormalizado,
    phone: usuario.phone,
    rating: calificacionDel(usuario),
    avatarUrl: usuario.avatarUrl,
  };
}

/**
 * Obtiene el perfil público de un usuario por su ID, incluyendo sus publicaciones activas.
 */
async function obtenerPerfilPublico(usuarioId) {
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  const usuario = await Usuario.findById(usuarioId);
  if (!usuario) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  const Publicacion = require('../models/publicacion.models');
  const publicaciones = await Publicacion.find({
    usuarioId: usuario._id,
    status: { $ne: 'Intercambiado' },
  }).sort({ createdAt: -1 });

  const rolNormalizado =
    usuario.role === 'Administrador' || usuario.role === 'admin'
      ? 'admin'
      : 'user';

  return {
    usuario: {
      id: String(usuario._id),
      nombre: usuario.nombre,
      correo: usuario.correo,
      phone: usuario.phone || '',
      rating: calificacionDel(usuario),
      ratingCount: usuario.ratingCount || 0,
      avatarUrl: usuario.avatarUrl || '',
      role: rolNormalizado,
    },
    publicaciones: publicaciones.map((p) => {
      const diasPublicado = p.createdAt
        ? Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86_400_000)
        : 0;
      return {
        id: String(p._id),
        title: p.title,
        category: p.category,
        modality: p.modality,
        description: p.description,
        imageUrl: p.imageUrl,
        imageUrls: p.imageUrls,
        status: p.status,
        condition: p.condition,
        daysElapsed: Math.max(0, diasPublicado),
        expirationDays: p.expirationDays || 30,
        createdAt: p.createdAt,
      };
    }),
  };
}

/**
 * Semillero inicial de usuarios en MongoDB Atlas:
 * 1. Crea el Administrador: admin@ecogolgi.com / Admin123 (role: 'admin')
 * 2. Crea el Usuario normal: juanelpro2005@gmail.com / 123456 (role: 'user')
 */
async function sembrarUsuariosIniciales() {
  try {
    const adminExiste = await Usuario.findOne({ correo: 'admin@ecogolgi.com' });
    if (!adminExiste) {
      console.log('Sembrando usuario Administrador en MongoDB Atlas...');
      await Usuario.create({
        nombre: 'Administrador Eco-Golgi',
        correo: 'admin@ecogolgi.com',
        contrasena: 'Admin123',
        role: 'admin',
        phone: '+57 300 000 0000',
        rating: 0,
        ratingCount: 0,
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      });
      console.log(' Administrador creado: admin@ecogolgi.com / Admin123 (Rol: admin)');
    } else {
      // Si existía con rol descriptivo, aseguramos rol admin
      if (adminExiste.role !== 'admin') {
        adminExiste.role = 'admin';
        await adminExiste.save();
      }
    }

    const userExiste = await Usuario.findOne({ correo: 'juanelpro2005@gmail.com' });
    if (!userExiste) {
      console.log('Sembrando usuario normal en MongoDB Atlas...');
      await Usuario.create({
        nombre: 'Juan José Perez Cespedes',
        correo: 'juanelpro2005@gmail.com',
        contrasena: '123456',
        role: 'user',
        phone: '+57 300 123 4567',
        rating: 0,
        ratingCount: 0,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      });
      console.log('✔ Usuario normal creado: juanelpro2005@gmail.com / 123456 (Rol: user)');
    } else if (userExiste.role === 'Miembro de la comunidad') {
      userExiste.role = 'user';
      await userExiste.save();
    }
  } catch (error) {
    console.error('Error al sembrar usuarios en MongoDB:', error.message);
  }
}

module.exports = {
  login,
  registrar,
  obtenerPerfil,
  actualizarPerfil,
  obtenerPerfilPublico,
  solicitarRecuperacion,
  verificarCodigo,
  restablecerContrasena,
  cambiarContrasena,
  sembrarUsuarioInicial: sembrarUsuariosIniciales,
  sembrarUsuariosIniciales,
};