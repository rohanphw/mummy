import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove potential script tags
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove potential SQL injection patterns
  sanitized = sanitized.replace(/(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)/gi, '');

  // Limit length
  sanitized = sanitized.substring(0, 5000);

  return sanitized.trim();
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;

  // Remove whatsapp: prefix
  const cleanPhone = phone.replace('whatsapp:', '');

  // Basic international phone number validation
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Validate WhatsApp message payload
 */
export function validateWhatsAppMessage(req: Request, res: Response, next: NextFunction): void {
  const { From, Body, NumMedia } = req.body;

  // Validate required fields
  if (!From || typeof From !== 'string') {
    logger.warn('Invalid webhook: Missing or invalid From field');
    res.status(400).send('Invalid request: Missing From field');
    return;
  }

  if (!isValidPhoneNumber(From)) {
    logger.warn(`Invalid webhook: Invalid phone number format: ${From}`);
    res.status(400).send('Invalid request: Invalid phone number');
    return;
  }

  // Validate Body is string (can be empty)
  if (Body !== undefined && typeof Body !== 'string') {
    logger.warn('Invalid webhook: Body is not a string');
    res.status(400).send('Invalid request: Invalid Body field');
    return;
  }

  // Validate NumMedia
  const numMedia = parseInt(String(NumMedia || '0'), 10);
  if (isNaN(numMedia) || numMedia < 0 || numMedia > 10) {
    logger.warn(`Invalid webhook: Invalid NumMedia: ${NumMedia}`);
    res.status(400).send('Invalid request: Invalid NumMedia');
    return;
  }

  // Sanitize message body
  if (Body) {
    req.body.Body = sanitizeInput(Body);
  }

  next();
}

/**
 * Rate limiting per phone number
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const { From } = req.body;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20; // 20 requests per minute per user

  const key = From;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    next();
    return;
  }

  if (record.count >= maxRequests) {
    logger.warn(`Rate limit exceeded for ${From}`);
    res.status(429).send('Too many requests. Please slow down.');
    return;
  }

  record.count++;
  next();
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
