const Usuario = require('../models/usuario.models');
const HttpError = require('../utils/HttpError');

async function login({ correo, contrasena }) {
  const usuario = await Usuario.findOne({ correo: correo.toLowerCase() });

  if (!usuario) {
    throw new HttpError(401, 'Credenciales incorrectas');
  }

  // Verificar si la cuenta se encuentra bloqueada por intentos fallidos
  if (usuario.bloqueado) {
    throw new HttpError(403, 'Demasiados intentos, intenta más tarde');
  }

  // Verificar coincidencia de contraseña
  if (usuario.contrasena !== contrasena) {
    usuario.intentosFallidos += 1;
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

  return {
    token: 'jwt-simulado-' + usuario.id,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      role: usuario.role,
      phone: usuario.phone,
      rating: usuario.rating,
      avatarUrl: usuario.avatarUrl,
    },
  };
}

async function registrar({ nombre, correo, contrasena, phone }) {
  const existe = await Usuario.findOne({ correo: correo.toLowerCase() });
  if (existe) {
    throw new HttpError(409, 'El correo electrónico ya está registrado');
  }

  const nuevoUsuario = new Usuario({
    nombre,
    correo: correo.toLowerCase(),
    contrasena,
    phone: phone || '',
    role: 'Miembro de la comunidad',
    rating: 5,
  });

  await nuevoUsuario.save();

  return {
    id: nuevoUsuario.id,
    nombre: nuevoUsuario.nombre,
    correo: nuevoUsuario.correo,
    role: nuevoUsuario.role,
    phone: nuevoUsuario.phone,
    rating: nuevoUsuario.rating,
  };
}

async function solicitarRecuperacion(correo) {
  const usuario = await Usuario.findOne({ correo: correo.toLowerCase() });
  if (!usuario) {
    throw new HttpError(404, 'No existe una cuenta registrada con ese correo electrónico');
  }

  // Generación de PIN de 4 dígitos (simulado '1234' o dinámico)
  const pin = '1234';
  usuario.pinRecuperacion = pin;
  await usuario.save();

  return {
    mensaje: 'PIN de recuperación enviado exitosamente al correo',
    pinSimulado: pin,
  };
}

async function verificarCodigo(correo, pin) {
  const usuario = await Usuario.findOne({ correo: correo.toLowerCase() });
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

async function restablecerContrasena(correo, pin, nuevaContrasena) {
  const usuario = await Usuario.findOne({ correo: correo.toLowerCase() });
  if (!usuario) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  if (usuario.pinRecuperacion && usuario.pinRecuperacion !== pin.trim()) {
    throw new HttpError(400, 'PIN inválido');
  }

  usuario.contrasena = nuevaContrasena;
  usuario.pinRecuperacion = null;
  usuario.bloqueado = false;
  usuario.intentosFallidos = 0;
  await usuario.save();

  return {
    mensaje: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.',
  };
}

async function sembrarUsuarioInicial() {
  try {
    const conteo = await Usuario.countDocuments();
    if (conteo === 0) {
      console.log('Sembrando usuario demo inicial en MongoDB...');
      await Usuario.create({
        nombre: 'Juan José Perez Cespedes',
        correo: 'juanelpro2005@gmail.com',
        contrasena: '123456',
        role: 'Miembro de la comunidad',
        phone: '+57 300 123 4567',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      });
      console.log('✔ Usuario semilla creado: juanelpro2005@gmail.com / 123456');
    }
  } catch (error) {
    console.error('Error al sembrar usuario:', error.message);
  }
}

module.exports = {
  login,
  registrar,
  solicitarRecuperacion,
  verificarCodigo,
  restablecerContrasena,
  sembrarUsuarioInicial,
};
