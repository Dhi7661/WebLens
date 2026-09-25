import mongoose, { Document, Schema, Model } from 'mongoose';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingCategory = 'SEO' | 'Accessibility' | 'Performance' | 'Security' | 'Technology';

export interface IFindingEvidence {
  selector?: string;
  value?: string;
  detail?: string;
}

export interface IFinding extends Document {
  scanId: mongoose.Types.ObjectId;
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  summary: string;
  explanation: string;
  remediation: string;
  evidence: IFindingEvidence[];
  location?: string;
  docsUrl?: string;
  fingerprint: string;
  createdAt: Date;
}

const findingSchema = new Schema<IFinding>(
  {
    scanId: {
      type: Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
      index: true,
    },
    ruleId: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['SEO', 'Accessibility', 'Performance', 'Security', 'Technology'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    explanation: {
      type: String,
      required: true,
    },
    remediation: {
      type: String,
      required: true,
    },
    evidence: [
      {
        selector: { type: String },
        value: { type: String },
        detail: { type: String },
        _id: false,
      },
    ],
    location: { type: String },
    docsUrl: { type: String },
    fingerprint: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        ret.scanId = ret.scanId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes matching Spec Section 10:
// findings.scanId
// findings.scanId + severity
// findings.scanId + fingerprint
findingSchema.index({ scanId: 1, severity: 1 });
findingSchema.index({ scanId: 1, fingerprint: 1 });

export const Finding: Model<IFinding> = mongoose.model<IFinding>('Finding', findingSchema);
