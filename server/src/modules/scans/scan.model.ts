import mongoose, { Document, Schema, Model } from 'mongoose';

export type ScanStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface ICategoryScores {
  performance: number;
  seo: number;
  accessibility: number;
  security: number;
  technology: number;
}

export interface IScan extends Document {
  websiteId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  requestedUrl: string;
  finalUrl: string;
  status: ScanStatus;
  overallScore: number;
  categoryScores: ICategoryScores;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  analyzerVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const scanSchema = new Schema<IScan>(
  {
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestedUrl: {
      type: String,
      required: true,
      trim: true,
    },
    finalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    categoryScores: {
      performance: { type: Number, default: 0, min: 0, max: 100 },
      seo: { type: Number, default: 0, min: 0, max: 100 },
      accessibility: { type: Number, default: 0, min: 0, max: 100 },
      security: { type: Number, default: 0, min: 0, max: 100 },
      technology: { type: Number, default: 0, min: 0, max: 100 },
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    durationMs: { type: Number },
    errorCode: { type: String },
    errorMessage: { type: String },
    analyzerVersion: {
      type: String,
      default: '1.0.0',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        ret.websiteId = ret.websiteId.toString();
        ret.ownerId = ret.ownerId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes matching Spec Section 10:
// scans.websiteId + createdAt
// scans.ownerId + createdAt
scanSchema.index({ websiteId: 1, createdAt: -1 });
scanSchema.index({ ownerId: 1, createdAt: -1 });

export const Scan: Model<IScan> = mongoose.model<IScan>('Scan', scanSchema);
