const mongoose = require('mongoose');

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      console.error('❌ ERROR: La variable de entorno MONGO_URI no está definida en el archivo .env.');
      process.exit(1);
    }

    if (uri.includes('<USUARIO>') || uri.includes('<PASSWORD>')) {
      console.error('⚠️ ATENCIÓN: Debes reemplazar <USUARIO> y <PASSWORD> en tu archivo .env con tus credenciales de MongoDB Atlas.');
      console.error('Ejemplo: MONGO_URI=mongodb+srv://admin:MiClaveSegura123@cluster0.abcde.mongodb.net/ecogolgi_db?retryWrites=true&w=majority\n');
      process.exit(1);
    }

    const conn = await mongoose.connect(uri);
    console.log(`🌐 MongoDB Atlas Conectado exitosamente: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB Atlas:', error.message);
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('👉 Tip: Revisa que tu usuario y contraseña de MongoDB Atlas sean correctos.');
    } else if (error.message.includes('queryTxt ETIMEOUT') || error.message.includes('ENOTFOUND')) {
      console.error('👉 Tip: Revisa que hayas añadido tu dirección IP (o 0.0.0.0/0) en Network Access de MongoDB Atlas.');
    }
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  conectarDB: connectDB,
};
