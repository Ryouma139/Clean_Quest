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
