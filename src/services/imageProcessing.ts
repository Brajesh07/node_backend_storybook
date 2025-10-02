import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import Replicate from 'replicate';
import { configService } from '../config';
import { StoryAnalysis } from './storyAnalysis';

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

export interface GeneratedImage {
  filename: string;
  chapterNumber: number;
  fullChapterText: string;
  prompt: string;
  url?: string; // URL for serving the image (Cloudinary or backend)
  cloudinaryUrl?: string; // Original Cloudinary URL
}

export class ImageProcessingService {

  /**
   * Generate a single character image using Replicate API and store in Cloudinary
   */
  async generateCharacterImage(imageUrl: string, enhancedPrompt: string): Promise<string | null> {
    if (!configService.config.replicateEnabled) {
      console.log("DEBUG: Replicate disabled - skipping image generation");
      return null;
    }

    if (!configService.config.cloudinaryUrl) {
      console.error("ERROR: Cloudinary not configured - cannot store images");
      return null;
    }

    try {
      const payload = {
        [configService.config.replicateInputKey]: imageUrl,
        prompt: enhancedPrompt,
        aspect_ratio: "1:1",
        safety_tolerance: 2
      };

      console.log(`DEBUG: Generating character image with prompt: ${enhancedPrompt.substring(0, 100)}...`);
      
      const output = await replicate.run(configService.config.replicateModel, { input: payload });
      
      console.log(`DEBUG: Replicate returned output type: ${typeof output}`);
      console.log(`DEBUG: Replicate raw output:`, output);
      
      if (typeof output === 'string') {
        console.log(`DEBUG: Replicate output URL: ${output}`);
      } else {
        console.log(`DEBUG: Replicate output is not a string, type: ${typeof output}`);
      }
      
      // Handle different output types from Replicate
      let imageData: Buffer;
      let replicateImageUrl: string;
      
      if (output instanceof Buffer) {
        imageData = output;
        console.log(`DEBUG: Output is Buffer, size: ${imageData.length} bytes`);
      } else if (typeof output === 'string') {
        // If output is a URL, download the image
        replicateImageUrl = output;
        console.log(`DEBUG: Output is string URL: ${replicateImageUrl}`);
        
        const response = await fetch(replicateImageUrl);
        if (!response.ok) {
          console.error(`❌ Failed to download from Replicate URL: ${response.status} ${response.statusText}`);
          throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        imageData = Buffer.from(arrayBuffer);
        console.log(`DEBUG: Successfully downloaded image: ${imageData.length} bytes`);
      } else if (Array.isArray(output) && output.length > 0) {
        // Handle array output (common with some Replicate models)
        replicateImageUrl = output[0];
        console.log(`DEBUG: Output is array, using first item: ${replicateImageUrl}`);
        
        const response = await fetch(replicateImageUrl);
        if (!response.ok) {
          console.error(`❌ Failed to download from Replicate URL: ${response.status} ${response.statusText}`);
          throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        imageData = Buffer.from(arrayBuffer);
        console.log(`DEBUG: Successfully downloaded image from array: ${imageData.length} bytes`);
      } else if (output && typeof output === 'object' && 'read' in output) {
        // File-like object
        const chunks: Uint8Array[] = [];
        const reader = (output as any).getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        imageData = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), totalLength);
      } else if (output && Symbol.iterator in Object(output)) {
        // Iterable of chunks
        const chunks: Buffer[] = [];
        for (const chunk of output as Iterable<any>) {
          chunks.push(Buffer.from(chunk));
        }
        imageData = Buffer.concat(chunks);
      } else {
        throw new Error(`Unexpected output type: ${typeof output}, value: ${String(output).substring(0, 100)}`);
      }
      
      // Upload to Cloudinary instead of saving locally
      const uniqueId = uuidv4();
      const publicId = `storybook/character_${uniqueId}`;
      
      console.log(`DEBUG: Uploading image to Cloudinary with public_id: ${publicId}`);
      
      // Upload buffer directly to Cloudinary
      const cloudinaryResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            folder: 'storybook',
            resource_type: 'image',
            format: 'jpg',
            transformation: [
              { quality: 'auto:good' },
              { width: 512, height: 512, crop: 'fill' }
            ]
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        ).end(imageData);
      });
      
      const cloudinaryUrl = cloudinaryResult.secure_url;
      console.log(`DEBUG: Successfully uploaded to Cloudinary: ${cloudinaryUrl}`);
      
      // Return the Cloudinary URL directly since we'll serve images from Cloudinary
      // This eliminates the need for local storage and backend image serving
      return cloudinaryUrl;
      
    } catch (error) {
      console.error(`ERROR: Failed to generate character image: ${error}`);
      return null;
    }
  }

  /**
   * Generate multiple images based on chapter-specific prompts
   */
  async generateChapterImages(
    imageUrl: string, 
    childName: string, 
    analysisResult: StoryAnalysis
  ): Promise<GeneratedImage[]> {
    if (!configService.config.replicateEnabled) {
      console.log("DEBUG: Replicate disabled - skipping multi-image generation");
      return [];
    }

    const generatedImages: GeneratedImage[] = [];
    
    // Debug: Check what's in analysis_result
    console.log(`DEBUG: generate_chapter_images - analysis_result keys: ${Object.keys(analysisResult)}`);
    console.log(`DEBUG: generate_chapter_images - chapter_prompts type: ${typeof analysisResult.chapterPrompts}`);
    console.log(`DEBUG: generate_chapter_images - chapter_prompts length: ${analysisResult.chapterPrompts.length}`);
    console.log(`DEBUG: generate_chapter_images - chapters type: ${typeof analysisResult.chapters}`);
    console.log(`DEBUG: generate_chapter_images - chapters length: ${analysisResult.chapters.length}`);
    
    // Get chapter prompts and chapters from analysis
    const { chapterPrompts, chapters } = analysisResult;
    
    // Debug the actual content
    if (chapterPrompts.length > 0) {
      console.log(`DEBUG: First chapter prompt: ${chapterPrompts[0].substring(0, 100)}...`);
    }
    if (chapters.length > 0) {
      console.log(`DEBUG: First chapter data keys: ${Object.keys(chapters[0])}`);
    }
    
    if (!chapterPrompts || chapterPrompts.length === 0) {
      console.log("DEBUG: No chapter prompts found, falling back to single image");
      console.log(`DEBUG: Available keys in analysis_result: ${Object.keys(analysisResult)}`);
      console.log(`DEBUG: chapter_prompts value: ${chapterPrompts}`);
      console.log(`DEBUG: chapters value: ${chapters}`);
      return [];
    }
    
    if (!chapters || chapters.length === 0) {
      console.log("DEBUG: No chapters found, cannot generate chapter images");
      return [];
    }
    
    console.log(`DEBUG: Generating ${chapterPrompts.length} chapter-specific images`);
    
    // Generate images for each chapter
    for (let i = 0; i < Math.min(chapterPrompts.length, chapters.length); i++) {
      try {
        const chapterData = chapters[i];
        const prompt = chapterPrompts[i];
        
        console.log(`DEBUG: Generating image ${i + 1}/${chapterPrompts.length}`);
        console.log(`DEBUG: Chapter ${chapterData.chapterNumber}: ${chapterData.chapterText.substring(0, 100)}...`);
        
        // Replace placeholder with actual child name
        const personalizedPrompt = prompt.replace(/the child/g, childName);
        console.log(`DEBUG: Enhanced prompt for Chapter ${chapterData.chapterNumber}:`);
        console.log(`       ${personalizedPrompt.substring(0, 200)}...`);
        
        const payload = {
          [configService.config.replicateInputKey]: imageUrl,
          prompt: personalizedPrompt,
          aspect_ratio: "1:1",
          safety_tolerance: 2
        };
        
        // Generate image for this chapter
        const output = await replicate.run(configService.config.replicateModel, { input: payload });
        
        // Handle FileOutput object
        const chapterFilename = `chapter_${i + 1}_${uuidv4()}.jpg`;
        
        let imageData: Buffer;
        
        if (output instanceof Buffer) {
          imageData = output;
        } else if (typeof output === 'string') {
          // If output is a URL, download the image
          const response = await fetch(output);
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          imageData = Buffer.from(arrayBuffer);
        } else if (output && typeof output === 'object' && 'read' in output) {
          // File-like object
          const chunks: Uint8Array[] = [];
          const reader = (output as any).getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          imageData = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), totalLength);
        } else if (output && Symbol.iterator in Object(output)) {
          // Iterable of chunks
          const chunks: Buffer[] = [];
          for (const chunk of output as Iterable<any>) {
            chunks.push(Buffer.from(chunk));
          }
          imageData = Buffer.concat(chunks);
        } else {
          throw new Error(`Unexpected output type: ${typeof output}`);
        }
        
        // Save chapter image
        fs.writeFileSync(chapterFilename, imageData);
        
        console.log(`DEBUG: Chapter ${i + 1} image saved: ${chapterFilename} (${imageData.length} bytes)`);
        
        generatedImages.push({
          filename: chapterFilename,
          chapterNumber: chapterData.chapterNumber,
          fullChapterText: chapterData.fullChapterText,
          prompt: personalizedPrompt
        });
        
      } catch (error) {
        console.log(`DEBUG: Failed to generate image for chapter ${i + 1}: ${error}`);
        continue;
      }
    }
    
    return generatedImages;
  }

  /**
   * Download image from URL and save locally
   */
  async downloadAndSaveImage(imageUrl: string, filename: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      fs.writeFileSync(filename, buffer);
      
      console.log(`DEBUG: Image downloaded and saved: ${filename} (${buffer.length} bytes)`);
      return true;
      
    } catch (error) {
      console.error(`ERROR: Failed to download image from ${imageUrl}:`, error);
      return false;
    }
  }

  /**
   * Clean up generated image files
   */
  async cleanupGeneratedImages(filenames: string[]): Promise<void> {
    for (const filename of filenames) {
      try {
        if (fs.existsSync(filename)) {
          fs.unlinkSync(filename);
          console.log(`DEBUG: Cleaned up generated image: ${filename}`);
        }
      } catch (error) {
        console.error(`Warning: Failed to cleanup image ${filename}:`, error);
      }
    }
  }
}

// Export singleton instance
export const imageProcessingService = new ImageProcessingService();