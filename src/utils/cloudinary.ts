import { unlink } from "node:fs/promises";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Завантажує тимчасовий файл на Cloudinary і видаляє його з uploads/.
 * Повертає тільки рядок secure_url для збереження в БД.
 */
export async function uploadToCloudinary(filePath: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "announcements",
      resource_type: "image",
    });
    return result.secure_url;
  } finally {
    // Гарантоване видалення тимчасового файлу навіть у разі збою завантаження
    await unlink(filePath).catch(() => {});
  }
}