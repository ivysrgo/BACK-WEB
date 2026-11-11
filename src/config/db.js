const mongoose = require('mongoose');
const dns = require('dns');

// Las URI SRV de Atlas pueden necesitar DNS explícito; la conexión local no.
if (process.env.MONGO_URI?.startsWith('mongodb+srv://')) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      console.error('❌ ERROR: La variable de entorno MONGO_URI no está definida en el archivo .env.');
      process.exit(1);
    }

    if (uri.includes('<USUARIO>') || uri.includes('<PASSWORD>')) {
      console.error('⚠️ ATENCIÓN: Debes reemplazar <USUARIO> y <PASSWORD> en tu archivo .env con tus credenciales de MongoDB Atlas.');
      process.exit(1);
    }

    const conn = await mongoose.connect(uri, {
      dbName: 'ecogolgi',
    });
    console.log(`MongoDB conectado: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB:', error.message);
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('👉 Tip: Revisa que tu usuario y contraseña de MongoDB Atlas sean correctos.');
    } else if (error.message.includes('queryTxt ETIMEOUT') || error.message.includes('ENOTFOUND')) {
      console.error('👉 Tip: Revisa que hayas añadido tu dirección IP (o 0.0.0.0/0) en Network Access de MongoDB Atlas.');
    } else if (uri.startsWith('mongodb://')) {
      console.error('👉 Tip: Verifica que MongoDB Community Server esté iniciado y que MONGO_URI apunte al host y puerto correctos.');
    }
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  conectarDB: connectDB,
};
