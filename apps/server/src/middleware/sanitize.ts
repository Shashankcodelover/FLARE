import { Request, Response, NextFunction } from 'express';

/**
 * Sanitizes request body, query, and params against NoSQL injection attacks.
 * Recursively strips any keys starting with '$' and any values containing
 * MongoDB operators like $gt, $ne, $in, $regex etc.
 */
export function sanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) Object.defineProperty(req, 'body', { value: deepSanitize(req.body), writable: true });
  if (req.query) Object.defineProperty(req, 'query', { value: deepSanitize(req.query), writable: true });
  if (req.params) Object.defineProperty(req, 'params', { value: deepSanitize(req.params), writable: true });
  next();
}

function deepSanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Block string-encoded operators
    if (obj.startsWith('$')) return '';
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepSanitize);
  }

  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      // Strip any key starting with $ (MongoDB operators)
      if (key.startsWith('$')) continue;
      // Strip __proto__ and constructor pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      clean[key] = deepSanitize(obj[key]);
    }
    return clean;
  }

  return obj;
}
