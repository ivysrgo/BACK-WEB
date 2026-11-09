const { Router } = require('express');
const controlador = require('../controllers/solicitudes.controller');
const {
  validarCreacionSolicitud,
  validarCambioSolicitud,
} = require('../middlewares/validarErrores');

const router = Router();

router.get('/', controlador.listar);
router.get('/:id', controlador.obtener);
router.post('/', validarCreacionSolicitud, controlador.crear);
router.patch('/:id', validarCambioSolicitud, controlador.actualizar);
router.delete('/:id', controlador.eliminar);

module.exports = router;
