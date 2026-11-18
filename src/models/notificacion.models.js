const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El ID de usuario es obligatorio'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'El mensaje es obligatorio'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['intercambio', 'donacion', 'solicitud', 'caducar', 'sistema'],
      default: 'intercambio',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    referenciaId: {
      type: String,
      default: null,
    },
    link: {
      type: String,
      default: '/publicaciones',
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

const Notificacion = mongoose.model('Notificacion', notificacionSchema);

module.exports = Notificacion;
