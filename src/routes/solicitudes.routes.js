const { Router } = require('express');
const controlador = require('../controllers/solicitudes.controller');
const {
  validarCreacionSolicitud,
  validarCambioSolicitud,
} = require('../middlewares/validarErrores');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/mias', verificarToken, controlador.listarMias);
router.get('/:id', verificarToken, controlador.obtener);
router.post('/', verificarToken, validarCreacionSolicitud, controlador.crear);
router.post('/:id/confirmar-intercambio', verificarToken, controlador.confirmarIntercambio);
router.patch('/:id', verificarToken, validarCambioSolicitud, controlador.actualizarEstado);

module.exports = router;
