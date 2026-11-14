/** アップロード前に縮小する最大サイズ（長辺 px） */
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/**
 * 写真を長辺 1600px 以内の JPEG に縮小する（容量と通信量を減らすため）。
 * スマホ写真の向き（EXIF）も反映する。縮小できない場合は元のファイルを返す。
 */
export async function resizeImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas not supported");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("toBlob failed");
    return blob;
  } catch {
    if (!ALLOWED.includes(file.type)) throw new Error("unsupported image type");
    return file;
  }
}

/**
 * アイコン用：画像の中央を正方形に切り抜き、size×size の JPEG にする（スマホ写真の向きも反映）。
 */
export async function cropSquare(file: File, size = 256): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("unsupported image type");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");
  ctx.fillStyle = "#fff"; // 透過PNGの背景を白に
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("unsupported image type");
  return blob;
}
