import { z } from "../openapi.js";
import { publicUserSchema } from "./auth.validator.js";

export const CATEGORIES = ["sale", "service", "job", "other"] as const;

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(3).max(100).openapi({ example: "Selling a bicycle" }),
    description: z.string().trim().min(10).max(1000).openapi({ example: "Mountain bike, 21 speeds" }),
    price: z.number().positive().openapi({ example: 8000 }),
    category: z.string().min(1).openapi({ example: "sale" }),
  })
  .openapi("CreateAnnouncementRequest");

// Забороняє порожній об'єкт {} при оновленні (PATCH)
export const updateAnnouncementSchema = createAnnouncementSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Body must contain at least one field to update",
  })
  .openapi("UpdateAnnouncementRequest");

export const announcementIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "ID must be a positive integer")
    .transform(Number)
    .openapi({ example: 1 as any }),
});

export const listAnnouncementsQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .default("1")
    .transform(Number),    
  search: z.string().trim().optional().openapi({ description: "Case-insensitive search by title" }),
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
});

// Аліаси для зворотної сумісності із завданням
export const announcementParamsSchema = announcementIdSchema;
export const announcementQuerySchema = listAnnouncementsQuerySchema;

export const announcementSchema = z
  .object({
    id: z.number().int().openapi({ example: 6 }),
    title: z.string().min(3).max(100),
    description: z.string().min(10).max(1000),
    price: z.number().positive(),
    category: z.string().min(1),
    createdAt: z.iso.datetime().openapi({ example: "2025-01-11T10:00:00.000Z" }),
    updatedAt: z.iso.datetime().openapi({ example: "2025-01-11T10:00:00.000Z" }),
    user: publicUserSchema,
  })
  .openapi("Announcement");

export const announcementListSchema = z
  .object({
    data: z.array(announcementSchema),
    pagination: z.object({
      total: z.number().int().openapi({ example: 23 }),
      page: z.number().int().openapi({ example: 2 }),
      totalPages: z.number().int().openapi({ example: 3 }),
      perPage: z.number().int().openapi({ example: 10 }),
    }),
  })
  .openapi("AnnouncementList");

export type CreateAnnouncementBody = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementBody = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementIdParams = z.infer<typeof announcementIdSchema>;
export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>;