# Conexión local de publicaciones con MongoDB

## Backend

1. Inicia el servicio **MongoDB Community Server**. En Compass, conecta a `mongodb://127.0.0.1:27017`.
2. Desde la raíz de BACK-WEB, copia la plantilla de entorno:

   ```powershell
   Copy-Item .env.example .env
   ```

3. En `.env`, deja `MONGO_URI=mongodb://127.0.0.1:27017/ecogolgi` y configura `JWT_SECRET` con una clave privada aleatoria de al menos 32 caracteres. `.env` está excluido de Git; no compartas ni publiques sus valores.
4. Instala y ejecuta el backend:

   ```powershell
   npm install
   npm run dev
   ```

5. Comprueba `http://localhost:3000/api/salud`. Al iniciar, la API siembra datos de demostración si las colecciones están vacías. Compass mostrará la base `ecogolgi` y la colección `publicacions`.

## Frontend

Desde la raíz de FRONT-WEB, opcionalmente crea `.env` desde su plantilla para cambiar la URL de la API. El valor local predeterminado ya es `http://localhost:3000/api`.

```powershell
Copy-Item .env.example .env
npm run dev
```

Regístrate o inicia sesión desde el frontend. El token JWT se guarda en el navegador y se envía al crear, editar, eliminar o listar tus publicaciones. La búsqueda y el detalle del catálogo son públicos.

## Fotografías

El backend persiste una URL pública en `imageUrl`; no recibe ni almacena archivos de imagen. Al publicar, pega una URL accesible por el navegador. La subida de archivos requiere integrar por separado un servicio de almacenamiento.
