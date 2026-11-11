const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const documentacion = require('./docs/openapi');
const publicacionesRouter = require('./routes/publicaciones.routes');
const authRouter = require('./routes/auth.routes');
const solicitudesRouter = require('./routes/solicitudes.routes');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/manejarErrores');

const app = express();

// 1. Middlewares globales
app.use(cors());
app.use(express.json());

// 2. Documentación Swagger y rutas de diagnóstico
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(documentacion));
app.get('/api/docs.json', (req, res) => res.json(documentacion));
app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));

// 3. Montaje de rutas de la API (incluye alias /api/articulos)
app.use('/api/publicaciones', publicacionesRouter);
app.use('/api/articulos', publicacionesRouter);
app.use('/api/auth', authRouter);
app.use('/api/solicitudes', solicitudesRouter);

// 4. Manejo de rutas no encontradas y errores centralizados
app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
