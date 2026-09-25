import mongoose, { Document, Schema, Model } from 'mongoose';

export type MonitoringFrequency = 'hourly' | 'daily' | 'weekly';

export interface IWebsite extends Document {
  ownerId: mongoose.Types.ObjectId;
  url: string;
  normalizedUrl: string;
  hostname: string;
  displayName: string;
  monitoringEnabled: boolean;
  frequency: MonitoringFrequency;
  lastScheduledAt?: Date;
  nextScheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const websiteSchema = new Schema<IWebsite>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedUrl: {
      type: String,
      required: true,
      trim: true,
    },
    hostname: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    monitoringEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    frequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly'],
      default: 'daily',
    },
    lastScheduledAt: {
      type: Date,
    },
    nextScheduledAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        ret.ownerId = ret.ownerId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index matching Spec Section 10: websites.ownerId + normalizedUrl
websiteSchema.index({ ownerId: 1, normalizedUrl: 1 }, { unique: true });

export const Website: Model<IWebsite> = mongoose.model<IWebsite>('Website', websiteSchema);
