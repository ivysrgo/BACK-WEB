const { Router } = require('express');
const controlador = require('../controllers/solicitudes.controller');
const {
  validarCreacionSolicitud,
  validarCambioSolicitud,
} = require('../middlewares/validarErrores');
const { verificarTokenOpcional, verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', verificarTokenOpcional, controlador.listar);
router.get('/mias', verificarToken, controlador.listarMias);
router.get('/:id', verificarTokenOpcional, controlador.obtener);
router.post('/:id/confirmar-intercambio', verificarToken, controlador.confirmarIntercambio);
router.patch('/:id/confirmar-intercambio', verificarToken, controlador.confirmarIntercambio);
router.post('/', verificarTokenOpcional, validarCreacionSolicitud, controlador.crear);
router.patch('/:id', verificarTokenOpcional, validarCambioSolicitud, controlador.actualizar);
router.delete('/:id', verificarToken, controlador.eliminar);

module.exports = router;
