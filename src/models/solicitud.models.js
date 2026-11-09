const mongoose = require('mongoose');

const solicitudSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['DONACIÓN', 'INTERCAMBIO', 'Donación', 'Intercambio', 'Adquisicion'],
      default: 'DONACIÓN',
    },
    title: {
      type: String,
      required: [true, 'El título de la solicitud es obligatorio'],
      trim: true,
    },
    author: {
      type: String,
      default: 'Usuario de la comunidad',
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'El mensaje de la solicitud es obligatorio'],
      trim: true,
    },
    date: {
      type: String,
      default: () => new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
    },
    status: {
      type: String,
      enum: ['Pendiente', 'Aceptado', 'Donado', 'Rechazado'],
      default: 'Pendiente',
    },
    articuloId: {
      type: String,
      default: null,
    },
    articuloOfrecidoId: {
      type: String,
      default: null,
    },
    esFavorito: {
      type: Boolean,
      default: false,
    },
    daysRemaining: {
      type: Number,
      default: 15,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        ret.isFavorite = ret.esFavorito;
        delete ret._id;
      },
    },
  }
);

const Solicitud = mongoose.model('Solicitud', solicitudSchema);

module.exports = Solicitud;
