const { Router } = require('express');
const controlador = require('../controllers/notificaciones.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', verificarToken, controlador.listarMias);

module.exports = router;
