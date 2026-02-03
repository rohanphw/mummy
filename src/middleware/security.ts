import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import config from '../config';
import { logger } from '../utils/logger';

/**
 * Verify Twilio webhook signature
 * This ensures requests are actually coming from Twilio
 */
export function verifyTwilioSignature(req: Request, res: Response, next: NextFunction): void {
  // Skip verification in development
  if (config.app.env === 'development') {
    next();
    return;
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;

  if (!twilioSignature) {
    logger.warn('Missing Twilio signature header');
    res.status(403).send('Forbidden');
    return;
  }

  // Get the full URL
  const protocol = req.protocol;
  const host = req.get('host');
  const url = `${protocol}://${host}${req.originalUrl}`;

  // Compute expected signature
  const data = Object.keys(req.body)
    .sort()
    .reduce((acc, key) => {
      return acc + key + req.body[key];
    }, url);

  const expectedSignature = crypto
    .createHmac('sha1', config.twilio.authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  if (twilioSignature !== expectedSignature) {
    logger.warn('Invalid Twilio signature');
    res.status(403).send('Forbidden');
    return;
  }

  next();
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  next();
}
