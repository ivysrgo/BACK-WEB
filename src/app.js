const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const documentacion = require('./docs/openapi');
const publicacionesRouter = require('./routes/publicaciones.routes');
const authRouter = require('./routes/auth.routes');
const solicitudesRouter = require('./routes/solicitudes.routes');
const favoritosRouter = require('./routes/favoritos.routes');
const notificacionesRouter = require('./routes/notificaciones.routes');
const reportesRouter = require('./routes/reportes.routes');
const adminRouter = require('./routes/admin.routes');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/manejarErrores');

const app = express();

// 1. Middlewares globales
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Middleware para asegurar la conexión a MongoDB Atlas (compatible con Serverless / Vercel)
app.use(async (req, res, next) => {
  try {
    const { connectDB } = require('./config/db');
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// 2. Documentación Swagger y rutas de diagnóstico
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(documentacion));
app.get('/api/docs.json', (req, res) => res.json(documentacion));
app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));

// 3. Montaje de rutas de la API (incluye alias /api/articulos)
app.use('/api/publicaciones', publicacionesRouter);
app.use('/api/articulos', publicacionesRouter);
app.use('/api/auth', authRouter);
app.use('/api/solicitudes', solicitudesRouter);
app.use('/api/favoritos', favoritosRouter);
app.use('/api/notificaciones', notificacionesRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/admin', adminRouter);

// 4. Manejo de rutas no encontradas y errores centralizados
app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
