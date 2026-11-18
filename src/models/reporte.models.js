const mongoose = require('mongoose');

// Copia de la publicación al momento de reportarla: así el historial de
// reportes se sigue viendo aunque el administrador elimine la publicación.
const publicacionReportadaSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    modality: { type: String, default: 'Donación' },
    category: { type: String, default: '' },
    condition: { type: String, default: '' },
    description: { type: String, default: '' },
    author: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { _id: false }
);

const reporteSchema = new mongoose.Schema(
  {
    publicacionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Publicacion',
      required: true,
    },
    reportanteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    reportadoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
    },
    motivo: {
      type: String,
      required: [true, 'El motivo del reporte es obligatorio'],
      trim: true,
    },
    descripcion: {
      type: String,
      default: '',
      trim: true,
    },
    estado: {
      type: String,
      enum: ['Pendiente', 'Eliminada', 'Ignorado'],
      default: 'Pendiente',
    },
    resueltoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
    },
    resueltoEn: {
      type: Date,
      default: null,
    },
    publicacion: {
      type: publicacionReportadaSchema,
      default: () => ({}),
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

reporteSchema.index({ estado: 1, createdAt: -1 });
reporteSchema.index({ publicacionId: 1, reportanteId: 1, estado: 1 });

module.exports = mongoose.model('Reporte', reporteSchema);
