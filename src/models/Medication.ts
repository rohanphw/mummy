import mongoose, { Schema, Document } from 'mongoose';
import { IMedication } from '../types';

export interface IMedicationDocument extends IMedication, Document {}

const MedicationSchema = new Schema<IMedicationDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    medicationName: {
      type: String,
      required: true,
    },
    dosage: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      required: true,
    },
    times: {
      type: [String],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active medications by user
MedicationSchema.index({ userId: 1, active: 1 });

export const Medication = mongoose.model<IMedicationDocument>(
  'Medication',
  MedicationSchema
);
