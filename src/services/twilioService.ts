import twilio from 'twilio';
import config from '../config';
import { logger } from '../utils/logger';

class TwilioService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.fromNumber = config.twilio.whatsappNumber;
  }

  async sendMessage(
    toNumber: string,
    message: string,
    mediaUrl?: string
  ): Promise<boolean> {
    try {
      // Ensure phone number has whatsapp: prefix
      if (!toNumber.startsWith('whatsapp:')) {
        toNumber = `whatsapp:${toNumber}`;
      }

      // WhatsApp has a 1600 character limit, split if needed
      const maxLength = 1500; // Leave some buffer

      if (message.length <= maxLength) {
        // Send single message
        const messageParams: twilio.Twilio.MessageListInstanceCreateOptions = {
          from: this.fromNumber,
          to: toNumber,
          body: message,
        };

        if (mediaUrl) {
          messageParams.mediaUrl = [mediaUrl];
        }

        const twilioMessage = await this.client.messages.create(messageParams);
        logger.info(`Message sent successfully. SID: ${twilioMessage.sid}`);
        return true;
      } else {
        // Split message into chunks
        const chunks = this.splitMessage(message, maxLength);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const prefix = i === 0 ? '' : `(${i + 1}/${chunks.length}) `;

          const messageParams: twilio.Twilio.MessageListInstanceCreateOptions = {
            from: this.fromNumber,
            to: toNumber,
            body: prefix + chunk,
          };

          await this.client.messages.create(messageParams);
          // Small delay between messages to ensure order
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        logger.info(`Split message sent in ${chunks.length} parts`);
        return true;
      }
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  private splitMessage(message: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    // Split by paragraphs first (double newlines)
    const paragraphs = message.split('\n\n');

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length + 2 <= maxLength) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // If single paragraph is too long, split by sentences
        if (paragraph.length > maxLength) {
          const sentences = paragraph.split('. ');
          let sentenceChunk = '';

          for (const sentence of sentences) {
            if (sentenceChunk.length + sentence.length + 2 <= maxLength) {
              sentenceChunk += (sentenceChunk ? '. ' : '') + sentence;
            } else {
              if (sentenceChunk) {
                chunks.push(sentenceChunk + '.');
              }
              sentenceChunk = sentence;
            }
          }

          if (sentenceChunk) {
            currentChunk = sentenceChunk;
          }
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}

export const twilioService = new TwilioService();
