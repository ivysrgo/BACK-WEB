const { Router } = require('express');
const controlador = require('../controllers/reportes.controller');
const { verificarToken, requerirAdmin } = require('../middlewares/auth.middleware');

const router = Router();

// Cualquier usuario autenticado puede reportar una publicación.
router.post('/', verificarToken, controlador.crear);

// Gestión de reportes: solo administradores.
router.get('/', verificarToken, requerirAdmin, controlador.listar);
router.get('/:id', verificarToken, requerirAdmin, controlador.obtener);
router.patch('/:id/ignorar', verificarToken, requerirAdmin, controlador.ignorar);
router.patch('/:id/eliminar-publicacion', verificarToken, requerirAdmin, controlador.eliminarPublicacion);

module.exports = router;
