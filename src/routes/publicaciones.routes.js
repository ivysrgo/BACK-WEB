const { Router } = require('express');
const controlador = require('../controllers/publicaciones.controller');
const {
  validarCreacionPublicacion,
  validarCambioPublicacion,
} = require('../middlewares/validarErrores');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', controlador.listar);
router.get('/mis-publicaciones', verificarToken, controlador.listarMias);
router.get('/:id', controlador.obtener);
router.post('/', verificarToken, validarCreacionPublicacion, controlador.crear);
router.patch('/:id', verificarToken, validarCambioPublicacion, controlador.actualizar);
router.put('/:id', verificarToken, validarCambioPublicacion, controlador.actualizar);
router.delete('/:id', verificarToken, controlador.eliminar);

module.exports = router;