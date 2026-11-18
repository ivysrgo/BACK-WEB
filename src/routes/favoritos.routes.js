const { Router } = require('express');
const controlador = require('../controllers/favoritos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', verificarToken, controlador.listar);
router.post('/', verificarToken, controlador.agregar);
router.delete('/:articuloId', verificarToken, controlador.eliminar);

module.exports = router;
