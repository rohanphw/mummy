import mongoose from 'mongoose';
import config from '../config';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri);
    logger.info('✅ Connected to MongoDB successfully');
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error);
    if (config.app.env === 'production') {
      throw error;
    } else {
      logger.warn('⚠️  Continuing without database in development mode');
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
}

// Export models
export { User } from './User';
export { HealthRecord } from './HealthRecord';
export { Medication } from './Medication';
export { Conversation } from './Conversation';
