const { Router } = require('express');
const controlador = require('../controllers/admin.controller');
const { verificarToken, requerirAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verificarToken, requerirAdmin);

router.get('/usuarios', controlador.listarUsuarios);
router.get('/usuarios/:id', controlador.obtenerUsuario);
router.patch('/usuarios/:id/suspension', controlador.cambiarSuspension);
router.get('/donaciones', controlador.listarDonaciones);
router.get('/metricas', controlador.obtenerMetricas);
router.patch('/publicaciones/:id/caducidad', controlador.actualizarCaducidad);
router.delete('/publicaciones/:id', controlador.eliminarPublicacion);

module.exports = router;
