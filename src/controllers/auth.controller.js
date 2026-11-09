const servicio = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { correo, contrasena } = req.body;
    const respuesta = await servicio.login({ correo, contrasena });
    res.status(200).json(respuesta);
  } catch (error) {
    next(error);
  }
}

async function registrar(req, res, next) {
  try {
    const { nombre, correo, contrasena, phone } = req.body;
    const usuario = await servicio.registrar({ nombre, correo, contrasena, phone });
    res.status(201).json({ usuario });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { correo } = req.body;
    if (!correo) {
      return res.status(400).json({ error: 'El correo es obligatorio', mensaje: 'El correo es obligatorio' });
    }
    const respuesta = await servicio.solicitarRecuperacion(correo);
    res.status(200).json(respuesta);
  } catch (error) {
    next(error);
  }
}

async function verifyCode(req, res, next) {
  try {
    const { correo, pin, code } = req.body;
    const codigo = pin || code;
    if (!correo || !codigo) {
      return res.status(400).json({
        error: 'El correo y el código PIN son obligatorios',
        mensaje: 'El correo y el código PIN son obligatorios',
      });
    }
    const respuesta = await servicio.verificarCodigo(correo, String(codigo));
    res.status(200).json(respuesta);
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { correo, pin, code, nuevaContrasena, contrasena } = req.body;
    const password = nuevaContrasena || contrasena;
    const codigo = pin || code;
    if (!correo || !password) {
      return res.status(400).json({
        error: 'El correo y la nueva contraseña son obligatorios',
        mensaje: 'El correo y la nueva contraseña son obligatorios',
      });
    }
    const respuesta = await servicio.restablecerContrasena(correo, String(codigo || '1234'), password);
    res.status(200).json(respuesta);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  registrar,
  forgotPassword,
  verifyCode,
  resetPassword,
};
