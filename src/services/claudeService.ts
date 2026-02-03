import Anthropic from '@anthropic-ai/sdk';
import config from '../config';
import { logger } from '../utils/logger';
import { IConversationMessage } from '../types';

class ClaudeService {
  private client: Anthropic;
  private model = 'claude-3-haiku-20240307';
  private maxTokens = 4096;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  async analyzeText(
    text: string,
    context?: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const defaultSystemPrompt = `You are Mummy, a caring and helpful health assistant.
You help users track their health records, answer questions about their health data,
and provide insights on trends. Always be supportive and informative, but remind users
that you're not a doctor and they should consult healthcare professionals for medical advice.`;

      const messages: Anthropic.MessageParam[] = [];

      if (context) {
        messages.push({
          role: 'user',
          content: `Context: ${context}`,
        });
      }

      messages.push({
        role: 'user',
        content: text,
      });

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt || defaultSystemPrompt,
        messages,
      });

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    } catch (error) {
      logger.error('Error analyzing text with Claude:', error);
      return "I'm having trouble processing that right now. Please try again later.";
    }
  }

  async analyzeImage(
    imageData: Buffer,
    imageType: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const defaultSystemPrompt = `You are Mummy, a health assistant specialized in reading medical reports.
Extract all relevant health information from images of medical reports, lab results, or prescriptions.
Be thorough and accurate.`;

      const base64Image = imageData.toString('base64');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt || defaultSystemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    } catch (error) {
      logger.error('Error analyzing image with Claude:', error);
      return "I'm having trouble reading that image. Please make sure it's clear and try again.";
    }
  }

  async chatWithContext(
    userMessage: string,
    conversationHistory: IConversationMessage[],
    healthData?: Record<string, any>,
    systemPrompt?: string
  ): Promise<string> {
    try {
      let defaultSystemPrompt = `You are Mummy, a caring health assistant for families.
You help track health records, answer questions, and provide insights.
You have access to the user's health history and conversation context.
Always be supportive, accurate, and remind users to consult healthcare professionals for medical decisions.`;

      if (healthData) {
        defaultSystemPrompt += `\n\nUser's Health Data Summary:\n${this.formatHealthData(healthData)}`;
      }

      const messages: Anthropic.MessageParam[] = conversationHistory
        .slice(-10) // Last 10 messages
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      messages.push({
        role: 'user',
        content: userMessage,
      });

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt || defaultSystemPrompt,
        messages,
      });

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    } catch (error) {
      logger.error('Error in chat with Claude:', error);
      return "I'm having trouble responding right now. Please try again later.";
    }
  }

  async extractStructuredData(
    text: string,
    dataType: 'blood_work' | 'vitals' | 'medication' | 'imaging'
  ): Promise<Record<string, any>> {
    try {
      const extractionPrompts: Record<string, string> = {
        blood_work: `Extract blood work values from this text. Return a JSON object with:
{
  "date": "YYYY-MM-DD",
  "values": {
    "cholesterol_total": number,
    "cholesterol_ldl": number,
    "cholesterol_hdl": number,
    "triglycerides": number,
    "blood_sugar": number,
    "hemoglobin": number
  }
}
Only include values that are present.`,

        vitals: `Extract vital signs from this text. Return a JSON object:
{
  "date": "YYYY-MM-DD",
  "blood_pressure_systolic": number,
  "blood_pressure_diastolic": number,
  "heart_rate": number,
  "weight": number,
  "height": number,
  "temperature": number
}`,

        medication: `Extract medication information. Return a JSON object:
{
  "medication_name": "",
  "dosage": "",
  "frequency": "daily/twice_daily/etc",
  "times": ["09:00", "21:00"],
  "duration": "",
  "notes": ""
}`,

        imaging: `Extract imaging report information. Return a JSON object:
{
  "date": "YYYY-MM-DD",
  "type": "X-ray/MRI/CT/etc",
  "body_part": "",
  "findings": "",
  "impression": ""
}`,
      };

      const prompt = `${extractionPrompts[dataType]}\n\nText:\n${text}`;

      const response = await this.analyzeText(
        prompt,
        undefined,
        'You are a medical data extraction assistant. Extract information accurately and return it in valid JSON format. If a value is not found, omit it.'
      );

      // Try to parse JSON from response
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.substring(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.substring(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.substring(0, jsonStr.length - 3);
      }

      try {
        return JSON.parse(jsonStr.trim());
      } catch (parseError) {
        logger.warn('Could not parse JSON from Claude response:', response);
        return { raw_extraction: response };
      }
    } catch (error) {
      logger.error('Error extracting structured data:', error);
      return {};
    }
  }

  private formatHealthData(healthData: Record<string, any>): string {
    const formatted: string[] = [];

    if (healthData.recent_records && Array.isArray(healthData.recent_records)) {
      formatted.push('Recent Health Records:');
      healthData.recent_records.forEach((record: any) => {
        formatted.push(
          `- ${record.date}: ${record.record_type} - ${record.analysis || 'No analysis'}`
        );
      });
    }

    if (healthData.medications && Array.isArray(healthData.medications)) {
      formatted.push('\nCurrent Medications:');
      healthData.medications.forEach((med: any) => {
        formatted.push(`- ${med.medication_name} (${med.dosage})`);
      });
    }

    return formatted.length > 0 ? formatted.join('\n') : 'No health data available yet.';
  }
}

export const claudeService = new ClaudeService();
