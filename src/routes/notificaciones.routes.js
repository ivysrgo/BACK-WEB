const { Router } = require('express');
const controlador = require('../controllers/notificaciones.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de notificaciones requieren autenticación con token JWT
router.use(verificarToken);

router.get('/', controlador.listar);
router.get('/no-leidas', controlador.contarNoLeidas);
router.patch('/leer-todas', controlador.marcarTodasLeidas);
router.patch('/:id/leida', controlador.marcarLeida);
router.delete('/:id', controlador.eliminar);

module.exports = router;
