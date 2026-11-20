const mongoose = require('mongoose');
const Favorito = require('../models/favorito.models');
const Publicacion = require('../models/publicacion.models');
const Solicitud = require('../models/solicitud.models');
const Usuario = require('../models/usuario.models');
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

  const authorUserIds = [...new Set(articulos.map((a) => a.usuarioId).filter(Boolean).map(String))];
  const usuarios = await Usuario.find({ _id: { $in: authorUserIds } }, 'nombre avatarUrl');
  const userMap = new Map(usuarios.map((u) => [String(u._id), u]));

  return favoritos.flatMap((favorito) => {
    const articulo = articulosPorId.get(String(favorito.articuloId));
    if (!articulo) return [];

    const autorDoc = articulo.usuarioId ? userMap.get(String(articulo.usuarioId)) : null;

    return [{
      id: articulo.id,
      articleId: articulo.id,
      title: articulo.title,
      category: articulo.category,
      modality: articulo.modality,
      author: articulo.author,
      authorId: articulo.usuarioId ? String(articulo.usuarioId) : undefined,
      authorAvatarUrl: autorDoc?.avatarUrl || '',
      description: articulo.description,
      imageUrl: articulo.imageUrl,
      status: articulo.status,
      daysRemaining: calcularDiasRestantes(articulo),
    }];
  });
}

async function agregar(articuloId, usuarioId) {
  let articulo = null;
  if (mongoose.Types.ObjectId.isValid(articuloId)) {
    articulo = await Publicacion.findById(articuloId);
    if (!articulo) {
      const solicitud = await Solicitud.findById(articuloId);
      if (solicitud && solicitud.articuloId) {
        articulo = await Publicacion.findById(solicitud.articuloId);
      }
    }
  }
  if (!articulo) throw new HttpError(404, 'Publicación no encontrada');

  if (articulo.usuarioId && String(articulo.usuarioId) === String(usuarioId)) {
    throw new HttpError(400, 'No puedes agregar a favoritos tus propias publicaciones');
  }

  await Favorito.updateOne(
    { usuarioId, articuloId: articulo.id },
    { $setOnInsert: { usuarioId, articuloId: articulo.id } },
    { upsert: true }
  );
  return { articleId: articulo.id };
}

async function eliminar(articuloId, usuarioId) {
  let idAlterno = articuloId;
  if (mongoose.Types.ObjectId.isValid(articuloId)) {
    const solicitud = await Solicitud.findById(articuloId);
    if (solicitud && solicitud.articuloId) {
      idAlterno = String(solicitud.articuloId);
    }
  }
  await Favorito.deleteMany({
    usuarioId,
    articuloId: { $in: [articuloId, idAlterno] },
  });
}

module.exports = {
  listar,
  agregar,
  eliminar,
};
