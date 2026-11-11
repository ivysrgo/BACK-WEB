const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.models');
const HttpError = require('../utils/HttpError');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe configurarse con al menos 32 caracteres.');
}

/**
 * Autentica un usuario verificando credenciales, estado de bloqueo y emite un token JWT real.
 */
async function login({ correo, contrasena }) {
  const usuario = await Usuario.findOne({ correo: correo.toLowerCase().trim() });

  if (!usuario) {
    throw new HttpError(401, 'Credenciales incorrectas');
  }

  // Verificar si la cuenta se encuentra bloqueada por intentos fallidos
  if (usuario.bloqueado) {
    throw new HttpError(403, 'Demasiados intentos, intenta más tarde');
  }

  // Verificar coincidencia de contraseña utilizando bcrypt (con soporte retrocompatible)
  const esValida = await usuario.compararContrasena(contrasena);

  if (!esValida) {
    usuario.intentosFallidos = (usuario.intentosFallidos || 0) + 1;
    if (usuario.intentosFallidos >= 3) {
      usuario.bloqueado = true;
      await usuario.save();
      throw new HttpError(403, 'Demasiados intentos, intenta más tarde');
    }
    await usuario.save();
    throw new HttpError(401, 'Credenciales incorrectas');
  }

  // Reiniciar intentos al autenticar correctamente
  usuario.intentosFallidos = 0;
  usuario.bloqueado = false;
  await usuario.save();

  // Rol normalizado para frontend
  const rolNormalizado =
    usuario.role === 'Administrador' || usuario.role === 'admin'
      ? 'admin'
      : 'user';

  // Generar JWT seguro
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
      rating: usuario.rating,
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
    contrasena, // el pre-save hook de Mongoose se encargará de hashearlo con bcrypt
    phone: phone ? String(phone).trim() : '',
    role: 'user',
    rating: 5,
  });

  await nuevoUsuario.save();

  // Generar token automático al registrarse exitosamente
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
      rating: nuevoUsuario.rating,
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
    rating: usuario.rating,
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

  // Generación de PIN de 4 dígitos (simulado '1234')
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

  // Se asigna la nueva contraseña (el hook pre-save la hasheará con bcrypt)
  usuario.contrasena = nuevaContrasena;
  usuario.pinRecuperacion = null;
  usuario.bloqueado = false;
  usuario.intentosFallidos = 0;
  await usuario.save();

  return {
    mensaje: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.',
  };
}

/**
 * Semillero inicial de usuarios en MongoDB Atlas:
 * 1. Crea el Administrador: admin@ecogolgi.com / Admin123* (role: 'admin')
 * 2. Crea el Usuario normal: juanelpro2005@gmail.com / 123456 (role: 'user')
 */
async function sembrarUsuariosIniciales() {
  try {
    // 1. Verificar o sembrar Administrador
    const adminExiste = await Usuario.findOne({ correo: 'admin@ecogolgi.com' });
    if (!adminExiste) {
      console.log('Sembrando usuario Administrador en MongoDB Atlas...');
      await Usuario.create({
        nombre: 'Administrador Eco-Golgi',
        correo: 'admin@ecogolgi.com',
        contrasena: 'Admin123*',
        role: 'admin',
        phone: '+57 300 000 0000',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      });
      console.log('✔ Administrador creado: admin@ecogolgi.com / Admin123* (Rol: admin)');
    } else {
      // Si existía con rol descriptivo, aseguramos rol admin
      if (adminExiste.role !== 'admin') {
        adminExiste.role = 'admin';
        await adminExiste.save();
      }
    }

    // 2. Verificar o sembrar Usuario Normal de prueba
    const userExiste = await Usuario.findOne({ correo: 'juanelpro2005@gmail.com' });
    if (!userExiste) {
      console.log('Sembrando usuario normal en MongoDB Atlas...');
      await Usuario.create({
        nombre: 'Juan José Perez Cespedes',
        correo: 'juanelpro2005@gmail.com',
        contrasena: '123456',
        role: 'user',
        phone: '+57 300 123 4567',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      });
      console.log('✔ Usuario normal creado: juanelpro2005@gmail.com / 123456 (Rol: user)');
    } else {
      if (userExiste.role === 'Miembro de la comunidad') {
        userExiste.role = 'user';
        await userExiste.save();
      }
    }
  } catch (error) {
    console.error('Error al sembrar usuarios en MongoDB:', error.message);
  }
}

module.exports = {
  login,
  registrar,
  obtenerPerfil,
  solicitarRecuperacion,
  verificarCodigo,
  restablecerContrasena,
  sembrarUsuarioInicial: sembrarUsuariosIniciales,
  sembrarUsuariosIniciales,
};
