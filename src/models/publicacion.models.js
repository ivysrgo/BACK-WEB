const mongoose = require('mongoose');

const publicacionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      minlength: [3, 'El título debe tener al menos 3 caracteres'],
    },
    category: {
      type: String,
      required: true,
      default: 'ROPA',
      trim: true,
    },
    modality: {
      type: String,
      enum: ['Donación', 'Intercambio', 'DONACIÓN', 'INTERCAMBIO'],
      default: 'Donación',
    },
    condition: {
      type: String,
      enum: ['Nuevo', 'Como nuevo', 'Buen Estado', 'Buen estado', 'Usado', 'Con uso', 'Nuevo con etiqueta'],
      default: 'Buen Estado',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    details: {
      type: String,
      default: '',
      trim: true,
    },
    requests: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Disponible', 'Reservado', 'Donado', 'Caducado'],
      default: 'Disponible',
    },
    daysElapsed: {
      type: Number,
      default: 0,
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=500&q=80',
    },
    author: {
      type: String,
      default: 'Juan José Perez Cespedes',
      trim: true,
    },
    publishedAt: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    tags: [{
      type: String,
      trim: true,
    }],
    talla: {
      type: String,
      default: '',
      trim: true,
    },
    genero: {
      type: String,
      default: '',
      trim: true,
    },
    clima: {
      type: String,
      default: '',
      trim: true,
    },
    autorizaDonacion: {
      type: Boolean,
      default: true,
    },
    // Compatibilidad adicional con vistas legacy o variantes de frontend
    codigo: {
      type: String,
      default: '',
      trim: true,
    },
    categoriaPrenda: {
      type: String,
      default: '',
      trim: true,
    },
    modalidad: {
      type: String,
      default: '',
      trim: true,
    },
    estadoFisico: {
      type: String,
      default: '',
      trim: true,
    },
    ubicacion: {
      type: String,
      default: '',
      trim: true,
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

// Generación automática de details si no se envía explícitamente
publicacionSchema.pre('save', function () {
  if (!this.details || this.details.trim() === '') {
    const estado = this.condition || this.estadoFisico || 'Buen Estado';
    const mod = this.modality || this.modalidad || 'Donación';
    const tagList = Array.isArray(this.tags) && this.tags.length > 0 ? this.tags.join(', ') : '';
    this.details = [estado, mod, tagList].filter(Boolean).join(' · ');
  }
});

const Publicacion = mongoose.model('Publicacion', publicacionSchema);

module.exports = Publicacion;
