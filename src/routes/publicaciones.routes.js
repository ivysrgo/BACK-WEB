const { Router } = require('express');
const controlador = require('../controllers/publicaciones.controller');
const {
  validarCreacionPublicacion,
  validarCambioPublicacion,
} = require('../middlewares/validarErrores');
const { verificarToken, verificarTokenOpcional } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', verificarTokenOpcional, controlador.listar);
router.get('/estadisticas', controlador.obtenerEstadisticas);
router.get('/mis-publicaciones', verificarToken, controlador.listarMisPublicaciones);
router.get('/:id', controlador.obtener);
router.post('/', verificarToken, validarCreacionPublicacion, controlador.crear);
router.patch('/:id', verificarTokenOpcional, validarCambioPublicacion, controlador.actualizar);
router.put('/:id', verificarTokenOpcional, validarCambioPublicacion, controlador.actualizar);
router.delete('/:id', verificarTokenOpcional, controlador.eliminar);

module.exports = router;