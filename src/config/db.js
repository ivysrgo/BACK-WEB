const mongoose = require('mongoose');
const dns = require('dns');

// En entornos Windows, las consultas SRV de MongoDB Atlas a veces fallan con ECONNREFUSED
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignorar si el entorno del sistema no permite reasignar servidores DNS
}

async function connectDB() {
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      const msg = 'La variable de entorno MONGO_URI no está definida.';
      console.error(`❌ ERROR: ${msg}`);
      if (process.env.VERCEL) throw new Error(msg);
      process.exit(1);
    }

    if (uri.includes('<USUARIO>') || uri.includes('<PASSWORD>')) {
      const msg = 'Debes reemplazar <USUARIO> y <PASSWORD> con tus credenciales de MongoDB Atlas.';
      console.error(`⚠️ ATENCIÓN: ${msg}`);
      if (process.env.VERCEL) throw new Error(msg);
      process.exit(1);
    }

    const conn = await mongoose.connect(uri, {
      dbName: 'ecogolgi',
    });
    console.log(`🌐 MongoDB Atlas conectado exitosamente: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB Atlas:', error.message);
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('👉 Tip: Revisa que tu usuario y contraseña de MongoDB Atlas sean correctos.');
    } else if (error.message.includes('queryTxt ETIMEOUT') || error.message.includes('ENOTFOUND')) {
      console.error('👉 Tip: Revisa que hayas añadido tu dirección IP (o 0.0.0.0/0) en Network Access de MongoDB Atlas.');
    }
    if (process.env.VERCEL) throw error;
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  conectarDB: connectDB,
};