import { unlink } from "node:fs/promises";
import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export const validateBody =
  (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Якщо multer вже встиг зберегти тимчасовий файл — видаляємо його
      if (req.file) {
        await unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({ errors: result.error.issues });
    }

    req.body = result.data;
    next();
  };

export const validateParams =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    req.params = result.data as Record<string, string>;
    next();
  };

export const validateQuery =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    // Переопределяем свойство query, чтобы обойти ограничение "getter only"
    Object.defineProperty(req, "query", {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    // req.query = result.data as Record<string, any>;
    next();
  };