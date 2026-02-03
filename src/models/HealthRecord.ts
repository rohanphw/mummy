import mongoose, { Schema, Document } from 'mongoose';
import { IHealthRecord } from '../types';

export interface IHealthRecordDocument extends IHealthRecord, Document {}

const HealthRecordSchema = new Schema<IHealthRecordDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    recordType: {
      type: String,
      enum: ['blood_work', 'vitals', 'imaging', 'medication'],
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['pdf', 'image', 'text'],
      required: true,
    },
    rawData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    structuredData: {
      type: Schema.Types.Mixed,
    },
    fileUrl: {
      type: String,
    },
    analysis: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
HealthRecordSchema.index({ userId: 1, createdAt: -1 });
HealthRecordSchema.index({ userId: 1, recordType: 1 });
HealthRecordSchema.index({ userId: 1, date: -1 });

export const HealthRecord = mongoose.model<IHealthRecordDocument>(
  'HealthRecord',
  HealthRecordSchema
);
