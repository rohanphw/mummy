import express, { Request, Response, NextFunction } from 'express';
import { connectDatabase, disconnectDatabase } from './models/database';
import { messageHandler } from './handlers/messageHandler';
import { logger } from './utils/logger';
import config, { validateConfig } from './config';
import { WhatsAppMessage } from './types';
import { validateWhatsAppMessage, rateLimit } from './middleware/validation';
import { securityHeaders, verifyTwilioSignature } from './middleware/security';

const app = express();

// Security middleware
app.use(securityHeaders);

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Mummy - WhatsApp Health Bot is running!',
    status: 'healthy',
    version: '1.0.0',
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    database: 'connected',
  });
});

// Twilio WhatsApp webhook endpoint
app.post(
  '/webhook/whatsapp',
  verifyTwilioSignature,
  validateWhatsAppMessage,
  rateLimit,
  async (req: Request<{}, {}, WhatsAppMessage>, res: Response) => {
  try {
    const { From, Body, NumMedia, MediaUrl0, MediaContentType0 } = req.body;

    logger.info(`Received webhook from ${From}`);

    const mediaUrl = parseInt(String(NumMedia), 10) > 0 ? MediaUrl0 : undefined;
    const mediaType = parseInt(String(NumMedia), 10) > 0 ? MediaContentType0 : undefined;

    // Handle the message
    const responseMessage = await messageHandler.handleIncomingMessage(
      From,
      Body || '',
      mediaUrl,
      mediaType,
      parseInt(String(NumMedia), 10)
    );

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(responseMessage)}</Message>
</Response>`;

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error('Error in webhook:', error);

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble right now. Please try again later.</Message>
</Response>`;

    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// GET endpoint for webhook validation
app.get('/webhook/whatsapp', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Webhook endpoint is active',
  });
});

// Test endpoint to send a message
app.post('/test/send', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing "to" or "message" field' });
    }

    const { twilioService } = await import('./services/twilioService');
    const success = await twilioService.sendMessage(to, message);

    res.json({
      success,
      to,
      message,
    });
  } catch (error) {
    logger.error('Error in test send:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Error handlers
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.url,
  });
});

// XML escape helper
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Start server
async function start() {
  try {
    logger.info('🚀 Starting Mummy Health Bot...');

    // Validate configuration
    if (!validateConfig()) {
      logger.warn('⚠️  Some configuration settings are missing. Please check your .env file.');
    }

    // Connect to database
    await connectDatabase();

    // Start Express server
    app.listen(config.app.port, () => {
      logger.info(`✅ Mummy is ready to help!`);
      logger.info(`Server running on http://0.0.0.0:${config.app.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await disconnectDatabase();
  process.exit(0);
});

// Start the application
start();
