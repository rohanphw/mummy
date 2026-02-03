import axios from 'axios';
import pdfParse from 'pdf-parse';
import { userService } from '../services/userService';
import { claudeService } from '../services/claudeService';
import { twilioService } from '../services/twilioService';
import { isHealthDataEntry, truncateText } from '../utils/helpers';
import { logger } from '../utils/logger';
import config from '../config';

class MessageHandler {
  async handleIncomingMessage(
    fromNumber: string,
    messageBody: string,
    mediaUrl?: string,
    mediaType?: string,
    numMedia: number = 0
  ): Promise<string> {
    try {
      logger.info(`Received message from ${fromNumber}: ${truncateText(messageBody)}`);

      // Get or create user
      const user = await userService.getOrCreateUser(fromNumber);
      if (!user || !user._id) {
        return "Sorry, I'm having trouble right now. Please try again later.";
      }

      const userId = user._id.toString();
      const isNewUser = !user.name || user.name === '';

      // Welcome new users
      if (isNewUser) {
        const response = this.handleNewUser(userId, fromNumber);

        // If user replied with their name, save it
        if (messageBody && messageBody.trim().length > 0 && messageBody.trim().length < 100) {
          // Check if this looks like a name (not a command or question)
          const lowerBody = messageBody.toLowerCase().trim();
          if (lowerBody.startsWith('my name') ||
              lowerBody.startsWith('i am') ||
              lowerBody.startsWith("i'm") ||
              (!lowerBody.startsWith('/') && !lowerBody.includes('?') && messageBody.split(' ').length <= 5)) {
            // Extract the name
            let name = messageBody.trim();
            if (lowerBody.startsWith('my name is')) {
              name = messageBody.substring('my name is'.length).trim();
            } else if (lowerBody.startsWith("my name's")) {
              name = messageBody.substring("my name's".length).trim();
            } else if (lowerBody.startsWith('i am')) {
              name = messageBody.substring('i am'.length).trim();
            } else if (lowerBody.startsWith("i'm")) {
              name = messageBody.substring("i'm".length).trim();
            }

            // Save the name
            await userService.updateUser(userId, { name });
            return `Nice to meet you, ${name}! 👋\n\nI'm ready to help you track your health. You can start by:\n\n• Sending me a health report (photo or PDF)\n• Typing vitals like "BP: 120/80"\n• Asking me questions\n• Type /menu to see all commands\n\nWhat would you like to do?`;
          }
        }

        return response;
      }

      // Save user's message to conversation
      await userService.addMessageToConversation(userId, 'user', messageBody);

      let response: string;

      // Check if message has media attachments
      if (numMedia > 0 && mediaUrl) {
        response = await this.handleMediaMessage(userId, messageBody, mediaUrl, mediaType || '', fromNumber);
      }
      // Check for commands
      else if (messageBody.startsWith('/')) {
        response = await this.handleCommand(userId, messageBody);
      }
      // Regular text message
      else {
        response = await this.handleTextMessage(userId, messageBody, fromNumber);
      }

      // Don't save/send response if it was already handled (empty string)
      if (!response) {
        return '';
      }

      // Save assistant's response to conversation (if there is one)
      if (response) {
        await userService.addMessageToConversation(userId, 'assistant', response);
      }

      return response;
    } catch (error) {
      logger.error('Error handling message:', error);
      return 'Sorry, I encountered an error. Please try again.';
    }
  }

  private async handleNewUser(userId: string, phoneNumber: string): Promise<string> {
    return `👋 Welcome to Mummy - Your Personal Health Assistant!

I'm here to help you track your health records, analyze reports, and answer questions about your health data.

Here's what I can do:
📊 Analyze health reports (blood work, vitals, imaging)
💊 Track medications and send daily reminders
📈 Show trends in your health metrics
❓ Answer questions about your health history

You can:
• Send me lab reports (PDF or images)
• Upload prescription images
• Type health data like "BP: 120/80, Weight: 70kg"
• Ask questions like "What was my cholesterol last month?"

Commands:
Type /menu to see all available commands!

Let's start! What's your name?`;
  }

