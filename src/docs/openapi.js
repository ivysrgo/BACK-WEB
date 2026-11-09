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
    { name: 'Autenticación', description: 'Registro, inicio de sesión y recuperación de contraseña' },
    { name: 'Salud', description: 'Comprobación de estado del servicio' },
  ],
  components: {
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
          status: { type: 'string', enum: ['Pendiente', 'Aceptado', 'Donado', 'Rechazado'], example: 'Pendiente' },
          esFavorito: { type: 'boolean', example: true },
          daysRemaining: { type: 'integer', example: 4 },
        },
      },
      NuevaSolicitud: {
        type: 'object',
        required: ['title', 'message'],
        properties: {
          title: { type: 'string', example: 'Chaqueta de Jean Oversize' },
          message: { type: 'string', example: 'Tengo una prenda para intercambiar.' },
          type: { type: 'string', example: 'INTERCAMBIO' },
          author: { type: 'string', example: 'Usuario de la comunidad' },
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
    '/solicitudes': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Listar solicitudes',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Solicitud' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Solicitudes'],
        summary: 'Crear solicitud',
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
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Detalle de la solicitud' },
          404: { description: 'Solicitud no encontrada' },
        },
      },
      patch: {
        tags: ['Solicitudes'],
        summary: 'Actualizar solicitud (estado, favorito)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['Pendiente', 'Aceptado', 'Donado', 'Rechazado'] },
                  esFavorito: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Solicitud actualizada' },
        },
      },
      delete: {
        tags: ['Solicitudes'],
        summary: 'Eliminar solicitud',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Eliminada con éxito' },
        },
      },
    },
  },
};
