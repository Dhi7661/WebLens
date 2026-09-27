import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface IUserPreferences {
  theme: 'system' | 'dark' | 'light';
  emailAlerts: boolean;
  defaultFrequency: 'hourly' | 'daily' | 'weekly';
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN';
  preferences: IUserPreferences;
  apiKeys: IApiKey[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    keyHash: {
      type: String,
      required: true,
      select: false, // Never return key hashes
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Prevents passwordHash from being returned in standard queries
    },
    avatarUrl: {
      type: String,
      default: undefined,
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
    },
    preferences: {
      theme: {
        type: String,
        enum: ['system', 'dark', 'light'],
        default: 'dark',
      },
      emailAlerts: {
        type: Boolean,
        default: true,
      },
      defaultFrequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly'],
        default: 'daily',
      },
    },
    apiKeys: [apiKeySchema],
    lastLoginAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash; // Critical security requirement: never return password hashes
        if (Array.isArray(ret.apiKeys)) {
          ret.apiKeys = ret.apiKeys.map((k: any) => ({
            id: k.id,
            name: k.name,
            keyPrefix: k.keyPrefix,
            createdAt: k.createdAt,
            lastUsedAt: k.lastUsedAt,
          }));
        }
        return ret;
      },
    },
  }
);

// Method to verify password candidate against bcrypt hash
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
