const MAX_DIMENSION = 2000;
const JPEG_QUALITY  = 0.8;

/**
 * Compresses an image File using the Canvas API before upload.
 * - PDFs and non-image files are returned unchanged.
 * - Resizes so the longest side is at most 2000px, preserving aspect ratio.
 * - Re-encodes as JPEG at 80% quality.
 * - On any failure, returns the original file (safe fallback).
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const imageBitmap = await createImageBitmap(file);
    const { width, height } = imageBitmap;

    let targetWidth  = width;
    let targetHeight = height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width >= height) {
        targetWidth  = MAX_DIMENSION;
        targetHeight = Math.round((height / width) * MAX_DIMENSION);
      } else {
        targetHeight = MAX_DIMENSION;
        targetWidth  = Math.round((width / height) * MAX_DIMENSION);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width  = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) { imageBitmap.close(); return file; }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
    imageBitmap.close();

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );

    if (!blob) return file;

    const dotIndex = file.name.lastIndexOf('.');
    const baseName = dotIndex > 0 ? file.name.substring(0, dotIndex) : file.name;

    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
