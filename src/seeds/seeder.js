/**
 * ============================================================================
 * SCRIPT MAESTRO DE POBLACIÓN (SEEDER) - ECO-GOLGI & UNIDONA
 * ============================================================================
 * Este script reconstruye automáticamente la base de datos completa en MongoDB Atlas:
 * 1. Crea usuarios base (Administrador, Usuario Regular Juan y Usuario de Comunidad).
 * 2. Carga las 37 publicaciones del catálogo institucional de Eco-Golgi.
 * 3. Asigna las publicaciones personales de prueba a Juan (incluyendo artículos
 *    activos, reservados, caducados a 0 días y escalados a UniDona).
 * 4. Genera solicitudes de intercambio y donación demo.
 * 5. Genera favoritos y notificaciones iniciales.
 *
 * USO:
 *   node src/seeds/seeder.js
 * o mediante:
 *   npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Usuario = require('../models/usuario.models');
const Publicacion = require('../models/publicacion.models');
const Solicitud = require('../models/solicitud.models');
const Favorito = require('../models/favorito.models');
const Notificacion = require('../models/notificacion.models');
const semillasPublicaciones = require('./publicaciones.seed.json');

async function ejecutarSeeder() {
  console.log('====================================================');
  console.log('🌱 INICIANDO SEEDER MAESTRO DE ECO-GOLGI');
  console.log('====================================================');

  try {
    await connectDB();

    console.log('\n👤 1. Sembrando Usuarios...');
    // 1.1 Administrador General
    let admin = await Usuario.findOne({ correo: 'admin@ecogolgi.com' });
    if (!admin) {
      admin = await Usuario.create({
        nombre: 'Administrador Eco-Golgi',
        correo: 'admin@ecogolgi.com',
        contrasena: 'Admin123',
        role: 'admin',
        phone: '+57 300 000 0000',
        rating: 5.0,
        ratingCount: 10,
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      });
      console.log('   ✔ Admin creado: admin@ecogolgi.com / Admin123');
    } else {
      console.log('   ℹ Admin ya existente');
    }

    // 1.2 Usuario Regular (Juan)
    let juan = await Usuario.findOne({ correo: 'juanelpro2005@gmail.com' });
    if (!juan) {
      juan = await Usuario.create({
        nombre: 'Juan José Perez Cespedes',
        correo: 'juanelpro2005@gmail.com',
        contrasena: '123456',
        role: 'user',
        phone: '+57 300 123 4567',
        rating: 4.8,
        ratingCount: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      });
      console.log('   ✔ Usuario Juan creado: juanelpro2005@gmail.com / 123456');
    } else {
      console.log('   ℹ Usuario Juan ya existente');
    }

    // 1.3 Usuario Comunidad (Camila)
    let camila = await Usuario.findOne({ correo: 'camila.rojas@uniminuto.edu.co' });
    if (!camila) {
      camila = await Usuario.create({
        nombre: 'Camila Rojas',
        correo: 'camila.rojas@uniminuto.edu.co',
        contrasena: '123456',
        role: 'user',
        phone: '+57 310 987 6543',
        rating: 4.9,
        ratingCount: 8,
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      });
      console.log('   ✔ Usuario Camila creado: camila.rojas@uniminuto.edu.co / 123456');
    }

    console.log('\n📦 2. Sembrando Catálogo General de Publicaciones...');
    let insertadosCat = 0;
    for (const item of semillasPublicaciones) {
      const existe = await Publicacion.findOne({ codigo: item.codigo });
      if (!existe) {
        await Publicacion.create({
          ...item,
          usuarioId: camila._id,
        });
        insertadosCat++;
      }
    }
    console.log(`   ✔ ${insertadosCat} publicaciones institucionales sembradas.`);

    console.log('\n🏷️ 3. Sembrando Publicaciones Propias de Juan (Mis Publicaciones)...');
    const misPublicacionesJuan = [
      {
        codigo: 'JUAN-001',
        title: 'Reposapies',
        category: 'MUEBLES',
        modality: 'Donación',
        condition: 'Buen Estado',
        description: 'Reposapiés acolchado color celeste, perfecto para estudio ergonómico.',
        details: 'Buen Estado · Donación',
        requests: 0,
        status: 'Disponible',
        daysElapsed: 0,
        expirationDays: 30,
        imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500',
        author: juan.nombre,
        usuarioId: juan._id,
        createdAt: new Date(),
        autorizaDonacion: true,
      },
      {
        codigo: 'JUAN-002',
        title: 'Calculadora cientifica Casio Fx- CG50',
        category: 'ÚTILES ESCOLARES',
        modality: 'Donación',
        condition: 'Buen Estado',
        description: 'Calculadora gráfica a color, excelente estado funcional con pilas incluidas.',
        details: 'Buen Estado · Donación',
        requests: 0,
        status: 'Disponible',
        daysElapsed: 0,
        expirationDays: 30,
        imageUrl: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=500',
        author: juan.nombre,
        usuarioId: juan._id,
        createdAt: new Date(),
        autorizaDonacion: true,
      },
      {
        codigo: 'JUAN-003',
        title: 'Diccionario bilingüe Oxford',
        category: 'LIBROS',
        modality: 'Donación',
        condition: 'Buen estado',
        description: 'Diccionario de inglés-español con tapa dura para carreras universitarias.',
        details: 'Buen estado · Donación',
        requests: 3,
        status: 'Disponible',
        daysElapsed: 6,
        expirationDays: 30,
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500',
        author: juan.nombre,
        usuarioId: juan._id,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        autorizaDonacion: true,
      },
      {
        codigo: 'JUAN-004',
        title: 'Abrigo de paño gris',
        category: 'ROPA',
        modality: 'Intercambio',
        condition: 'Como nuevo',
        description: 'Abrigo de paño formal ideal para clima frío bogotano.',
        details: 'Como nuevo · Intercambio · M · Mujer · Frío',
        requests: 1,
        status: 'Reservado',
        daysElapsed: 22,
        expirationDays: 30,
        imageUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce667883?w=500',
        author: juan.nombre,
        usuarioId: juan._id,
        talla: 'M',
        genero: 'Mujer',
        clima: 'Frío',
        createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
        autorizaDonacion: true,
      },
      {
        codigo: 'JUAN-005',
        title: 'Cuadernos universitarios (x4)',
        category: 'ÚTILES',
        modality: 'Donación',
        condition: 'Nuevo',
        description: 'Paquete de cuatro cuadernos cuadriculados de 100 hojas.',
        details: 'Nuevo · Donación',
        requests: 0,
        status: 'Donado',
        daysElapsed: 30,
        expirationDays: 0,
        imageUrl: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=500',
        author: juan.nombre,
        usuarioId: juan._id,
        createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
        autorizaDonacion: true,
      },
      {
        codigo: 'JUAN-006',
        title: 'Jeans Clásicos Talla 30',
        category: 'ROPA',
        modality: 'Donación',
        condition: 'Con uso',
        description: 'Pantalón jean recto clásico sin detalles.',
        details: 'Con uso · Donación · S · Hombre · Templado',
        requests: 0,
        status: 'Caducado',
        daysElapsed: 30,
        expirationDays: 0,
        imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500',
        author: juan.nombre,
        usuarioId: juan._id,
        talla: 'S',
        genero: 'Hombre',
        clima: 'Templado',
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        autorizaDonacion: true,
      },
    ];

    let juanPubsInsertadas = 0;
    for (const pub of misPublicacionesJuan) {
      const existe = await Publicacion.findOne({ codigo: pub.codigo });
      if (!existe) {
        await Publicacion.create(pub);
        juanPubsInsertadas++;
      }
    }
    console.log(`   ✔ ${juanPubsInsertadas} publicaciones personales de Juan sembradas.`);

    console.log('\n📬 4. Sembrando Solicitudes Demo...');
    const pubDiccionario = await Publicacion.findOne({ codigo: 'JUAN-003' });
    const pubAbrigo = await Publicacion.findOne({ codigo: 'JUAN-004' });

    if (pubDiccionario) {
      const solExistente = await Solicitud.findOne({ articuloId: pubDiccionario._id.toString() });
      if (!solExistente) {
        await Solicitud.create([
          {
            type: 'DONACIÓN',
            title: 'Solicitud de Diccionario de Inglés',
            author: 'Camila Rojas',
            message: 'Hola Juan, estoy cursando Inglés IV y me sería de gran ayuda este diccionario.',
            status: 'Pendiente',
            solicitanteId: camila._id,
            destinatarioId: juan._id,
            articuloId: pubDiccionario._id.toString(),
          },
          {
            type: 'DONACIÓN',
            title: 'Interesado en el Diccionario',
            author: 'Carlos Medina',
            message: 'Hola, ¿aún está disponible para entrega en la sede principal?',
            status: 'Pendiente',
            solicitanteId: camila._id,
            destinatarioId: juan._id,
            articuloId: pubDiccionario._id.toString(),
          },
          {
            type: 'DONACIÓN',
            title: 'Solicitud para biblioteca comunitaria',
            author: 'Mariana Duarte',
            message: 'Hola Juan, lo necesitamos para apoyo de lecturas en primer semestre.',
            status: 'Pendiente',
            solicitanteId: camila._id,
            destinatarioId: juan._id,
            articuloId: pubDiccionario._id.toString(),
          },
        ]);
        console.log('   ✔ 3 solicitudes demo vinculadas al Diccionario de Juan.');
      }
    }

    if (pubAbrigo) {
      const solAbrigo = await Solicitud.findOne({ articuloId: pubAbrigo._id.toString() });
      if (!solAbrigo) {
        await Solicitud.create({
          type: 'INTERCAMBIO',
          title: 'Trueque por Chaqueta impermeable',
          author: 'Camila Rojas',
          message: 'Hola Juan, me encanta tu abrigo de paño. Te ofrezco a cambio mi chaqueta impermeable.',
          status: 'Aceptado',
          solicitanteId: camila._id,
          destinatarioId: juan._id,
          articuloId: pubAbrigo._id.toString(),
        });
        console.log('   ✔ 1 solicitud aceptada demo vinculada al Abrigo de Juan.');
      }
    }

    console.log('\n❤️ 5. Sembrando Favoritos Demo...');
    if (pubDiccionario) {
      const favExiste = await Favorito.findOne({ usuarioId: juan._id, articuloId: pubDiccionario._id.toString() });
      if (!favExiste) {
        await Favorito.create({
          usuarioId: juan._id,
          articuloId: pubDiccionario._id.toString(),
        });
        console.log('   ✔ Favorito agregado para Juan.');
      }
    }

    console.log('\n🔔 6. Sembrando Notificaciones Iniciales...');
    const notifExiste = await Notificacion.findOne({ usuarioId: juan._id });
    if (!notifExiste) {
      await Notificacion.create([
        {
          usuarioId: juan._id,
          title: '¡Bienvenido a Eco-Golgi!',
          message: 'Tu cuenta ha sido configurada exitosamente. Empieza a circular prendas y libros hoy.',
          type: 'sistema',
          leida: false,
          link: '/explorar',
        },
        {
          usuarioId: juan._id,
          title: 'Nueva solicitud recibida',
          message: 'Camila Rojas ha solicitado tu publicación "Diccionario bilingüe Oxford".',
          type: 'solicitud',
          leida: false,
          link: '/solicitudes/recibidas',
        },
      ]);
      console.log('   ✔ Notificaciones iniciales creadas.');
    }

    console.log('\n====================================================');
    console.log('🎉 BASE DE DATOS DE ECO-GOLGI POBLADA CON ÉXITO');
    console.log('====================================================');
    console.log('Credenciales listas para usar:');
    console.log('  🛡️ Admin:   admin@ecogolgi.com / Admin123');
    console.log('  👤 Usuario: juanelpro2005@gmail.com / 123456');
    console.log('====================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal al ejecutar el seeder:', error.message);
    process.exit(1);
  }
}

ejecutarSeeder();