  private async handleTextMessage(userId: string, message: string, fromNumber: string): Promise<string> {
    try {
      const trimmedMessage = message.trim();
      const lowerMessage = message.toLowerCase().trim();

      // Check for "Explain record #X" pattern
      const explainMatch = lowerMessage.match(/explain\s+record\s*#?(\d+)/);
      if (explainMatch) {
        const recordNum = parseInt(explainMatch[1]);
        await twilioService.sendMessage(fromNumber, `⏳ Getting detailed explanation for record #${recordNum}...`);
        const explanation = await this.explainRecord(userId, recordNum);
        await twilioService.sendMessage(fromNumber, explanation);
        return ''; // Already sent
      }

      // Check if user is just typing a number (1-10) - could be record selection OR menu
      const recordNumber = parseInt(trimmedMessage);
      if (!isNaN(recordNumber) && recordNumber >= 1 && recordNumber <= 10) {
        // Get recent conversation to determine context
        const conversationHistory = await userService.getConversationHistory(userId, 3);

        // Check if last message mentioned "Recent Health Records"
        const recentMessages = conversationHistory
          .filter(msg => msg.role === 'assistant')
          .slice(-2); // Last 2 assistant messages

        const viewedRecordsRecently = recentMessages.some(msg =>
          msg.content.includes('Recent Health Records') ||
          msg.content.includes('Type a number to see details')
        );

        if (viewedRecordsRecently) {
          // User is selecting a record detail
          await twilioService.sendMessage(fromNumber, `⏳ Fetching record #${recordNumber}...`);
          const detail = await this.getRecordDetail(userId, recordNumber);
          await twilioService.sendMessage(fromNumber, detail);
          return ''; // Already sent
        } else {
          // User is selecting a menu option
          const menuOptions: { [key: string]: string } = {
            '1': '/status',
            '2': '/trends',
            '3': '/records',
            '4': '/medications',
          };

          if (menuOptions[trimmedMessage]) {
            return this.handleCommand(userId, menuOptions[trimmedMessage]);
          }
        }
      }

      // Check if user selected a menu option by command
      const menuOptions: { [key: string]: string } = {
        '1': '/status',
        '2': '/trends',
        '3': '/records',
        '4': '/medications',
      };

      if (menuOptions[trimmedMessage]) {
        return this.handleCommand(userId, menuOptions[trimmedMessage]);
      }

      // Check if this looks like health data entry
      if (isHealthDataEntry(message)) {
        return this.handleHealthDataEntry(userId, message);
      }

      // Otherwise, treat as a question/conversation
      return this.handleQuestion(userId, message);
    } catch (error) {
      logger.error('Error handling text message:', error);
      return "I'm having trouble processing that. Could you try rephrasing?";
    }
  }

  private async handleMediaMessage(
    userId: string,
    message: string,
    mediaUrl: string,
    mediaType: string,
    fromNumber: string
  ): Promise<string> {
    try {
      logger.info(`Processing media: ${mediaType} from ${mediaUrl}`);

      // Determine file type for acknowledgment
      const fileType = mediaType.startsWith('image/') ? '📸 image' :
                       mediaType === 'application/pdf' ? '📄 PDF' : '📎 file';

      // Send immediate acknowledgment and process in background
      const acknowledgment = `✅ Got your ${fileType}! Analyzing it now... ⏳`;

      // Process file asynchronously and send result separately
      this.processMediaAsync(userId, mediaUrl, mediaType, message, fromNumber);

      return acknowledgment;
    } catch (error) {
      logger.error('Error handling media message:', error);
      return 'Sorry, I had trouble processing that file. Please try again.';
    }
  }

  private async processMediaAsync(
    userId: string,
    mediaUrl: string,
    mediaType: string,
    message: string,
    fromNumber: string
  ): Promise<void> {
    try {
      // Download media
      const mediaData = await this.downloadMedia(mediaUrl);
      if (!mediaData) {
        await twilioService.sendMessage(fromNumber, "Sorry, I couldn't download that file. Please try again.");
        return;
      }

      let result: string;

      // Determine if it's an image or PDF
      if (mediaType.startsWith('image/')) {
        result = await this.processImage(userId, mediaData, mediaType, message);
      } else if (mediaType === 'application/pdf') {
        result = await this.processPDF(userId, mediaData, message);
      } else {
        await twilioService.sendMessage(fromNumber, 'Sorry, I can only process images and PDF files right now.');
        return;
      }

      // Send the analysis result
      await twilioService.sendMessage(fromNumber, result);
    } catch (error) {
      logger.error('Error processing media async:', error);
      await twilioService.sendMessage(fromNumber, 'Sorry, I had trouble processing that file. Please try again.');
    }
  }

  private async handleCommand(userId: string, command: string): Promise<string> {
    const cmd = command.toLowerCase().trim();

    switch (cmd) {
      case '/help':
      case '/menu':
        return this.getHelpMessage();
      case '/status':
        return this.getHealthStatus(userId);
      case '/trends':
        return this.getTrends(userId);
      case '/records':
        return this.getRecentRecords(userId);
      case '/medications':
        return this.getMedications(userId);
      default:
        return 'Unknown command. Type /menu to see all available commands.';
    }
  }

  private async handleQuestion(userId: string, question: string): Promise<string> {
    try {
      // Get conversation history
      const conversationHistory = await userService.getConversationHistory(userId, 10);

      // Get relevant health data for context
      const healthData = await this.getUserHealthContext(userId);

      // Ask Claude
      const response = await claudeService.chatWithContext(
        question,
        conversationHistory,
        healthData
      );

      return response;
    } catch (error) {
      logger.error('Error handling question:', error);
      return "I'm having trouble answering that right now. Please try again.";
    }
  }

  private async processImage(
    userId: string,
    imageData: Buffer,
    imageType: string,
    userMessage: string
  ): Promise<string> {
    try {
      const prompt = `This is a health-related document (lab report, prescription, medical imaging, etc.).
Please:
1. Identify what type of document this is
2. Extract all relevant health information
3. Provide a clear summary
4. If it's a prescription, extract medication names, dosages, and timings`;

      // Analyze image with Claude
      const analysis = await claudeService.analyzeImage(
        imageData,
        imageType,
        prompt
      );

      // Save to database as health record
      const { HealthRecord } = await import('../models/database');
      await HealthRecord.create({
        userId,
        recordType: 'blood_work', // Default, can be improved with AI classification
        date: new Date(),
        sourceType: 'image',
        rawData: { analysis },
        analysis,
        createdAt: new Date(),
      });

      return `📄 I've analyzed and saved your report:\n\n${analysis}\n\n✅ Saved to your health records.`;
    } catch (error) {
      logger.error('Error processing image:', error);
      return 'I had trouble reading that image. Please make sure it\'s clear and try again.';
    }
  }

  private async processPDF(
    userId: string,
    pdfData: Buffer,
    userMessage: string
  ): Promise<string> {
    try {
      // Extract text from PDF
      const data = await pdfParse(pdfData);
      const text = data.text;

      if (!text.trim()) {
        return "I couldn't extract text from that PDF. It might be an image-based PDF. Could you try sending it as an image instead?";
      }

      // Analyze with Claude
      const analysis = await claudeService.analyzeText(
        `Analyze this health report and provide a summary:\n\n${text}`,
        undefined,
        'You are analyzing a health report. Extract key information and provide a clear summary.'
      );

      // Save to database as health record
      const { HealthRecord } = await import('../models/database');
      await HealthRecord.create({
        userId,
        recordType: 'blood_work', // Default, can be improved with AI classification
        date: new Date(),
        sourceType: 'pdf',
        rawData: { text },
        analysis,
        createdAt: new Date(),
      });

      return `📄 I've analyzed and saved your PDF report:\n\n${analysis}\n\n✅ Saved to your health records.`;
    } catch (error) {
      logger.error('Error processing PDF:', error);
      return 'I had trouble reading that PDF. Please try again.';
    }
  }

  private async handleHealthDataEntry(userId: string, message: string): Promise<string> {
    try {
      // Use Claude to extract structured data
      const structuredData = await claudeService.extractStructuredData(message, 'vitals');

      // Save to database
      const { HealthRecord } = await import('../models/database');
      await HealthRecord.create({
        userId,
        recordType: 'vitals',
        date: new Date(),
        sourceType: 'text',
        rawData: { message },
        structuredData,
        createdAt: new Date(),
      });

      return `✅ Got it! I've recorded:\n${message}\n\n✅ Saved to your health records.`;
    } catch (error) {
      logger.error('Error handling health data entry:', error);
      return "I understood that you're sharing health data, but I had trouble saving it. Please try again.";
    }
  }

  private async downloadMedia(mediaUrl: string): Promise<Buffer | null> {
    try {
      const auth = Buffer.from(
        `${config.twilio.accountSid}:${config.twilio.authToken}`
      ).toString('base64');

      const response = await axios.get(mediaUrl, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Error downloading media:', error);
      return null;
    }
  }

  private async getUserHealthContext(userId: string): Promise<Record<string, any>> {
    // TODO: Fetch from database
    return {
      recent_records: [],
      medications: [],
    };
  }

  private getHelpMessage(): string {
    return `📋 *MUMMY MENU*

*Quick Commands:*
Reply with the number or command:

*1.* /status - 📊 View your health summary
*2.* /trends - 📈 See your health trends
*3.* /records - 📄 View recent health records
*4.* /medications - 💊 View your medications

*What I can do:*
• 📊 Analyze lab reports (PDF or images)
• 💊 Track medications & send reminders
• 📈 Track vitals (BP, weight, etc.)
• ❓ Answer health questions
• 🔔 Daily medication reminders

*How to use me:*
• Send photos/PDFs of health reports
• Type vitals: "BP: 120/80, Weight: 70kg"
• Ask questions: "What was my last BP reading?"

Type /menu anytime to see this menu!`;
  }

  private async getHealthStatus(userId: string): Promise<string> {
    try {
      logger.info(`Getting health status for user: ${userId}`);
      const { HealthRecord, Medication } = await import('../models/database');

      // Get latest records
      const latestRecords = await HealthRecord.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5);

      // Get active medications
      const activeMeds = await Medication.find({ userId, active: true });

      // Get total record count
      const totalRecords = await HealthRecord.countDocuments({ userId });

      let response = "📊 *YOUR HEALTH STATUS*\n\n";

      // Summary stats
      response += `📈 Total Records: ${totalRecords}\n`;
      response += `💊 Active Medications: ${activeMeds.length}\n\n`;

      // Latest health records
      if (latestRecords.length > 0) {
        response += "*Recent Health Data:*\n\n";

        latestRecords.forEach((record, index) => {
          const date = new Date(record.date).toLocaleDateString('en-IN');
          const type = record.recordType.replace('_', ' ');
          response += `${index + 1}. ${date} - ${type.charAt(0).toUpperCase() + type.slice(1)}\n`;
        });

        response += "\n";
      } else {
        response += "No health records yet.\n";
        response += "Send me a health report to get started!\n\n";
      }

      // Active medications summary
      if (activeMeds.length > 0) {
        response += "*Current Medications:*\n\n";
        activeMeds.forEach((med, index) => {
          response += `${index + 1}. ${med.medicationName} - ${med.dosage}\n`;
        });
        response += "\n";
      }

      response += "Type /records to see detailed records\n";
      response += "Type /medications for medication details\n";
      response += "Type /menu for all options";

      return response;
    } catch (error) {
      logger.error('Error getting health status:', error);
      return "Sorry, I had trouble fetching your health status. Please try again.";
    }
  }

  private async getTrends(userId: string): Promise<string> {
    try {
      const { HealthRecord } = await import('../models/database');

      // Get records from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const records = await HealthRecord.find({
        userId,
        date: { $gte: sixMonthsAgo }
      }).sort({ date: -1 });

      if (records.length === 0) {
        return "📈 *Health Trends*\n\nNo records found in the last 6 months.\n\nSend me health reports to start tracking trends!";
      }

      let response = "📈 *HEALTH TRENDS* (Last 6 Months)\n\n";

      // Count by record type
      const recordsByType: { [key: string]: number } = {};
      records.forEach(record => {
        recordsByType[record.recordType] = (recordsByType[record.recordType] || 0) + 1;
      });

      response += "*Records Summary:*\n";
      Object.entries(recordsByType).forEach(([type, count]) => {
        const typeName = type.replace('_', ' ').toUpperCase();
        response += `• ${typeName}: ${count} record${count > 1 ? 's' : ''}\n`;
      });

      response += `\n*Total Records:* ${records.length}\n`;
      response += `*Period:* Last 6 months\n\n`;

      // Show most recent records
      response += "*Most Recent:*\n";
      records.slice(0, 3).forEach((record, index) => {
        const date = new Date(record.date).toLocaleDateString('en-IN');
        const type = record.recordType.replace('_', ' ');
        response += `${index + 1}. ${date} - ${type}\n`;
      });

      response += "\n💡 For detailed analysis, ask me:\n";
      response += '"Show my blood pressure trend"\n';
      response += '"Compare my recent reports"';

      return response;
    } catch (error) {
      logger.error('Error getting trends:', error);
      return "Sorry, I had trouble fetching your health trends. Please try again.";
    }
  }

  private async getRecentRecords(userId: string): Promise<string> {
    try {
      const { HealthRecord } = await import('../models/database');
      const records = await HealthRecord.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10);

      if (records.length === 0) {
        return "📄 No health records found yet.\n\nSend me a health report (PDF or image) to get started!";
      }

      let response = "📄 *Recent Health Records:*\n\n";

      records.forEach((record, index) => {
        const date = new Date(record.date).toLocaleDateString();
        const type = record.recordType.replace('_', ' ').toUpperCase();
        response += `${index + 1}. ${date} - ${type}\n`;
        if (record.analysis) {
          const preview = record.analysis.substring(0, 100);
          response += `   ${preview}...\n\n`;
        }
      });

      response += "\nType a number to see details, or send a new report!";

      return response;
    } catch (error) {
      logger.error('Error getting recent records:', error);
      return "Sorry, I had trouble fetching your records. Please try again.";
    }
  }

  private async getMedications(userId: string): Promise<string> {
    try {
      const { Medication } = await import('../models/database');
      const medications = await Medication.find({ userId, active: true });

      if (medications.length === 0) {
        return "💊 No active medications found.\n\nSend me a prescription image to track your medications!";
      }

      let response = "💊 *Your Active Medications:*\n\n";

      medications.forEach((med, index) => {
        response += `${index + 1}. *${med.medicationName}*\n`;
        response += `   Dosage: ${med.dosage}\n`;
        response += `   Frequency: ${med.frequency}\n`;
        if (med.times && med.times.length > 0) {
          response += `   Times: ${med.times.join(', ')}\n`;
        }
        if (med.notes) {
          response += `   Notes: ${med.notes}\n`;
        }
        response += '\n';
      });

      return response;
    } catch (error) {
      logger.error('Error getting medications:', error);
      return "Sorry, I had trouble fetching your medications. Please try again.";
    }
  }

  private async getRecordDetail(userId: string, recordNumber: number): Promise<string> {
    try {
      logger.info(`Getting record detail #${recordNumber} for user: ${userId}`);
      const { HealthRecord } = await import('../models/database');
      const records = await HealthRecord.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10);

      logger.info(`Found ${records.length} records for user`);

      if (recordNumber > records.length || recordNumber < 1) {
        return `Record #${recordNumber} not found. You have ${records.length} record${records.length !== 1 ? 's' : ''}.\n\nType /records to see all records.`;
      }

      const record = records[recordNumber - 1];
      logger.info(`Fetched record: ${record._id}`);
      const date = new Date(record.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const type = record.recordType.replace('_', ' ').toUpperCase();

      let response = `📄 *RECORD #${recordNumber}*\n\n`;
      response += `📅 Date: ${date}\n`;
      response += `📋 Type: ${type}\n`;
      response += `📎 Source: ${record.sourceType.toUpperCase()}\n\n`;

      if (record.analysis) {
        const analysisPreview = record.analysis.length > 500
          ? record.analysis.substring(0, 500) + '...'
          : record.analysis;
        response += `*Analysis:*\n${analysisPreview}\n\n`;
      }

      if (record.structuredData && Object.keys(record.structuredData).length > 0) {
        response += `*Key Values:*\n`;
        Object.entries(record.structuredData).forEach(([key, value]) => {
          if (value && key !== 'date') {
            response += `• ${key.replace('_', ' ')}: ${value}\n`;
          }
        });
        response += '\n';
      }

      response += `💬 For full details, type: "Explain record #${recordNumber}"`;

      return response;
    } catch (error) {
      logger.error('Error getting record detail:', error);
      return "Sorry, I had trouble fetching that record. Please try again.";
    }
  }

  private async explainRecord(userId: string, recordNumber: number): Promise<string> {
    try {
      logger.info(`Explaining record #${recordNumber} for user: ${userId}`);
      const { HealthRecord } = await import('../models/database');
      const records = await HealthRecord.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10);

      if (recordNumber > records.length || recordNumber < 1) {
        return `Record #${recordNumber} not found. You have ${records.length} record${records.length !== 1 ? 's' : ''}.`;
      }

      const record = records[recordNumber - 1];

      // Get full analysis from Claude
      const prompt = `Please provide a detailed, easy-to-understand explanation of this health record:\n\n${record.analysis}\n\nBreak down what each value means, whether they are normal or concerning, and any recommendations.`;

      const explanation = await claudeService.analyzeText(
        prompt,
        undefined,
        'You are a helpful health assistant. Explain health records in simple, clear language. Always remind users to consult their doctor for medical advice.'
      );

      const date = new Date(record.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      let response = `📄 *DETAILED EXPLANATION - Record #${recordNumber}*\n\n`;
      response += `📅 ${date}\n\n`;
      response += explanation;
      response += `\n\n⚕️ Remember: Always consult your doctor for medical advice.`;

      return response;
    } catch (error) {
      logger.error('Error explaining record:', error);
      return "Sorry, I had trouble generating an explanation. Please try again.";
    }
  }
}

export const messageHandler = new MessageHandler();
