const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    correo: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    contrasena: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'user', 'Administrador', 'Miembro de la comunidad'],
        message: '{VALUE} no es un rol válido. Debe ser admin o user.',
      },
      default: 'user',
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    rating: {
      type: Number,
      default: 5,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    intentosFallidos: {
      type: Number,
      default: 0,
    },
    bloqueado: {
      type: Boolean,
      default: false,
    },
    pinRecuperacion: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.contrasena;
        delete ret.pinRecuperacion;
        if (ret.role === 'Administrador') ret.role = 'admin';
        if (ret.role === 'Miembro de la comunidad') ret.role = 'user';
      },
    },
  }
);

usuarioSchema.pre('save', async function () {
  if (!this.isModified('contrasena')) return;

  if (/^\$2[ab]\$\d+\$/.test(this.contrasena)) return;

  const salt = await bcrypt.genSalt(10);
  this.contrasena = await bcrypt.hash(this.contrasena, salt);
});

usuarioSchema.methods.compararContrasena = async function (candidata) {
  if (!this.contrasena || !candidata) return false;

  const esHash = /^\$2[ab]\$\d+\$/.test(this.contrasena);
  if (esHash) {
    return await bcrypt.compare(candidata, this.contrasena);
  }

  if (this.contrasena === candidata) {
    const salt = await bcrypt.genSalt(10);
    this.contrasena = await bcrypt.hash(candidata, salt);
    await this.save();
    return true;
  }

  return false;
};

usuarioSchema.methods.esAdmin = function () {
  return this.role === 'admin' || this.role === 'Administrador';
};

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;