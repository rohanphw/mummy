import { User, Conversation } from '../models/database';
import { IUser, IConversationMessage } from '../types';
import { normalizePhoneNumber } from '../utils/helpers';
import { logger } from '../utils/logger';
import config from '../config';

class UserService {
  async getOrCreateUser(phoneNumber: string): Promise<IUser | null> {
    try {
      phoneNumber = normalizePhoneNumber(phoneNumber);

      let user = await User.findOne({ phoneNumber });

      if (user) {
        logger.info(`Found existing user: ${phoneNumber}`);
        return user.toObject();
      }

      // Create new user
      logger.info(`Creating new user: ${phoneNumber}`);
      user = await User.create({
        phoneNumber,
        name: '',
        preferences: {
          reminderTime: '09:00',
          timezone: config.timezone,
        },
      });

      // Create conversation for new user
      await this.createConversation(user._id.toString());

      return user.toObject();
    } catch (error) {
      logger.error('Error in getOrCreateUser:', error);
      return null;
    }
  }

  async getUserById(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      return user ? user.toObject() : null;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserByPhone(phoneNumber: string): Promise<IUser | null> {
    try {
      phoneNumber = normalizePhoneNumber(phoneNumber);
      const user = await User.findOne({ phoneNumber });
      return user ? user.toObject() : null;
    } catch (error) {
      logger.error('Error getting user by phone:', error);
      return null;
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<IUser>
  ): Promise<boolean> {
    try {
      const result = await User.updateOne({ _id: userId }, { $set: updates });
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating user:', error);
      return false;
    }
  }

  async createConversation(userId: string): Promise<boolean> {
    try {
      const existing = await Conversation.findOne({ userId });
      if (existing) {
        return true;
      }

      await Conversation.create({
        userId,
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
      });

      logger.info(`Created conversation for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      return false;
    }
  }

  async addMessageToConversation(
    userId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<boolean> {
    try {
      const message: IConversationMessage = {
        role,
        content,
        timestamp: new Date(),
      };

      const result = await Conversation.updateOne(
        { userId },
        {
          $push: { messages: message },
          $set: { lastUpdated: new Date() },
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error adding message to conversation:', error);
      return false;
    }
  }

  async getConversationHistory(
    userId: string,
    limit: number = 10
  ): Promise<IConversationMessage[]> {
    try {
      const conversation = await Conversation.findOne({ userId });

      if (!conversation || !conversation.messages) {
        return [];
      }

      // Return last N messages
      return conversation.messages.slice(-limit);
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      return [];
    }
  }

  async isAdmin(phoneNumber: string): Promise<boolean> {
    phoneNumber = normalizePhoneNumber(phoneNumber);
    return config.admin.phoneNumbers.includes(phoneNumber);
  }
}

export const userService = new UserService();
