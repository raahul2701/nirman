export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export async function compressImage(
  file: File,
  {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    mimeType = 'image/jpeg',
  }: ImageCompressionOptions = {}
) {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
  return blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: mimeType }) : file;
}
