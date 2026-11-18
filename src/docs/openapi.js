module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Eco-Golgi / Unidona API',
    version: '1.0.0',
    description:
      'API REST para la gestión de publicaciones de prendas, solicitudes de donación e intercambio, y autenticación de usuarios en la plataforma sustentable Eco-Golgi / Unidona.',
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Servidor local de desarrollo',
    },
  ],
  tags: [
    { name: 'Publicaciones / Artículos', description: 'Operaciones CRUD para inventario de prendas y artículos' },
    { name: 'Solicitudes', description: 'Gestión de solicitudes de intercambio y donación' },
    { name: 'Notificaciones', description: 'Alertas y notificaciones para usuarios de la comunidad' },
    { name: 'Autenticación', description: 'Registro, inicio de sesión y recuperación de contraseña' },
    { name: 'Salud', description: 'Comprobación de estado del servicio' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Publicacion: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '672f6a15f9a0c1a2e3b4c5d6' },
          title: { type: 'string', example: 'Chaqueta de Jean Oversize' },
          category: { type: 'string', example: 'ROPA' },
          modality: { type: 'string', enum: ['Donación', 'Intercambio'], example: 'Intercambio' },
          condition: { type: 'string', enum: ['Nuevo', 'Como nuevo', 'Buen Estado', 'Usado', 'Con uso'], example: 'Como nuevo' },
          description: { type: 'string', example: 'Chaqueta de jean estilo oversize vintage.' },
          details: { type: 'string', example: 'Como nuevo · Intercambio · chaqueta, jean' },
          requests: { type: 'integer', example: 4 },
          status: { type: 'string', enum: ['Disponible', 'Reservado', 'Donado', 'Caducado'], example: 'Disponible' },
          daysElapsed: { type: 'integer', example: 12 },
          imageUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500' },
          imageUrls: { type: 'array', items: { type: 'string' }, description: 'URLs de las fotografías; imageUrl contiene la portada.' },
          author: { type: 'string', example: 'Camila Rojas' },
          publishedAt: { type: 'string', example: '2026-10-14' },
          tags: { type: 'array', items: { type: 'string' }, example: ['chaqueta', 'jean'] },
          talla: { type: 'string', example: 'M' },
          genero: { type: 'string', example: 'Unisex' },
          clima: { type: 'string', example: 'Frío' },
          autorizaDonacion: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      NuevaPublicacion: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 3, example: 'Chaqueta de Jean Oversize' },
          category: { type: 'string', example: 'ROPA' },
          modality: { type: 'string', enum: ['Donación', 'Intercambio'], example: 'Intercambio' },
          condition: { type: 'string', example: 'Como nuevo' },
          description: { type: 'string', example: 'Chaqueta de corte amplio.' },
          imageUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0' },
          images: {
            type: 'array',
            maxItems: 5,
            items: { type: 'string', description: 'Imagen JPG o PNG codificada como data URL.' },
            description: 'Hasta 5 imágenes de máximo 5 MB cada una y 20 MB en total.',
          },
          tags: { type: 'array', items: { type: 'string' } },
          talla: { type: 'string', example: 'M' },
          genero: { type: 'string', example: 'Unisex' },
          clima: { type: 'string', example: 'Frío' },
          autorizaDonacion: { type: 'boolean', example: true },
        },
      },
      Solicitud: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '672f6a15f9a0c1a2e3b4c5d7' },
          type: { type: 'string', enum: ['DONACIÓN', 'INTERCAMBIO'], example: 'INTERCAMBIO' },
          title: { type: 'string', example: 'Chaqueta de Jean Oversize · Talla M' },
          author: { type: 'string', example: 'Camila Rojas' },
          message: { type: 'string', example: 'Ofrezco un impermeable para intercambio.' },
          date: { type: 'string', example: 'Hace 2 días' },
          status: { type: 'string', enum: ['Pendiente', 'Aceptado', 'Donado', 'Rechazado', 'Cancelado'], example: 'Pendiente' },
          articuloId: { type: 'string', example: '672f6a15f9a0c1a2e3b4c5d6' },
          solicitanteId: { type: 'string' },
          destinatarioId: { type: 'string' },
        },
      },
      NuevaSolicitud: {
        type: 'object',
        required: ['title', 'message', 'articuloId'],
        properties: {
          title: { type: 'string', example: 'Chaqueta de Jean Oversize' },
          message: { type: 'string', example: 'Tengo una prenda para intercambiar.' },
          type: { type: 'string', enum: ['DONACIÓN', 'INTERCAMBIO'], example: 'INTERCAMBIO' },
          articuloId: { type: 'string' },
          articuloOfrecidoId: { type: 'string' },
        },
      },
      UsuarioRegistro: {
        type: 'object',
        required: ['nombre', 'correo', 'contrasena'],
        properties: {
          nombre: { type: 'string', example: 'Juan José Perez Cespedes' },
          correo: { type: 'string', format: 'email', example: 'juanelpro2005@gmail.com' },
          contrasena: { type: 'string', minLength: 6, example: '123456' },
          phone: { type: 'string', example: '+57 300 123 4567' },
        },
      },
      UsuarioLogin: {
        type: 'object',
        required: ['correo', 'contrasena'],
        properties: {
          correo: { type: 'string', format: 'email', example: 'juanelpro2005@gmail.com' },
          contrasena: { type: 'string', example: '123456' },
        },
      },
      RespuestaError: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Descripción del error' },
          mensaje: { type: 'string', example: 'Descripción del error' },
          errores: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  paths: {
    '/salud': {
      get: {
        tags: ['Salud'],
        summary: 'Comprobar disponibilidad del servidor',
        responses: {
          200: {
            description: 'Servidor operativo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    estado: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/publicaciones': {
      get: {
        tags: ['Publicaciones / Artículos'],
        summary: 'Listar publicaciones con filtros opcionales',
        parameters: [
          { name: 'categoria', in: 'query', schema: { type: 'string' }, description: 'Filtrar por categoría (ej: ROPA, LIBROS)' },
          { name: 'estado', in: 'query', schema: { type: 'string' }, description: 'Filtrar por estado (ej: Disponible, Reservado, Donado)' },
          { name: 'modalidad', in: 'query', schema: { type: 'string' }, description: 'Filtrar por modalidad (Donación, Intercambio)' },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Buscar por término en título, descripción o detalles' },
        ],
        responses: {
          200: {
            description: 'Lista de publicaciones',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Publicacion' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Publicaciones / Artículos'],
        summary: 'Crear una nueva publicación',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NuevaPublicacion' },
            },
          },
        },
        responses: {
          201: {
            description: 'Publicación creada exitosamente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Publicacion' },
              },
            },
          },
          400: {
            description: 'Datos inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RespuestaError' },
              },
            },
          },
        },
      },
    },
    '/publicaciones/mis-publicaciones': {
      get: {
        tags: ['Publicaciones / Artículos'],
        summary: 'Listar las publicaciones del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Publicaciones del usuario',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Publicacion' },
                },
              },
            },
          },
          401: { description: 'Se requiere autenticación' },
        },
      },
    },
    '/publicaciones/{id}': {
      get: {
        tags: ['Publicaciones / Artículos'],
        summary: 'Obtener detalle de publicación por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Detalle de la publicación',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Publicacion' } },
            },
          },
          404: { description: 'Publicación no encontrada' },
        },
      },
      put: {
        tags: ['Publicaciones / Artículos'],
        summary: 'Actualizar publicación completa',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/NuevaPublicacion' } },
          },
        },
        responses: {
          200: { description: 'Publicación actualizada exitosamente' },
          404: { description: 'Publicación no encontrada' },
        },
      },
      patch: {
        tags: ['Publicaciones / Artículos'],
        summary: 'Actualizar campos parciales de una publicación (ej: cambiar status)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'Donado' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Publicación actualizada' },
          404: { description: 'Publicación no encontrada' },
        },
      },
      delete: {
        tags: ['Publicaciones / Artículos'],
        summary: 'Eliminar una publicación',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Eliminada con éxito (sin contenido)' },
          404: { description: 'Publicación no encontrada' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UsuarioLogin' } },
          },
        },
        responses: {
          200: {
            description: 'Inicio de sesión exitoso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    usuario: { type: 'object' },
                  },
                },
              },
            },
          },
          401: { description: 'Credenciales incorrectas' },
          403: { description: 'Cuenta bloqueada por demasiados intentos' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar un nuevo usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UsuarioRegistro' } },
          },
        },
        responses: {
          201: { description: 'Usuario registrado exitosamente' },
          409: { description: 'El correo electrónico ya se encuentra registrado' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Obtener usuario autenticado actual a partir del token JWT',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Datos del usuario autenticado' },
          401: { description: 'Token no proporcionado o inválido' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Autenticación'],
        summary: 'Solicitar PIN de recuperación de contraseña',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['correo'],
                properties: { correo: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'PIN enviado al correo' },
          404: { description: 'Correo no registrado' },
        },
      },
    },
    '/auth/verify-code': {
      post: {
        tags: ['Autenticación'],
        summary: 'Verificar PIN de recuperación',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['correo', 'pin'],
                properties: {
                  correo: { type: 'string' },
                  pin: { type: 'string', example: '1234' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'PIN correcto' },
          400: { description: 'PIN inválido o expirado' },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Autenticación'],
        summary: 'Establecer nueva contraseña',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['correo', 'nuevaContrasena'],
                properties: {
                  correo: { type: 'string' },
                  pin: { type: 'string' },
                  nuevaContrasena: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Contraseña restablecida exitosamente' },
        },
      },
    },
    '/auth/cambiar-contrasena': {
      patch: {
        tags: ['Autenticación'],
        summary: 'Cambiar la contraseña del usuario autenticado',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['contrasenaActual', 'nuevaContrasena'],
                properties: {
                  contrasenaActual: { type: 'string' },
                  nuevaContrasena: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Contraseña actualizada correctamente' },
          400: { description: 'Contraseña actual incorrecta o nueva contraseña insegura' },
          401: { description: 'No autenticado' },
        },
      },
    },
    '/reportes': {
      post: {
        tags: ['Administración'],
        summary: 'Reportar una publicación (usuario autenticado)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['publicacionId', 'motivo'], properties: { publicacionId: { type: 'string' }, motivo: { type: 'string' }, descripcion: { type: 'string' } } } } } },
        responses: { 201: { description: 'Reporte creado' }, 400: { description: 'Datos inválidos' }, 404: { description: 'Publicación no encontrada' } },
      },
      get: {
        tags: ['Administración'],
        summary: 'Listar reportes pendientes o el historial (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'tipo', in: 'query', schema: { type: 'string', enum: ['pendientes', 'historial'] } }],
        responses: { 200: { description: 'Lista de reportes' }, 403: { description: 'Requiere administrador' } },
      },
    },
    '/reportes/{id}': {
      get: {
        tags: ['Administración'],
        summary: 'Detalle de un reporte con datos del reportante y del usuario reportado (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Reporte' }, 404: { description: 'No encontrado' } },
      },
    },
    '/reportes/{id}/ignorar': {
      patch: {
        tags: ['Administración'],
        summary: 'Ignorar un reporte pendiente (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Reporte ignorado' }, 409: { description: 'Ya resuelto' } },
      },
    },
    '/reportes/{id}/eliminar-publicacion': {
      patch: {
        tags: ['Administración'],
        summary: 'Eliminar la publicación reportada y cerrar sus reportes pendientes (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Publicación eliminada' }, 409: { description: 'Ya resuelto' } },
      },
    },
    '/admin/usuarios': {
      get: {
        tags: ['Administración'],
        summary: 'Listar usuarios registrados con su calificación (solo admin)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Usuarios' } },
      },
    },
    '/admin/usuarios/{id}': {
      get: {
        tags: ['Administración'],
        summary: 'Perfil de un usuario con sus publicaciones (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Usuario' }, 404: { description: 'No encontrado' } },
      },
    },
    '/admin/usuarios/{id}/suspension': {
      patch: {
        tags: ['Administración'],
        summary: 'Suspender o reactivar una cuenta (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { suspendido: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Usuario actualizado' } },
      },
    },
    '/admin/donaciones': {
      get: {
        tags: ['Administración'],
        summary: 'Historial de donaciones completadas (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Donaciones' } },
      },
    },
    '/admin/publicaciones/{id}/caducidad': {
      patch: {
        tags: ['Administración'],
        summary: 'Definir en cuántos días vence una publicación (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { diasRestantes: { type: 'integer', minimum: 1, maximum: 365 } } } } } },
        responses: { 200: { description: 'Publicación actualizada' }, 400: { description: 'Días inválidos' } },
      },
    },
    '/admin/publicaciones/{id}': {
      delete: {
        tags: ['Administración'],
        summary: 'Eliminar una publicación y cerrar sus reportes pendientes (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Eliminada' } },
      },
    },
    '/notificaciones': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Notificaciones del usuario autenticado (solicitudes recibidas, caducidad y respuestas)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de notificaciones del usuario' },
          401: { description: 'No autenticado' },
        },
      },
    },
    '/solicitudes/mias': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Listar solicitudes, favoritos y estados del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    enviadas: { type: 'array', items: { $ref: '#/components/schemas/Solicitud' } },
                    recibidas: { type: 'array', items: { $ref: '#/components/schemas/Solicitud' } },
                    historial: { type: 'array', items: { $ref: '#/components/schemas/Solicitud' } },
                    favoritos: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/solicitudes': {
      post: {
        tags: ['Solicitudes'],
        summary: 'Crear solicitud',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/NuevaSolicitud' } },
          },
        },
        responses: {
          201: { description: 'Solicitud creada con éxito' },
        },
      },
    },
    '/solicitudes/{id}': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Obtener solicitud por ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Detalle de la solicitud' },
          404: { description: 'Solicitud no encontrada' },
        },
      },
      patch: {
        tags: ['Solicitudes'],
        summary: 'Actualizar el estado de una solicitud propia o recibida',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['Aceptado', 'Donado', 'Rechazado', 'Cancelado'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Solicitud actualizada' },
        },
      },
    },
    '/solicitudes/{id}/confirmar-intercambio': {
      post: {
        tags: ['Solicitudes'],
        summary: 'Confirmar un intercambio y calificar al solicitante',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['calificacion'],
                properties: { calificacion: { type: 'integer', minimum: 1, maximum: 5 } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Intercambio confirmado y calificación guardada' },
        },
      },
    },
    '/favoritos': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Listar publicaciones favoritas del usuario',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de publicaciones favoritas con días restantes de vigencia' },
        },
      },
      post: {
        tags: ['Solicitudes'],
        summary: 'Agregar una publicación a favoritos',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['articuloId'],
                properties: { articuloId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'Publicación agregada a favoritos' },
        },
      },
    },
    '/favoritos/{articuloId}': {
      delete: {
        tags: ['Solicitudes'],
        summary: 'Quitar una publicación de favoritos',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'articuloId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Publicación quitada de favoritos' },
        },
      },
    },
    '/notificaciones': {
      get: {
        tags: ['Notificaciones'],
        summary: 'Listar notificaciones del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de notificaciones del usuario' },
          401: { description: 'No autorizado' },
        },
      },
    },
    '/notificaciones/no-leidas': {
      get: {
        tags: ['Notificaciones'],
        summary: 'Contar notificaciones no leídas del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Conteo de no leídas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer', example: 2 },
                    hasUnread: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          401: { description: 'No autorizado' },
        },
      },
    },
    '/notificaciones/leer-todas': {
      patch: {
        tags: ['Notificaciones'],
        summary: 'Marcar todas las notificaciones del usuario como leídas',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Todas marcadas como leídas' },
          401: { description: 'No autorizado' },
        },
      },
    },
    '/notificaciones/{id}/leida': {
      patch: {
        tags: ['Notificaciones'],
        summary: 'Marcar una notificación puntual como leída',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Notificación actualizada' },
          404: { description: 'Notificación no encontrada' },
        },
      },
    },
  },
};
