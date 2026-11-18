const mongoose = require('mongoose');

const favoritoSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    articuloId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Publicacion',
      required: true,
    },
  },
  { timestamps: true }
);

favoritoSchema.index({ usuarioId: 1, articuloId: 1 }, { unique: true });

module.exports = mongoose.model('Favorito', favoritoSchema);
