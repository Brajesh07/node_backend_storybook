import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

export interface AppConfig {
  // Server configuration
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  
  // API Configuration
  replicateApiToken: string;
  geminiApiKey: string;
  cloudinaryUrl?: string;
  
  // Application modes
  testingMode: boolean;
  replicateEnabled: boolean;
  
  // File upload configuration
  allowedExtensions: string[];
  maxFileSize: number;
  
  // Model configuration
  replicateModel: `${string}/${string}`;
  replicateInputKey: string;
  geminiModel: string;
  
  // Session configuration
  sessionSecret: string;
  sessionTimeout: number;
  
  // Redis configuration
  redisUrl?: string;
}

class ConfigService {
  private _config: AppConfig;
  private _genAI: GoogleGenerativeAI;

  constructor() {
    this._config = this.loadConfig();
    this.validateConfig();
    this._genAI = new GoogleGenerativeAI(this._config.geminiApiKey);
  }

  private loadConfig(): AppConfig {
    return {
      // Server configuration
      port: parseInt(process.env.PORT || '3001', 10),
      nodeEnv: process.env.NODE_ENV || 'development',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      
      // API Configuration
      replicateApiToken: process.env.REPLICATE_API_TOKEN || '',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      cloudinaryUrl: process.env.CLOUDINARY_URL,
      
      // Application modes
      testingMode: process.env.TESTING_MODE === 'true',
      replicateEnabled: process.env.REPLICATE_ENABLED !== 'false',
      
      // File upload configuration
      allowedExtensions: (process.env.ALLOWED_EXTENSIONS || 'png,jpg,jpeg,gif,bmp,webp').split(','),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
      
      // Model configuration
      replicateModel: (process.env.REPLICATE_MODEL || 'black-forest-labs/flux-kontext-pro') as `${string}/${string}`,
      replicateInputKey: process.env.REPLICATE_INPUT_KEY || 'input_image',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      
      // Session configuration
      sessionSecret: process.env.SESSION_SECRET || 'changeme-in-production',
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600', 10),
      
      // Redis configuration
      redisUrl: process.env.REDIS_URL,
    };
  }

  private validateConfig(): void {
    const isDevelopment = this._config.nodeEnv === 'development';
    const required = ['replicateApiToken', 'geminiApiKey'];
    const missing = required.filter(key => {
      const value = this._config[key as keyof AppConfig];
      // In development, allow placeholder values
      if (isDevelopment && typeof value === 'string' && value.includes('placeholder')) {
        return false;
      }
      return !value;
    });
    
    if (missing.length > 0) {
      if (isDevelopment) {
        console.warn(`⚠️ Missing API keys in development: ${missing.join(', ')}`);
        console.warn('⚠️ Some features will be disabled');
      } else {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
    }

    console.log('✅ Configuration validated successfully');
  }

  get config(): AppConfig {
    return this._config;
  }

  get genAI(): GoogleGenerativeAI {
    return this._genAI;
  }

  get isDevelopment(): boolean {
    return this._config.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this._config.nodeEnv === 'production';
  }
}

// Export singleton instance
export const configService = new ConfigService();
export const config = configService.config;