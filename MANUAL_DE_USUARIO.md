# 📖 MANUAL DE USUARIO · PLATAFORMA ECO-GOLGI / UNIDONA 🌿👕

> **Plataforma Universitaria de Economía Circular, Intercambio Sostenible y Donación Comunitaria**  
> *Versión del Documento: 1.0.0 — Noviembre 2026*

---

## 📑 Tabla de Contenidos

1. [Introducción y Propósito](#1-introducción-y-propósito)
2. [Arquitectura del Sistema y Roles](#2-arquitectura-del-sistema-y-roles)
3. [Cuentas y Credenciales de Acceso Demo](#3-cuentas-y-credenciales-de-acceso-demo)
4. [Puesta en Marcha (Cómo Iniciar el Proyecto)](#4-puesta-en-marcha-cómo-iniciar-el-proyecto)
5. [Módulo de Autenticación y Seguridad](#5-módulo-de-autenticación-y-seguridad)
   - 5.1 [Registro de Usuario](#51-registro-de-usuario)
   - 5.2 [Inicio de Sesión](#52-inicio-de-sesión)
   - 5.3 [Política de Bloqueo por Intentos Fallidos](#53-política-de-bloqueo-por-intentos-fallidos)
   - 5.4 [Recuperación y Restablecimiento de Contraseña](#54-recuperación-y-restablecimiento-de-contraseña)
6. [Módulo de Exploración y Búsqueda de Artículos](#6-módulo-de-exploración-y-búsqueda-de-artículos)
   - 6.1 [Página Principal (Explorar)](#61-página-principal-explorar)
   - 6.2 [Catálogo y Filtros Avanzados](#62-catálogo-y-filtros-avanzados)
   - 6.3 [Detalle de Artículo y Perfil del Donador](#63-detalle-de-artículo-y-perfil-del-donador)
7. [Módulo de Publicaciones (Ciclo de Vida y Caducidad)](#7-módulo-de-publicaciones-ciclo-de-vida-y-caducidad)
   - 7.1 [Publicar un Nuevo Artículo](#71-publicar-un-nuevo-artículo)
   - 7.2 [Gestión de "Mis Publicaciones"](#72-gestión-de-mis-publicaciones)
   - 7.3 [Algoritmo de Caducidad y Barra de Progreso (30 Días)](#73-algoritmo-de-caducidad-y-barra-de-progreso-30-días)
   - 7.4 [Escalado a UniDona (Transición a Donación al llegar a 0 días)](#74-escalado-a-unidona-transición-a-donación-al-llegar-a-0-días)
   - 7.5 [Edición y Eliminación de Publicaciones](#75-edición-y-eliminación-de-publicaciones)
8. [Módulo de Solicitudes, Intercambios y Favoritos](#8-módulo-de-solicitudes-intercambios-y-favoritos)
   - 8.1 [Crear una Solicitud (Donación vs Intercambio)](#81-crear-una-solicitud-donación-vs-intercambio)
   - 8.2 [Solicitudes Enviadas y Recibidas](#82-solicitudes-enviadas-y-recibidas)
   - 8.3 [Aprobación, Rechazo y Confirmación de Intercambio](#83-aprobación-rechazo-y-confirmación-de-intercambio)
   - 8.4 [Gestión de Favoritos e Historial](#84-gestión-de-favoritos-e-historial)
9. [Módulo de Perfil y Configuración](#9-módulo-de-perfil-y-configuración)
   - 9.1 [Mi Perfil y Estadísticas Personales](#91-mi-perfil-y-estadísticas-personales)
   - 9.2 [Cambiar Contraseña](#92-cambiar-contraseña)
   - 9.3 [Cerrar Sesión](#93-cerrar-sesión)
10. [Panel de Administración (Rol Administrador)](#10-panel-de-administración-rol-administrador)
    - 10.1 [Dashboard y Métricas de Impacto](#101-dashboard-y-métricas-de-impacto)
    - 10.2 [Gestión y Moderación de Usuarios](#102-gestión-y-moderación-de-usuarios)
    - 10.3 [Control Logístico de Donaciones UniDona](#103-control-logístico-de-donaciones-unidona)
    - 10.4 [Gestión de Reportes](#104-gestión-de-reportes)
11. [Guía de Pruebas Automatizadas (QA Testing)](#11-guía-de-pruebas-automatizadas-qa-testing)
12. [Preguntas Frecuentes y Solución de Problemas (Troubleshooting)](#12-preguntas-frecuentes-y-solución-de-problemas-troubleshooting)

---

## 1. Introducción y Propósito

**Eco-Golgi** es un ecosistema digital colaborativo diseñado para promover la economía circular, la reutilización de prendas, libros, muebles y útiles escolares, y la reducción de residuos dentro de la comunidad universitaria.

La plataforma cuenta con integración directa a **UniDona** (red conectada al Banco de Ropa de la Corporación Organización El Minuto de Dios). Si un artículo publicado no logra ser intercambiado o donado localmente en un plazo de **30 días**, el sistema ofrece escalarlo formalmente como donación institucional, asegurando un destino social y evitando el descarte textil o de materiales.

---

## 2. Arquitectura del Sistema y Roles

La solución está construida bajo una arquitectura desacoplada de dos capas principales:

* **Backend (`BACK-WEB`):** API RESTful desarrollada con **Node.js, Express y MongoDB (Mongoose)** siguiendo una arquitectura en capas (`routes` -> `controllers` -> `services` -> `models`), con autenticación por **JSON Web Tokens (JWT)** y contraseñas cifradas con **bcrypt**.
* **Frontend (`FRONT-WEB`):** Single Page Application (SPA) construida con **React 19, TypeScript, Vite y React Router**, enfocada en accesibilidad, diseño responsivo y retroalimentación inmediata.

### Roles de Usuario en la Plataforma

| Rol | Identificador | Acceso | Funcionalidades Principales |
| :--- | :--- | :--- | :--- |
| **Miembro de la Comunidad** | `user` | `/explorar`, `/publicaciones`, etc. | Publicar artículos, solicitar intercambios, donar, gestionar favoritos y ver perfil. |
| **Administrador General** | `admin` | `/admin/explorar`, `/admin/metricas`, etc. | Moderar usuarios, gestionar reportes, supervisar donaciones escaladas y ver métricas de impacto ecológico. |

---

## 3. Cuentas y Credenciales de Acceso Demo

La base de datos cuenta con dos cuentas semilla preconfiguradas:

### 🛡️ Administrador del Sistema
* **Correo:** `admin@ecogolgi.com`
* **Contraseña:** `Admin123`
* **Rol:** Administrador
* **Destino tras Login:** Redirige automáticamente al panel `/admin/explorar`

### 👤 Usuario Regular (Comunidad)
* **Correo:** `juanelpro2005@gmail.com`
* **Contraseña:** `123456`
* **Rol:** Miembro de la comunidad
* **Destino tras Login:** Redirige al catálogo general `/explorar`

---

## 4. Puesta en Marcha (Cómo Iniciar el Proyecto)

Para operar el sistema completo en tu máquina local, requieres abrir dos terminales independientes:

### Terminal 1: Backend (`BACK-WEB`)
```powershell
cd c:\Users\sergi\OneDrive\Desktop\ECO-GOLGI\BACK-WEB
npm install
npm run dev
```
* **Servidor API:** [http://localhost:3000](http://localhost:3000)
* **Documentación OpenAPI / Swagger:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

### Terminal 2: Frontend (`FRONT-WEB`)
```powershell
cd c:\Users\sergi\OneDrive\Desktop\ECO-GOLGI\FRONT-WEB
npm install
npm run dev
```
* **Aplicación Web:** [http://localhost:5173](http://localhost:5173)

---

## 5. Módulo de Autenticación y Seguridad

### 5.1 Registro de Usuario
1. Ingresa a la pantalla de registro (`/register` o clic en *"¿No tienes cuenta? Regístrate"*).
2. Diligencia los campos obligatorios:
   - **Nombre completo:** Mínimo 2 caracteres.
   - **Correo electrónico:** Formato institucional o personal válido (ej: `usuario@uniminuto.edu.co`).
   - **Teléfono / WhatsApp:** Opcional o requerido según perfil.
   - **Contraseña:** Mínimo 5 caracteres, con al menos una letra mayúscula y un caracter especial (ej: `EcoGolgi2026!`).
3. Haz clic en **Registrarse**. El sistema creará tu cuenta con rol `user`, iniciará tu sesión y te redirigirá a `/explorar`.

### 5.2 Inicio de Sesión
1. Dirígete a `/login`.
2. Introduce tu correo y contraseña registrados.
3. Haz clic en **Iniciar Sesión**.
4. El sistema validará tus credenciales y te redirigirá según tu rol (`/explorar` para usuarios o `/admin/explorar` para administradores).

### 5.3 Política de Bloqueo por Intentos Fallidos
* **Seguridad activa:** Si ingresas una contraseña incorrecta **3 veces consecutivas**, la cuenta se bloqueará automáticamente por **15 minutos** para prevenir ataques de fuerza bruta.
* **Mensaje de bloqueo:** La pantalla mostrará una alerta indicando que la cuenta está bloqueada temporalmente y te invitará a restablecer la contraseña inmediatamente.

### 5.4 Recuperación y Restablecimiento de Contraseña
Si olvidaste tu clave o tu cuenta fue bloqueada:
1. En la pantalla de login, haz clic en **"¿Olvidaste tu contraseña?"** (`/forgot-password`).
2. Digita tu correo registrado y haz clic en **"Enviar PIN"**.
3. El sistema generará un PIN de seguridad (código demo: `1234`).
4. Ingresa el código en la pantalla de verificación (`/verify-code`).
5. Introduce tu **Nueva Contraseña** cumpliendo con los estándares de seguridad en `/new-password`.
6. Al confirmar, tu contraseña se actualizará, la cuenta se desbloqueará de inmediato y podrás iniciar sesión con la nueva clave.

---

## 6. Módulo de Exploración y Búsqueda de Artículos

### 6.1 Página Principal (Explorar)
Al ingresar a `/explorar`, encontrarás:
* **Buscador global:** Permite encontrar artículos por palabras clave (ej: *"álgebra"*, *"chaqueta"*, *"calculadora"*).
* **Categorías rápidas:** Carrusel con iconos para filtrar por: **Ropa**, **Libros**, **Muebles**, **Calzado**, **Útiles escolares** y **Tecnología**.
* **Artículos Destacados y Recientes:** Tarjetas interactivas con foto, título, modalidad (Donación o Intercambio), condición física y tiempo publicado.

### 6.2 Catálogo y Filtros Avanzados
En `/articulos` (Todos los artículos):
* Puedes combinar filtros simultáneos:
  - **Categoría:** Filtra solo la familia de productos deseada.
  - **Modalidad:** `Donación` (artículos gratuitos para entrega) o `Intercambio` (trueque por otra prenda o libro).
  - **Estado físico:** `Nuevo`, `Como nuevo`, `Buen estado`, `Con uso`.
  - **Ordenamiento:** Más recientes primero o por relevancia de búsqueda.

### 6.3 Detalle de Artículo y Perfil del Donador
Al hacer clic en cualquier tarjeta (`/articulo/:id`):
1. **Galería de fotos:** Muestra todas las imágenes subidas por el propietario.
2. **Ficha técnica:** Talla, género, clima (en el caso de prendas), descripción detallada y ubicación.
3. **Tarjeta de Perfil del Usuario:**
   - Nombre del propietario y avatar.
   - Puntuación promedio con estrellas doradas (`★ ★ ★ ★ ☆`).
   - Teléfono / WhatsApp para acordar entregas.
   - Botón para ver todas las demás publicaciones del mismo usuario (`/usuario/:id`).
4. **Acción Principal:** Botón **"Solicitar Donación"** o **"Solicitar Intercambio"**.

---

## 7. Módulo de Publicaciones (Ciclo de Vida y Caducidad)

### 7.1 Publicar un Nuevo Artículo
1. En la barra de navegación superior, haz clic en **"Publicar"** (`/publicar`).
2. Completa los 4 pasos del formulario:
   - **Información Básica:** Título del artículo, categoría general y modalidad (`Donación` o `Intercambio`).
   - **Estado y Descripción:** Condición física del producto y detalles para que otros usuarios conozcan su estado real.
   - **Características Específicas (si es Ropa):** Talla (ej: S, M, L, 30), Género (Hombre, Mujer, Unisex) y Clima (Frío, Templado, Cálido).
   - **Imágenes:** Puedes subir una o varias fotografías de tu artículo.
   - **Autorización UniDona:** Casilla para autorizar que el artículo pueda ser escalado al Banco de Ropa de UniDona si no se intercambia en 30 días.
3. Haz clic en **"Publicar Artículo"**. Se añadirá de inmediato al catálogo público con un temporizador de **30 días**.

### 7.2 Gestión de "Mis Publicaciones"
En `/publicaciones` podrás monitorear todo tu inventario activo:
* Cada tarjeta muestra:
  - Imagen y título.
  - Contador de **Solicitudes recibidas** (en color naranja).
  - Badge de Estado:
    - 🟦 **Disponible:** Visible para toda la comunidad.
    - 🟨 **Reservado:** En proceso de acuerdo con otro usuario.
    - 🟧 **Caducado:** Cumplió su ciclo de 30 días sin intercambio local.
    - ⬛ **Donado · UniDona:** Escalado exitosamente al Banco de Ropa Minuto de Dios.

### 7.3 Algoritmo de Caducidad y Barra de Progreso (30 Días)
* La barra de progreso azul calcula dinámicamente:
  $$\text{Días restantes} = 30 - \text{Días transcurridos}$$
* Texto informativo: *"Publicado hace X días · Y días restantes (caducidad a los 30 días)"*.
* La barra se actualiza en tiempo real de acuerdo a la fecha de publicación (`createdAt`).

### 7.4 Escalado a UniDona (Transición a Donación al llegar a 0 días)
Cuando los días restantes llegan a **0 días** (o si la duración se fija en 0):
1. El estado de la tarjeta muta automáticamente a **Caducado** (badge beige/naranja).
2. Se oculta la barra de días y aparece un banner naranja distintivo:
   > **Sin intercambio local en 30 días**  
   > *Puedes escalar este artículo a la red del Banco de Ropa del Minuto de Dios para donación formal.*
3. Se habilita el botón naranja **"Donar a UniDona"**.
4. Al hacer clic, se abre el modal de confirmación `DonateConfirmModal`.
5. Al pulsar **Confirmar**, el artículo cambia su estado a **Donado**, la tarjeta se transforma a estilo negro de donación formal y se genera una notificación en el sistema.

### 7.5 Edición y Eliminación de Publicaciones
* **Editar (`/editar-publicacion/:id`):** Permite actualizar título, descripción, fotos o estado. Solo el dueño de la publicación o un administrador tienen permiso para editarla.
* **Eliminar:** En la vista de edición o lista, haz clic en el botón rojo de eliminar. Se abrirá el modal `DeleteConfirmationModal` con el isotipo de Eco-Golgi. Si confirmas, el artículo se eliminará y sus registros en favoritos se limpiarán automáticamente en cascada.

---

## 8. Módulo de Solicitudes, Intercambios y Favoritos

### 8.1 Crear una Solicitud (Donación vs Intercambio)
Desde la ficha de cualquier producto ajeno:
* **Si es Donación:** Redactas un mensaje explicando por qué necesitas el artículo y confirmas la solicitud.
* **Si es Intercambio:** El sistema te solicita elegir cuál de tus propios artículos disponibles ofreces como trueque a cambio del producto solicitado.

### 8.2 Solicitudes Enviadas y Recibidas
* **Solicitudes Recibidas (`/solicitudes/recibidas`):** Artículos tuyos que otros usuarios han solicitado. Puedes revisar el mensaje del interesado, el artículo ofrecido en trueque y su perfil.
* **Solicitudes Enviadas (`/solicitudes/enviadas`):** Peticiones que tú has realizado a otros miembros. Puedes consultar si están en estado `Pendiente`, `Aceptado` o `Rechazado`.

### 8.3 Aprobación, Rechazo y Confirmación de Intercambio
1. **Aceptar Solicitud:** Al pulsar "Aceptar", el artículo pasa temporalmente a estado **Reservado**.
2. **Contacto:** Ambos usuarios pueden comunicarse por WhatsApp o teléfono para pactar el punto de encuentro universitario.
3. **Confirmar Intercambio:** Una vez entregado el producto, el propietario pulsa **"Confirmar Intercambio"**. Ambos artículos pasan a estado final `Intercambiado`/`Donado`, sumando a las métricas ecológicas de residuos evitados.

### 8.4 Gestión de Favoritos e Historial
* **Favoritos (`/solicitudes/favoritos`):** Haz clic en el ícono de corazón en cualquier publicación para guardarla en tu lista personal de seguimiento.
* **Historial (`/solicitudes/historial`):** Registro histórico de todas las donaciones e intercambios completados con éxito.

---

## 9. Módulo de Perfil y Configuración

### 9.1 Mi Perfil y Estadísticas Personales
En `/perfil`:
* Modifica tu **Nombre**, **Teléfono** y **Avatar**.
* Visualiza tus métricas de impacto personal:
  - Número de artículos donados e intercambiados.
  - Kilogramos de residuo textil/material evitados.
  - Calificación y reseñas otorgadas por otros miembros.

### 9.2 Cambiar Contraseña
En `/cambiar-contrasena`:
1. Ingresa tu **Contraseña Actual**.
2. Ingresa tu **Nueva Contraseña** (distinta a la actual, mínimo 5 caracteres, mayúscula y caracter especial).
3. Confirma el cambio para actualizar la seguridad de tu sesión.

### 9.3 Cerrar Sesión
Al hacer clic en **"Cerrar Sesión"** en la barra lateral o menú de configuración, se destruye el token JWT en el almacenamiento local del navegador (`localStorage`) y se redirige limpiamente a la pantalla de bienvenida.

---

## 10. Panel de Administración (Rol Administrador)

Los administradores (`admin@ecogolgi.com`) tienen acceso exclusivo a las siguientes herramientas de supervisión:

### 10.1 Dashboard y Métricas de Impacto (`/admin/metricas`)
* **Artículos Circulados:** Total de productos en inventario activo.
* **Intercambios Locales Completados:** Trueques exitosos dentro del campus.
* **Escalados a UniDona:** Productos canalizados hacia el Banco de Ropa Minuto de Dios.
* **Residuos Evitados en Kg:** Cálculo basado en la fórmula:
  $$\text{Kg Evitados} = \text{Total Circulados} \times 2.5\text{ kg}$$

### 10.2 Gestión y Moderación de Usuarios (`/admin/usuarios`)
* Tabla completa de usuarios registrados.
* Visualización de roles (`admin` o `user`).
* Opciones de **Suspender Cuenta** o **Reactivar** para mantener una comunidad segura.

### 10.3 Control Logístico de Donaciones UniDona (`/admin/donaciones`)
* Listado de prendas y artículos que han cumplido su ciclo de caducidad y fueron donados a UniDona.
* Control de despachos hacia la sede física del Banco de Ropa.

### 10.4 Gestión de Reportes (`/admin/reportes`)
* Revisión de artículos o usuarios reportados por la comunidad por contenido inapropiado o incumplimiento de acuerdos.
* Capacidad de eliminar publicaciones infractoras de manera forzada.

---

## 11. Guía de Pruebas Automatizadas (QA Testing)

El sistema cuenta con suites de pruebas unitarias, de integración y de caja que garantizan la estabilidad del software.

### Ejecución en el Backend (`BACK-WEB`)

```powershell
cd c:\Users\sergi\OneDrive\Desktop\ECO-GOLGI\BACK-WEB

# 1. Ejecutar solo las pruebas de caja (Negra, Blanca, Gris):
npm test -- __tests__/caja_

# 2. Ejecutar toda la suite del backend (11 suites, 238 tests, >98% cobertura):
npm test
```

### Ejecución en el Frontend (`FRONT-WEB`)

```powershell
cd c:\Users\sergi\OneDrive\Desktop\ECO-GOLGI\FRONT-WEB

# 1. Ejecutar solo las pruebas de caja del frontend (3 suites, 33 tests, >94% cobertura):
npm test -- src/caja_

# 2. Ejecutar toda la suite del frontend (14 suites, 88 tests, >96% cobertura):
npm test
```

---

## 12. Preguntas Frecuentes y Solución de Problemas (Troubleshooting)

### ❓ ¿Por qué mi cuenta dice que está bloqueada?
> Si ingresas la contraseña equivocada 3 veces seguidas, el sistema se bloquea por 15 minutos por seguridad. Puedes esperar los 15 minutos o usar el enlace **"¿Olvidaste tu contraseña?"** para desbloquearla al instante con tu PIN.

### ❓ ¿Qué pasa si una publicación mía cumple 30 días y nadie la solicita?
> Pasará automáticamente al estado **Caducado**. En tu panel de *Mis Publicaciones* verás un banner naranja y el botón **"Donar a UniDona"**. Al confirmarlo, el artículo se transfiere formalmente a la red de donaciones benéficas del Minuto de Dios.

### ❓ ¿Cómo sé si alguien está interesado en mi artículo?
> Recibirás una notificación en la campana superior y verás un número naranja en tu tarjeta de *Mis Publicaciones* indicando cuántas solicitudes pendientes tienes.

### ❓ Error `EPERM` o puerto ocupado al iniciar el Backend
> Si el puerto `3000` está ocupado, puedes detener el proceso anterior o cambiar temporalmente el puerto en tu archivo `.env` a `PORT=3001`.

---

*Manual elaborado con el estándar de calidad y arquitectura de ingeniería de software para el ecosistema **Eco-Golgi & UniDona 2026**.*
