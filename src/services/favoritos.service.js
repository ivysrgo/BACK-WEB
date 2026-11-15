const Favorito = require('../models/favorito.models');
const Publicacion = require('../models/publicacion.models');
const HttpError = require('../utils/HttpError');

const MILISEGUNDOS_POR_DIA = 86_400_000;

function calcularDiasRestantes(articulo) {
  const fechaPublicacion = articulo.createdAt
    ? new Date(articulo.createdAt)
    : new Date(articulo.publishedAt);
  if (Number.isNaN(fechaPublicacion.getTime())) return 0;
  const fechaCaducidad = fechaPublicacion.getTime() + (articulo.expirationDays ?? 30) * MILISEGUNDOS_POR_DIA;
  return Math.ceil((fechaCaducidad - Date.now()) / MILISEGUNDOS_POR_DIA);
}

async function listar(usuarioId) {
  const favoritos = await Favorito.find({ usuarioId }).sort({ createdAt: -1 });
  const articulos = await Publicacion.find({
    _id: { $in: favoritos.map((favorito) => favorito.articuloId) },
  });
  const articulosPorId = new Map(articulos.map((articulo) => [String(articulo.id), articulo]));

  return favoritos.flatMap((favorito) => {
    const articulo = articulosPorId.get(String(favorito.articuloId));
    if (!articulo) return [];

    return [{
      id: articulo.id,
      articleId: articulo.id,
      title: articulo.title,
      category: articulo.category,
      modality: articulo.modality,
      author: articulo.author,
      description: articulo.description,
      imageUrl: articulo.imageUrl,
      status: articulo.status,
      daysRemaining: calcularDiasRestantes(articulo),
    }];
  });
}

async function agregar(articuloId, usuarioId) {
  const articulo = await Publicacion.findById(articuloId);
  if (!articulo) throw new HttpError(404, 'Publicación no encontrada');

  await Favorito.updateOne(
    { usuarioId, articuloId: articulo.id },
    { $setOnInsert: { usuarioId, articuloId: articulo.id } },
    { upsert: true }
  );
  return { articleId: articulo.id };
}

async function eliminar(articuloId, usuarioId) {
  await Favorito.deleteOne({ usuarioId, articuloId });
}

module.exports = {
  listar,
  agregar,
  eliminar,
};
