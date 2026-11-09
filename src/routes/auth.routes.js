const { Router } = require('express');
const controlador = require('../controllers/auth.controller');
const { validarRegistro, validarLogin } = require('../middlewares/validarErrores');

const router = Router();

router.post('/login', validarLogin, controlador.login);
router.post('/register', validarRegistro, controlador.registrar);
router.post('/forgot-password', controlador.forgotPassword);
router.post('/verify-code', controlador.verifyCode);
router.post('/reset-password', controlador.resetPassword);

module.exports = router;
