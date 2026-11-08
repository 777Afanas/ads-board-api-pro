import { randomUUID } from "node:crypto";
import path from "node:path";
import createHttpError from "http-errors";
import multer from "multer";

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname);
    callback(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, callback) {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(createHttpError(400, "Only image files are allowed"));
    }
  },
});

export const uploadMiddleware = upload.single("image");