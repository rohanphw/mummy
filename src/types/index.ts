export interface IUser {
  _id?: string;
  phoneNumber: string;
  name?: string;
  familyId?: string;
  preferences: {
    reminderTime: string;
    timezone: string;
  };
  createdAt: Date;
}

export interface IHealthRecord {
  _id?: string;
  userId: string;
  recordType: 'blood_work' | 'vitals' | 'imaging' | 'medication';
  date: Date;
  sourceType: 'pdf' | 'image' | 'text';
  rawData: Record<string, any>;
  structuredData?: Record<string, any>;
  fileUrl?: string;
  analysis?: string;
  createdAt: Date;
}

export interface IMedication {
  _id?: string;
  userId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  times: string[];
  startDate: Date;
  endDate?: Date;
  active: boolean;
  notes?: string;
}

export interface IConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IConversation {
  _id?: string;
  userId: string;
  messages: IConversationMessage[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface IInsight {
  _id?: string;
  userId: string;
  insightType: 'trend' | 'alert' | 'reminder';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  relatedRecords: string[];
  sent: boolean;
  createdAt: Date;
}

export interface WhatsAppMessage {
  From: string;
  Body: string;
  NumMedia: number;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

export interface AppConfig {
  twilio: {
    accountSid: string;
    authToken: string;
    whatsappNumber: string;
  };
  anthropic: {
    apiKey: string;
  };
  mongodb: {
    uri: string;
  };
  app: {
    port: number;
    env: string;
    logLevel: string;
  };
  storage: {
    path: string;
  };
  admin: {
    phoneNumbers: string[];
  };
  timezone: string;
}
