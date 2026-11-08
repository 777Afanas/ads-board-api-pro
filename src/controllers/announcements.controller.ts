import type { Request, Response } from "express";
import prisma from "../../prisma/client.js";
import logger from "../logger.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const PER_PAGE = 10;

const userSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
};

export async function listAnnouncements(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const search = req.query.search as string | undefined;
  const sort = req.query.sort === "oldest" ? "asc" : "desc";

  const where = search
    ? { title: { contains: search, mode: "insensitive" as const } }
    : {};

  const [total, data] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { createdAt: sort },
      include: { user: { select: userSelect } },
    }),
  ]);

  return res.status(200).json({
    data,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / PER_PAGE) || 1,
      perPage: PER_PAGE,
    },
  });
}

export async function getAnnouncement(req: Request, res: Response) {
  const id = Number(req.params.id);

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: { user: { select: userSelect } },
  });

  if (!announcement) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  return res.status(200).json(announcement);
}

export async function createAnnouncement(req: Request, res: Response) {
  const data: Record<string, any> = {
    ...req.body,     
    userId: req.user!.sub,
  };

  // Якщо передано файл: завантажуємо на Cloudinary і логуємо подію (Вимоги 2 і 3)
  if (req.file) {
    data.imageUrl = await uploadToCloudinary(req.file.path);
    logger.info({ imageUrl: data.imageUrl }, "Фото успішно завантажено");
  }

  const announcement = await prisma.announcement.create({
    data: data as any,
    include: { user: { select: userSelect } },
  });

  // Логування створення оголошення (Вимога 2)
  logger.info({ announcementId: announcement.id }, "Оголошення успішно створено");

  return res.status(201).json(announcement);
}

export async function updateAnnouncement(req: Request, res: Response) {
  // Якщо немає жодного текстового поля і не передано файл фото
  const hasBodyFields = Object.keys(req.body).length > 0;
  if (!hasBodyFields && !req.file) {
    return res.status(400).json({
      error: "Validation failed",
      message: "At least one field or image must be provided to update",
    });
  }
    
  const id = Number(req.params.id);

  const announcement = await prisma.announcement.findUnique({ where: { id } });

  if (!announcement) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  if (announcement.userId !== req.user!.sub) {
    return res.status(403).json({ message: "Access denied" });
  }

  const data: Record<string, any> = { ...req.body };

  // Якщо при оновленні передано нове фото — завантажуємо і логуємо
  if (req.file) {
    data.imageUrl = await uploadToCloudinary(req.file.path);
    logger.info({ imageUrl: data.imageUrl }, "Фото успішно завантажено");
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data,
    include: { user: { select: userSelect } },
  });

  return res.status(200).json(updated);
}

export async function deleteAnnouncement(req: Request, res: Response) {
  const id = Number(req.params.id);

  const announcement = await prisma.announcement.findUnique({ where: { id } });

  if (!announcement) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  if (announcement.userId !== req.user!.sub) {
    return res.status(403).json({ message: "Access denied" });
  }

  await prisma.announcement.delete({ where: { id } });

  return res.status(204).end();
}

export const getAnnouncements = listAnnouncements;