import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

const config: AppConfig = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mummy',
  },
  app: {
    port: parseInt(process.env.PORT || '8000', 10),
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  storage: {
    path: process.env.FILE_STORAGE_PATH || './uploads',
  },
  admin: {
    phoneNumbers: (process.env.ADMIN_PHONE_NUMBERS || '')
      .split(',')
      .map(num => num.trim())
      .filter(num => num.length > 0),
  },
  timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
};

export function validateConfig(): boolean {
  const missingFields: string[] = [];

  if (!config.twilio.accountSid) missingFields.push('TWILIO_ACCOUNT_SID');
  if (!config.twilio.authToken) missingFields.push('TWILIO_AUTH_TOKEN');
  if (!config.anthropic.apiKey) missingFields.push('ANTHROPIC_API_KEY');
  if (!config.mongodb.uri) missingFields.push('MONGODB_URI');

  // Validate format
  if (config.twilio.accountSid && !config.twilio.accountSid.startsWith('AC')) {
    console.error('⚠️  Invalid TWILIO_ACCOUNT_SID format (should start with AC)');
    return false;
  }

  if (config.anthropic.apiKey && !config.anthropic.apiKey.startsWith('sk-ant-')) {
    console.error('⚠️  Invalid ANTHROPIC_API_KEY format (should start with sk-ant-)');
    return false;
  }

  if (config.mongodb.uri && !config.mongodb.uri.startsWith('mongodb')) {
    console.error('⚠️  Invalid MONGODB_URI format (should start with mongodb:// or mongodb+srv://)');
    return false;
  }

  if (missingFields.length > 0) {
    if (config.app.env === 'production') {
      console.error('❌ Missing required configuration:', missingFields.join(', '));
      console.error('Application cannot start in production without these variables.');
      return false;
    } else {
      console.warn('⚠️  Missing configuration (development mode):', missingFields.join(', '));
    }
  }

  return true;
}

export default config;
