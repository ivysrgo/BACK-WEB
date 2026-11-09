const mongoose = require('mongoose');

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
      default: 'Miembro de la comunidad',
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
      },
    },
  }
);

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;
