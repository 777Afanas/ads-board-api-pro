// import type { NextFunction, Request, Response } from "express";
// import type { ZodType } from "zod";
// import { z } from "zod";

// type Source = "body" | "params" | "query";

// function formatIssues(error: z.ZodError) {
//   return error.issues.map((issue) =>
//     issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message,
//   );
// }

// function validate(source: Source, schema: ZodType) {
//   return (req: Request, res: Response, next: NextFunction) => {
//     const result = schema.safeParse(req[source] ?? {});

//     if (!result.success) {
//       return res.status(400).json({
//         error: "Validation failed",
//         details: { [source]: formatIssues(result.error) },
//       });
//     }
    
//     Object.defineProperty(req, source, {
//       value: result.data,
//       writable: true,
//       configurable: true,
//       enumerable: true,
//     });
//     next();
//   };
// }

// export const validateBody = (schema: ZodType) => validate("body", schema);
// export const validateParams = (schema: ZodType) => validate("params", schema);
// export const validateQuery = (schema: ZodType) => validate("query", schema);


import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export const validateBody =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
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