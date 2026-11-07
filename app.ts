import express from "express";
import type { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http"; // імпорт pino-http
import helmet from "helmet";
import cors from "cors";

// для ES-модулів імпорт має бути з розширенням .js
import { generateOpenApiDocument } from "./src/openapi.js"; 
import authRouter from "./src/routes/auth.routes.js"; 
// Імпортуємо роутер оголошень
import announcementsRouter from "./src/routes/announcements.routes.js"; 
import logger from "./src/logger.js"; // імпорт логер


const app = express();

// підключення Helmet для безпечних заголовків (глобально)
app.use(helmet());

// налаштування CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || "*";
app.use(
  cors({
    origin: allowedOrigins,
  })
);

// підключення pino-http як middleware, передачаючи йому логера
app.use(pinoHttp({ logger }));

app.use(express.json());
app.use(cookieParser());

const openApiDocument = generateOpenApiDocument();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/auth", authRouter);
// Підключаємо роутер оголошень за базовою адресою /announcements
app.use("/announcements", announcementsRouter);

// 404 Not Found handler - must be after all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Validation failed",
      details: {
        body: ["Invalid JSON format in request body"],
      },
    });
  }

  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Resource not found" });
  }

  if (err.code === "P2002") {
    return res.status(409).json({ error: "Unique constraint violation" });
  }

  if (err.code === "P2003") {
    return res.status(400).json({ error: "Foreign key constraint failed" });
  }

  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT}: http://localhost:${PORT}/api-docs`,
  );
});