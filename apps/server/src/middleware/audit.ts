import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export interface AuditEntry {
  action: string;
  userId: string | undefined;
  resourceType: string;
  resourceId: string | undefined;
  ip: string | undefined;
  method: string;
  path: string;
  statusCode: number;
  timestamp: string;
  durationMs: number;
}

/**
 * auditLog — logs every state-changing operation (POST, PUT, PATCH, DELETE)
 * with full context for compliance and forensic analysis.
 *
 * In production, pipe Pino output to a SIEM (Splunk, ELK, Datadog) for
 * tamper-proof retention and alerting.
 */
export function auditLog(resourceType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only audit state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const start = Date.now();

    res.on('finish', () => {
      const entry: AuditEntry = {
        action: `${req.method} ${resourceType}`,
        userId: req.user?.sub,
        resourceType,
        resourceId: (req.params?.id as string) || (req.params?.hubId as string) || undefined,
        ip: Array.isArray(req.ip) ? req.ip[0] : (req.ip as string | undefined),
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start,
      };

      // Successful mutations → info level, failures → warn
      if (res.statusCode < 400) {
        logger.info({ audit: entry }, `AUDIT: ${entry.action}`);
      } else {
        logger.warn({ audit: entry }, `AUDIT_FAIL: ${entry.action}`);
      }
    });

    next();
  };
}
