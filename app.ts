// Імпортуємо функцію unlink для асинхронного видалення файлів з файлової системи через Promises API
import { unlink } from "node:fs/promises";
// Підключаємо та ініціалізуємо конфігурацію змінних середовища з файлу .env у process.env
import "dotenv/config";
// Імпортуємо головну фабричну функцію express для створення екземпляра сервера
import express from "express";
// Імпортуємо типи TypeScript для типізації Express middleware: функція next, об'єкти request та response
import type { NextFunction, Request, Response } from "express";
// Імпортуємо модуль для генерації та відображення інтерактивного інтерфейсу Swagger UI
import swaggerUi from "swagger-ui-express";
// Імпортуємо middleware для парсингу заголовків cookies у зручний об'єкт req.cookies
import cookieParser from "cookie-parser";
// Імпортуємо middleware pino-http для автоматичного логування кожного вхідного HTTP-запиту та відповіді
import { pinoHttp } from "pino-http";
// Імпортуємо helmet для автоматичного виставлення безпечних заголовків HTTP
import helmet from "helmet";
// Імпортуємо cors для керування політикою доступу ресурсів з інших доменів (Cross-Origin Resource Sharing)
import cors from "cors";

// Імпортуємо функцію для генерації фінальної схеми OpenAPI з розширенням .js згідно з вимогами Node ESM
import { generateOpenApiDocument } from "./src/openapi.js";
// Імпортуємо роутер авторизації (маршрути register, login, refresh, logout, me)
import authRouter from "./src/routes/auth.routes.js";
// Імпортуємо роутер оголошень (маршрути для CRUD операцій з оголошеннями)
import announcementsRouter from "./src/routes/announcements.routes.js";
// Імпортуємо єдиний централізований екземпляр логера pino
import logger from "./src/logger.js";

// Створюємо екземпляр застосунку Express
const app = express();

// Глобально підключаємо Helmet middleware для захисту HTTP-заголовками всіх маршрутів
app.use(helmet());

// Зчитуємо дозволені origins зі змінної середовища ALLOWED_ORIGINS (або задаємо порожній рядок за замовчуванням)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  // Розбиваємо рядок на окремі джерела за роздільником-комою
  .split(",")
  // Видаляємо випадкові пробіли на початку та в кінці кожного посилання origin
  .map((origin) => origin.trim())
  // Відфільтровуємо порожні значення у масиві, якщо кома стояла наприкінці або були пропуски
  .filter(Boolean);

// Підключаємо та налаштовуємо middleware CORS з кастомною функцією перевірки
app.use(
  cors({
    // Оголошуємо функцію-валідатор джерела запиту
    origin: (origin, callback) => {
      // Дозволяємо запити, якщо заголовок Origin відсутній (Postman/curl/серверні запити) або присутній у списку дозволених
      if (!origin || allowedOrigins.includes(origin)) {
        // Повертаємо callback без помилки з дозволом на обробку
        return callback(null, true);
      }
      // Якщо джерело не дозволене, створюємо об'єкт помилки та призначаємо йому HTTP-статус 403 Forbidden
      const corsError = Object.assign(new Error("CORS not allowed for this origin"), { status: 403 });
      // Передаємо створену помилку в callback для передачі керування в error handler
      return callback(corsError);
    },
    // Дозволяємо клієнтам передавати облікові дані (наприклад, cookies з refresh токеном)
    credentials: true,
  })
);

// Підключаємо middleware HTTP-логування pino-http, передаючи наш екземпляр логера
app.use(pinoHttp({ logger }));

// Вмикаємо вбудований парсер тіла запиту у форматі JSON (доступно у req.body)
app.use(express.json());
// Підключаємо парсер cookies до ланцюжка middleware
app.use(cookieParser());

// Генеруємо документ специфікації OpenAPI на основі зареєстрованих Zod-схем
const openApiDocument = generateOpenApiDocument();
// Монтуємо роут документації /api-docs з інтерфейсом Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

// Підключаємо маршрути модуля авторизації за базовим шляхом /auth
app.use("/auth", authRouter);
// Підключаємо маршрути модуля оголошень за базовим шляхом /announcements
app.use("/announcements", announcementsRouter);

// Обробник неіснуючих маршрутів (404 Not Found), спрацьовує коли жоден роут вище не збігся
app.use((_req: Request, res: Response) => {
  // Повертаємо клієнту статус 404 у форматі JSON
  res.status(404).json({ error: "Not found" });
});

// Глобальний обробник помилок (Error handling middleware) з 4 обов'язковими параметрами Express
app.use(async (err: any, req: Request, res: Response, _next: NextFunction) => {
  // Виводимо повний стек помилки в консоль сервера для діагностики
  console.error(err);

  // Перевіряємо, чи встиг multer зберегти тимчасовий файл перед тим, як виникла помилка
  if (req.file) {
    // Безпечно видаляємо тимчасовий файл з диска, щоб папка uploads не засмічувалася
    await unlink(req.file.path).catch(() => {});
  }

  // Перехоплюємо помилку CORS для забороненого origin або зі статусом 403
  if (err.message === "CORS not allowed for this origin" || err.status === 403) {
    // Повертаємо клієнту статус 403 Forbidden з відповідним повідомленням згідно з ТЗ
    return res.status(403).json({ error: "CORS not allowed for this origin" });
  }

  // Обробляємо помилку синтаксису JSON у тілі запиту від body-parser
  if (err.type === "entity.parse.failed") {
    // Повертаємо статус 400 із деталями про некоректний JSON
    return res.status(400).json({
      error: "Validation failed",
      details: {
        body: ["Invalid JSON format in request body"],
      },
    });
  }

  // Обробляємо явні помилки клієнта (статуси від 400 до 499)
  if (err.status && err.status >= 400 && err.status < 500) {
    // Повертаємо відповідний HTTP-статус та текст помилки
    return res.status(err.status).json({ error: err.message });
  }

  // Обробляємо код Prisma P2025: запис не знайдено при операції оновлення/видалення
  if (err.code === "P2025") {
    // Повертаємо клієнту статус 404
    return res.status(404).json({ error: "Resource not found" });
  }

  // Обробляємо код Prisma P2002: порушення обмеження унікальності (наприклад, дублікат email або username)
  if (err.code === "P2002") {
    // Повертаємо клієнту статус 409 Conflict
    return res.status(409).json({ error: "Unique constraint violation" });
  }

  // Обробляємо код Prisma P2003: порушення зовнішнього ключа (Foreign key)
  if (err.code === "P2003") {
    // Повертаємо клієнту статус 400 Bad Request
    return res.status(400).json({ error: "Foreign key constraint failed" });
  }

  // Для всіх інших невідомих критичних помилок повертаємо статус 500 Internal Server Error
  res.status(500).json({ error: "Internal server error" });
});

// Визначаємо порт сервера зі змінної PORT середовища або використовуємо 3000 за замовчуванням
const PORT = process.env.PORT || 3000;

// Запускаємо прослуховування HTTP-портів сервером Express
app.listen(PORT, () => {
  // Виводимо в консоль повідомлення про успішний старт та пряме посилання на Swagger-документацію
  console.log(
    `Server is running on port ${PORT}: http://localhost:${PORT}/api-docs`,
  );
});

// Експорт екземпляру застосунку за замовчуванням для запуску тестів у Vitest/Supertest
export default app;