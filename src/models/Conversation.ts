import mongoose, { Schema, Document } from 'mongoose';
import { IConversation, IConversationMessage } from '../types';

export interface IConversationDocument extends IConversation, Document {}

const ConversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversationDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    messages: {
      type: [ConversationMessageSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Conversation = mongoose.model<IConversationDocument>(
  'Conversation',
  ConversationSchema
);
