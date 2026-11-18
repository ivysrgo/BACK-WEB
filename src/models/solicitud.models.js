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
      enum: ['Pendiente', 'Aceptado', 'Donado', 'Rechazado', 'Cancelado'],
      default: 'Pendiente',
    },
    solicitanteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    destinatarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    articuloId: {
      type: String,
      required: true,
    },
    articuloOfrecidoId: {
      type: String,
      default: null,
    },
    calificacion: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    solicitanteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
    },
    propietarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
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
      },
    },
  }
);

const Solicitud = mongoose.model('Solicitud', solicitudSchema);

module.exports = Solicitud;
