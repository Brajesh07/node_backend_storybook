import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import Replicate from 'replicate';
import { configService } from '../config';

// Initialize Replicate client
const replicate = new Replicate({
  auth: configService.config.replicateApiToken,
});

// Initialize Cloudinary if configured
if (configService.config.cloudinaryUrl) {
  cloudinary.config({
    secure: true
  });
}

export interface UploadResult {
  url: string;
  provider: string;
}

export class FileUtilsService {

  /**
   * Check if the uploaded file has an allowed extension
   */
  isAllowedFile(filename: string): boolean {
    if (!filename.includes('.')) return false;
    
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? configService.config.allowedExtensions.includes(extension) : false;
  }

  /**
   * Upload file to cloud storage with multiple provider fallback
   */
  async uploadToStorage(filePath: string): Promise<UploadResult | null> {
    const uploadErrors: string[] = [];
    
    // Try Replicate Files API first
    try {
      console.log("DEBUG: Trying Replicate Files API...");
      const fileContent = fs.readFileSync(filePath);
      const file = new File([fileContent], path.basename(filePath));
      const fileUpload = await replicate.files.create(file);
      const url = fileUpload.urls.get;
      console.log(`DEBUG: Replicate Files API success: ${url}`);
      return { url, provider: 'replicate' };
    } catch (error) {
      const errorMsg = `Replicate Files API failed: ${error}`;
      console.log(`DEBUG: ${errorMsg}`);
      uploadErrors.push(errorMsg);
    }
    
    // Try Cloudinary if configured
    if (configService.config.cloudinaryUrl) {
      try {
        console.log("DEBUG: Trying Cloudinary...");
        const result = await cloudinary.uploader.upload(filePath);
        const url = result.secure_url;
        console.log(`DEBUG: Cloudinary success: ${url}`);
        return { url, provider: 'cloudinary' };
      } catch (error) {
        const errorMsg = `Cloudinary failed: ${error}`;
        console.log(`DEBUG: ${errorMsg}`);
        uploadErrors.push(errorMsg);
      }
    }
    
    // Try 0x0.st
    try {
      console.log("DEBUG: Trying 0x0.st...");
      const fileStream = fs.createReadStream(filePath);
      const formData = new FormData();
      formData.append('file', fileStream as any);
      
      const response = await axios.post('https://0x0.st', formData, {
        timeout: 30000,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const url = response.data.trim();
      console.log(`DEBUG: 0x0.st success: ${url}`);
      return { url, provider: '0x0.st' };
    } catch (error) {
      const errorMsg = `0x0.st failed: ${error}`;
      console.log(`DEBUG: ${errorMsg}`);
      uploadErrors.push(errorMsg);
    }
    
    // Try transfer.sh
    try {
      console.log("DEBUG: Trying transfer.sh...");
      const fileStream = fs.createReadStream(filePath);
      
      const response = await axios.put(
        `https://transfer.sh/${path.basename(filePath)}`,
        fileStream,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        }
      );
      
      const url = response.data.trim();
      console.log(`DEBUG: transfer.sh success: ${url}`);
      return { url, provider: 'transfer.sh' };
    } catch (error) {
      const errorMsg = `transfer.sh failed: ${error}`;
      console.log(`DEBUG: ${errorMsg}`);
      uploadErrors.push(errorMsg);
    }
    
    // Try file.io
    try {
      console.log("DEBUG: Trying file.io...");
      const fileStream = fs.createReadStream(filePath);
      const formData = new FormData();
      formData.append('file', fileStream as any);
      
      const response = await axios.post('https://file.io', formData, {
        timeout: 30000,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const result = response.data;
      if (result.success) {
        const url = result.link;
        console.log(`DEBUG: file.io success: ${url}`);
        return { url, provider: 'file.io' };
      } else {
        throw new Error(`file.io returned success=false: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      const errorMsg = `file.io failed: ${error}`;
      console.log(`DEBUG: ${errorMsg}`);
      uploadErrors.push(errorMsg);
    }
    
    // All providers failed
    console.log(`DEBUG: All upload providers failed. Errors: ${uploadErrors}`);
    return null;
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`DEBUG: Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Warning: Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  /**
   * Ensure upload directory exists
   */
  ensureUploadDir(uploadDir: string): void {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      console.error(`Error getting file size for ${filePath}:`, error);
      return 0;
    }
  }

  /**
   * Validate file size against maximum allowed
   */
  isValidFileSize(filePath: string): boolean {
    const fileSize = this.getFileSize(filePath);
    return fileSize > 0 && fileSize <= configService.config.maxFileSize;
  }

  /**
   * Generate unique filename
   */
  generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, extension);
    
    return `${baseName}_${timestamp}_${random}${extension}`;
  }
}

// Export singleton instance
export const fileUtilsService = new FileUtilsService();