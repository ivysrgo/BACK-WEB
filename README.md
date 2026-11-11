# BACK-WEB · Eco-Golgi / Unidona API 🌿👕


El proyecto sigue estrictamente la **arquitectura por capas** desacoplada de la plantilla `minicrud-express`.

---

## 🏗 Arquitectura por Capas

```plaintext
BACK-WEB/
├── .env                  # Variables de entorno locales (Compass / Atlas)
├── .env.example          # Plantilla pública de variables de entorno
├── .gitignore            # Archivos y carpetas ignorados por Git
├── package.json          # Dependencias y scripts del proyecto
└── src/
    ├── config/
    │   └── db.js         # Conexión Mongoose a MongoDB
    ├── utils/
    │   └── HttpError.js  # Clase de error HTTP personalizada con statusCode
    ├── middlewares/
    │   ├── manejarErrores.js # Manejador global de excepciones y 404
    │   └── validarErrores.js # Validaciones de esquemas para solicitudes HTTP
    ├── models/
    │   ├── publicacion.models.js # Modelo de prendas y artículos
    │   ├── usuario.models.js     # Modelo de usuarios y credenciales
    │   └── solicitud.models.js   # Modelo de solicitudes de donación e intercambio
    ├── services/
    │   ├── publicaciones.service.js # Lógica de negocio y sembrado de publicaciones
    │   ├── auth.service.js          # Autenticación, bloqueo por intentos y recuperación
    │   └── solicitudes.service.js   # Lógica de gestión de solicitudes
    ├── controllers/
    │   ├── publicaciones.controller.js # Controladores HTTP de publicaciones
    │   ├── auth.controller.js          # Controladores HTTP de autenticación
    │   └── solicitudes.controller.js   # Controladores HTTP de solicitudes
    ├── routes/
    │   ├── publicaciones.routes.js  # Rutas de inventario y publicaciones
    │   ├── auth.routes.js           # Rutas de autenticación y cuentas
    │   └── solicitudes.routes.js    # Rutas de solicitudes y favoritos
    ├── docs/
    │   └── openapi.js               # Documentación interactiva OpenAPI 3.0 / Swagger
    ├── app.js                       # Configuración de Express, CORS y Middlewares
    └── server.js                    # Punto de entrada y arranque del servidor
```

---

## 🚀 Requisitos Previos

* **Node.js**: v18 o superior (recomendado v20+ o v24+).
* **MongoDB**: Instancia local mediante **MongoDB Compass / Community Server** o clúster en la nube en **MongoDB Atlas**.

---

## ⚙️ Configuración y Variables de Entorno

El backend está configurado por defecto para conectarse a **MongoDB Atlas (en la nube)**. Revisa tu archivo `.env`:

```env
PORT=3000

# =========================================================================
# CONEXIÓN PRINCIPAL: MongoDB Atlas (Nube)
# =========================================================================
MONGO_URI=mongodb+srv://<USUARIO>:<PASSWORD>@cluster0.tucluster.mongodb.net/ecogolgi_db?retryWrites=true&w=majority


---

## 📦 Instalación y Ejecución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Modo desarrollo (con recarga automática mediante `--watch`):**
   ```bash
   npm run dev
   ```

3. **Modo producción:**
   ```bash
   npm start
   ```

> [!NOTE]
> Al iniciar el servidor por primera vez, si la base de datos se encuentra vacía, se ejecutarán automáticamente las funciones de **sembrado inicial (`seeder`)**, insertando las 4 publicaciones demo, el usuario de prueba por defecto y las 4 solicitudes iniciales.

---

## 📖 Documentación Interactiva (Swagger UI)

Una vez iniciado el servidor, accede a la interfaz interactiva para probar todos los endpoints:
* **Swagger UI:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
* **Especificación OpenAPI (JSON):** [http://localhost:3000/api/docs.json](http://localhost:3000/api/docs.json)
* **Estado de Salud:** [http://localhost:3000/api/salud](http://localhost:3000/api/salud)

---

## 📡 Endpoints de la API

### 1. Publicaciones / Artículos (`/api/publicaciones` y `/api/articulos`)

| Método | Endpoint | Descripción | Parámetros / Query |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/publicaciones` | Listar publicaciones | `categoria`, `estado`, `modalidad`, `q` |
| `GET` | `/api/publicaciones/:id` | Detalle de publicación por ID | `id` en path |
| `POST` | `/api/publicaciones` | Crear nueva publicación | Body JSON con datos de la prenda |
| `PUT` | `/api/publicaciones/:id` | Actualización completa | `id` en path, Body JSON |
| `PATCH` | `/api/publicaciones/:id` | Actualización parcial (ej: `status`) | `id` en path, Body JSON |
| `DELETE`| `/api/publicaciones/:id` | Eliminar publicación (retorna 204) | `id` en path |

### 2. Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Body Requerido |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Iniciar sesión (genera JWT, control de intentos y bloqueo) | `{ correo, contrasena }` |
| `POST` | `/api/auth/register` | Registro de nuevos usuarios (rol `user`) | `{ nombre, correo, contrasena, phone }` |
| `GET`  | `/api/auth/me` | Obtener perfil del usuario autenticado (requiere Bearer token) | Header `Authorization: Bearer <token>` |
| `POST` | `/api/auth/forgot-password`| Solicitar PIN de recuperación | `{ correo }` |
| `POST` | `/api/auth/verify-code` | Verificar PIN de 4 dígitos | `{ correo, pin }` |
| `POST` | `/api/auth/reset-password` | Restablecer contraseña y desbloquear cuenta | `{ correo, pin, nuevaContrasena }` |

### 3. Solicitudes (`/api/solicitudes`)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/solicitudes` | Listar solicitudes (soporta filtros `status`, `esFavorito`, `tipo`) |
| `GET` | `/api/solicitudes/:id` | Obtener solicitud por ID |
| `POST` | `/api/solicitudes` | Crear nueva solicitud de donación o intercambio |
| `PATCH` | `/api/solicitudes/:id` | Cambiar estado (`Pendiente`, `Aceptado`, `Donado`, `Rechazado`) o favorito |
| `DELETE`| `/api/solicitudes/:id` | Eliminar solicitud por ID |

---

## 👥 Usuarios Semilla por Defecto en MongoDB Atlas

El sistema incluye dos tipos de usuarios sembrados con contraseñas encriptadas con **bcrypt**:

### 1. 🛡️ Administrador (Acceso al panel administrativo y métricas)
* **Correo:** `admin@ecogolgi.com`
* **Contraseña:** `Admin123*`
* **Nombre:** `Administrador Eco-Golgi`
* **Rol:** `admin` (Redirección a `/admin/explorar`)

### 2. 👤 Usuario Regular (Comunidad / Donador)
* **Correo:** `juanelpro2005@gmail.com`
* **Contraseña:** `123456`
* **Nombre:** `Juan José Perez Cespedes`
* **Rol:** `user` (Redirección a `/explorar`)
