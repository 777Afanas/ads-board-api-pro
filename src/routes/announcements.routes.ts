import { Router } from "express";
import { z } from "zod";
import * as announcementsController from "../controllers/announcements.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { uploadMiddleware } from "../middleware/upload.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  errorResponse,
  jsonContent,
  registry,
  validationErrorResponse,
} from "../openapi.js";
import {
  announcementIdSchema,
  announcementListSchema,
  announcementSchema,
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  updateAnnouncementSchema,
} from "../validators/announcements.validator.js";

const router = Router();

router.get(
  "/",
  validateQuery(listAnnouncementsQuerySchema),
  announcementsController.listAnnouncements,
);

router.get(
  "/:id",
  validateParams(announcementIdSchema),
  announcementsController.getAnnouncement,
);

// uploadMiddleware до validateBody, multer розпарсив поля форми в req.body
router.post(
  "/",
  authenticate,
  uploadMiddleware,
  validateBody(createAnnouncementSchema),
  announcementsController.createAnnouncement,
);

router.patch(
  "/:id",
  authenticate,
  uploadMiddleware,
  validateParams(announcementIdSchema),
  validateBody(updateAnnouncementSchema),
  announcementsController.updateAnnouncement,
);

router.delete(
  "/:id",
  authenticate,
  validateParams(announcementIdSchema),
  announcementsController.deleteAnnouncement,
);

export default router;

const unauthorized = errorResponse("Missing or invalid access token");
const notFound = errorResponse("Announcement not found");
const forbidden = errorResponse("Access denied");

registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "List announcements with pagination, search and sorting",
  request: { query: listAnnouncementsQuerySchema },
  responses: {
    200: { description: "Paginated list (10 per page)", ...jsonContent(announcementListSchema) },
    400: validationErrorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get an announcement by ID",
  request: { params: announcementIdSchema },
  responses: {
    200: { description: "Announcement", ...jsonContent(announcementSchema) },
    400: validationErrorResponse,
    404: notFound,
  },
});

// Реєстрація multipart/form-data для POST
registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Create an announcement with optional photo",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: createAnnouncementSchema.extend({
            image: z.string().openapi({
              type: "string",
              format: "binary",
              description: "Optional announcement image file",
            }).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Announcement created", ...jsonContent(announcementSchema) },
    400: validationErrorResponse,
    401: unauthorized,
  },
});

// Реєстрація multipart/form-data для PATCH
registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Partially update own announcement with optional photo",
  security: [{ bearerAuth: [] }],
  request: {
    params: announcementIdSchema,
    body: {
      content: {
        "multipart/form-data": {
          schema: updateAnnouncementSchema.extend({
            image: z.string().openapi({
              type: "string",
              format: "binary",
              description: "Optional new announcement image file",
            }).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Announcement updated", ...jsonContent(announcementSchema) },
    400: validationErrorResponse,
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete own announcement",
  security: [{ bearerAuth: [] }],
  request: { params: announcementIdSchema },
  responses: {
    204: { description: "Announcement deleted" },
    400: validationErrorResponse,
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});