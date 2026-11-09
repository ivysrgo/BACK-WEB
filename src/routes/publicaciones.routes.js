const { Router } = require('express');
const controlador = require('../controllers/publicaciones.controller');
const {
  validarCreacionPublicacion,
  validarCambioPublicacion,
} = require('../middlewares/validarErrores');

const router = Router();

router.get('/', controlador.listar);
router.get('/:id', controlador.obtener);
router.post('/', validarCreacionPublicacion, controlador.crear);
router.patch('/:id', validarCambioPublicacion, controlador.actualizar);
router.put('/:id', validarCambioPublicacion, controlador.actualizar);
router.delete('/:id', controlador.eliminar);

module.exports = router;
