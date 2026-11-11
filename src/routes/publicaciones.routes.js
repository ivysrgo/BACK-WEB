const { Router } = require('express');
const controlador = require('../controllers/publicaciones.controller');
const {
  validarCreacionPublicacion,
  validarCambioPublicacion,
} = require('../middlewares/validarErrores');
const { verificarToken, verificarTokenOpcional } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', verificarTokenOpcional, controlador.listar);
router.get('/mis-publicaciones', verificarToken, controlador.listarPropias);
router.get('/:id', controlador.obtener);
router.post('/', verificarToken, validarCreacionPublicacion, controlador.crear);
router.patch('/:id', verificarToken, validarCambioPublicacion, controlador.actualizar);
router.put('/:id', verificarToken, validarCambioPublicacion, controlador.actualizar);
router.delete('/:id', verificarToken, controlador.eliminar);

module.exports = router;
