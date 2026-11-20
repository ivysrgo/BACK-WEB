const { Router } = require('express');
const controlador = require('../controllers/auth.controller');
const { validarRegistro, validarLogin, validarCambioContrasena } = require('../middlewares/validarErrores');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

router.post('/login', validarLogin, controlador.login);
router.post('/register', validarRegistro, controlador.registrar);
router.get('/me', verificarToken, controlador.perfil);
router.get('/perfil', verificarToken, controlador.perfil);
router.patch('/perfil', verificarToken, controlador.actualizarPerfil);
router.put('/perfil', verificarToken, controlador.actualizarPerfil);
router.get('/usuario/:id', controlador.perfilPublico);
router.patch('/cambiar-contrasena', verificarToken, validarCambioContrasena, controlador.cambiarContrasena);
router.post('/forgot-password', controlador.forgotPassword);
router.post('/verify-code', controlador.verifyCode);
router.post('/reset-password', controlador.resetPassword);

module.exports = router;
