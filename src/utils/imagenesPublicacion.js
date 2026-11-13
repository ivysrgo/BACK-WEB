const { randomUUID } = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const HttpError = require('./HttpError');

const directorioImagenes = path.join(__dirname, '..', '..', 'uploads', 'publicaciones');
const MAX_IMAGENES = 5;
const MAX_BYTES_POR_IMAGEN = 5 * 1024 * 1024;
const MAX_BYTES_TOTALES = 20 * 1024 * 1024;
const FIRMAS = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};

function decodificarImagen(dataUrl) {
  if (typeof dataUrl !== 'string') {
    throw new HttpError(400, 'El formato de una imagen no es válido');
  }

  const coincidencia = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl);
  if (!coincidencia) {
    throw new HttpError(400, 'Solo se permiten imágenes JPG o PNG válidas');
  }

  const tipo = coincidencia[1].toLowerCase();
  const contenido = Buffer.from(coincidencia[2], 'base64');
  if (
    contenido.length === 0 ||
    contenido.length > MAX_BYTES_POR_IMAGEN ||
    contenido.toString('base64') !== coincidencia[2] ||
    !contenido.subarray(0, FIRMAS[tipo].length).equals(FIRMAS[tipo])
  ) {
    throw new HttpError(400, 'Una imagen está vacía, excede 5 MB o no coincide con su formato');
  }

  return { tipo, contenido };
}

async function guardarImagenesPublicacion(images) {
  if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGENES) {
    throw new HttpError(400, `Debes enviar entre 1 y ${MAX_IMAGENES} imágenes`);
  }

  const imagenes = images.map(decodificarImagen);
  const bytesTotales = imagenes.reduce((total, imagen) => total + imagen.contenido.length, 0);
  if (bytesTotales > MAX_BYTES_TOTALES) {
    throw new HttpError(400, 'El tamaño total de las imágenes no debe superar 20 MB');
  }

  await fs.mkdir(directorioImagenes, { recursive: true });
  const guardadas = [];

  try {
    for (const imagen of imagenes) {
      const nombre = `${randomUUID()}.${imagen.tipo === 'jpeg' ? 'jpg' : 'png'}`;
      const archivo = path.join(directorioImagenes, nombre);
      await fs.writeFile(archivo, imagen.contenido, { flag: 'wx' });
      guardadas.push({ archivo, url: `/uploads/publicaciones/${nombre}` });
    }
    return guardadas;
  } catch (error) {
    await eliminarImagenesPublicacion(guardadas);
    throw error;
  }
}

async function eliminarImagenesPublicacion(imagenes) {
  await Promise.all(imagenes.map(({ archivo }) => fs.unlink(archivo)));
}

module.exports = {
  guardarImagenesPublicacion,
  eliminarImagenesPublicacion,
};
