import { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { configService } from '../config';
import { storyGeneratorService, ChildData } from '../services/storyGenerator';
import { storyAnalysisService } from '../services/storyAnalysis';
import { fileUtilsService } from '../services/fileUtils';
import { imageProcessingService } from '../services/imageProcessing';
import { pdfGeneratorService } from '../services/pdfGenerator';

// Configure multer for file uploads
const upload = multer({
  dest: 'temp/',
  limits: {
    fileSize: configService.config.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (fileUtilsService.isAllowedFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload an image file.'));
    }
  },
});

// Validation schemas
const storyGenerationSchema = Joi.object({
  childName: Joi.string().trim().min(1).max(50).required(),
  age: Joi.number().integer().min(2).max(12).required(),
  gender: Joi.string().valid('boy', 'girl').required(),
  language: Joi.string().valid(
    'English', 'Spanish', 'Hindi', 'French', 'German', 'Chinese'
  ).required(),
  parentName: Joi.string().trim().min(1).max(50).required(),
});

// In-memory session storage (in production, use Redis)
const sessionStorage = new Map<string, any>();

const router = Router();

/**
 * POST /api/story/generate
 * Generate a personalized story
 */
router.post('/story/generate', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = storyGenerationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const childData: ChildData = value;
    console.log(`🎭 Generating story for ${childData.childName}...`);

    // Generate story
    const storyResult = await storyGeneratorService.generateStory(childData);
    
    // Analyze story for enhanced prompts
    const analysisResult = storyAnalysisService.analyzeStoryAndBuildPrompt(
      storyResult.storyText,
      childData.age,
      childData.gender
    );

    // Generate chapter prompts based on the story chapters
    const chapterPrompts = storyResult.chapters.map((chapter, index) => {
      const chapterElements = storyAnalysisService.analyzeChapterElements(chapter.chapterText);
      return storyAnalysisService.generateChapterPrompt(
        childData.age,
        childData.gender,
        index + 1,
        chapterElements
      );
    });

    // Update analysis result with chapter prompts
    analysisResult.chapterPrompts = chapterPrompts;
    analysisResult.chapters = storyResult.chapters;

    console.log(`📚 Generated ${chapterPrompts.length} chapter prompts for ${childData.childName}`);

    // Store in session
    const sessionId = uuidv4();
    sessionStorage.set(sessionId, {
      childData,
      storyResult,
      analysisResult,
      timestamp: Date.now()
    });

    // Clean up old sessions (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key, value] of sessionStorage.entries()) {
      if (value.timestamp < oneHourAgo) {
        sessionStorage.delete(key);
      }
    }

    console.log(`✅ Story generated successfully for ${childData.childName}`);

    return res.json({
      success: true,
      data: {
        sessionId,
        story: storyResult.storyText,
        chapters: storyResult.chapters,
        wordCount: storyResult.wordCount,
        analysisResult: {
          primaryTheme: analysisResult.primaryTheme,
          ageCategory: analysisResult.ageCategory,
          enhancedPrompt: analysisResult.enhancedPrompt,
          chapterPrompts: analysisResult.chapterPrompts
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generating story:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate story. Please try again.'
    });
  }
});

/**
 * POST /api/upload
 * Upload and process character image
 */
router.post('/upload', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    // Retrieve session data
    const sessionData = sessionStorage.get(sessionId);
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: 'Session not found. Please start over.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No photo uploaded'
      });
    }

    // Validate file size
    if (!fileUtilsService.isValidFileSize(req.file.path)) {
      await fileUtilsService.cleanupTempFile(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      });
    }

    console.log(`📸 Processing uploaded image for ${sessionData.childData.childName}...`);

    // Upload to cloud storage
    const uploadResult = await fileUtilsService.uploadToStorage(req.file.path);
    
    if (!uploadResult) {
      await fileUtilsService.cleanupTempFile(req.file.path);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload image to cloud storage'
      });
    }

    // Update session with upload info
    sessionData.uploadResult = uploadResult;
    sessionData.uploadTimestamp = Date.now();
    sessionStorage.set(sessionId, sessionData);

    // Clean up local temp file
    await fileUtilsService.cleanupTempFile(req.file.path);

    console.log(`✅ Image uploaded successfully: ${uploadResult.url}`);

    res.json({
      success: true,
      data: {
        imageUrl: uploadResult.url,
        provider: uploadResult.provider
      }
    });

  } catch (error) {
    // Clean up temp file on error
    if (req.file) {
      await fileUtilsService.cleanupTempFile(req.file.path);
    }

    console.error('❌ Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image. Please try again.'
    });
  }
});

/**
 * POST /api/character/generate
 * Generate character images
 */
router.post('/character/generate', async (req: Request, res: Response) => {
  try {
    const { sessionId, generateMultiple = false } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    // Retrieve session data
    const sessionData = sessionStorage.get(sessionId);
    if (!sessionData || !sessionData.uploadResult) {
      return res.status(404).json({
        success: false,
        error: 'Session or upload data not found'
      });
    }

    const { childData, analysisResult, uploadResult } = sessionData;
    
    console.log(`🎨 Generating character images for ${childData.childName}...`);

    let generatedImages: any[] = [];
    let singleImage: string | null = null;

    if (generateMultiple && analysisResult.chapters && analysisResult.chapters.length > 0) {
      // Generate chapter-specific images
      
      // First, build chapter-specific prompts
      const chapterPrompts: string[] = [];
      
      for (let i = 0; i < analysisResult.chapters.length; i++) {
        const chapter = analysisResult.chapters[i];
        const chapterElements = storyAnalysisService.analyzeChapterElements(chapter.chapterText);
        
        const chapterPrompt = storyAnalysisService.buildChapterSpecificPrompt(
          analysisResult,
          chapterElements,
          childData.childName,
          childData.age,
          childData.gender,
          chapter.chapterNumber
        );
        
        chapterPrompts.push(chapterPrompt);
      }
      
      // Update analysis result with chapter prompts
      analysisResult.chapterPrompts = chapterPrompts;
      
      // Generate multiple images
      generatedImages = await imageProcessingService.generateChapterImages(
        uploadResult.url,
        childData.childName,
        analysisResult
      );
      
    } else {
      // Generate single character image
      singleImage = await imageProcessingService.generateCharacterImage(
        uploadResult.url,
        analysisResult.enhancedPrompt
      );
    }

    // Update session with generated images
    sessionData.generatedImages = generatedImages;
    sessionData.singleImage = singleImage;
    sessionData.generateTimestamp = Date.now();
    sessionStorage.set(sessionId, sessionData);

    console.log(`✅ Character generation completed for ${childData.childName}`);

    res.json({
      success: true,
      data: {
        singleImage,
        generatedImages: generatedImages.map(img => ({
          chapterNumber: img.chapterNumber,
          filename: img.filename,
          prompt: img.prompt.substring(0, 100) + '...'
        })),
        totalImages: generateMultiple ? generatedImages.length : (singleImage ? 1 : 0)
      }
    });

  } catch (error) {
    console.error('❌ Error generating character images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate character images. Please try again.'
    });
  }
});

/**
 * POST /api/pdf/generate
 * Generate PDF storybook
 */
router.post('/pdf/generate', async (req: Request, res: Response) => {
  try {
    const { sessionId, multiChapter = false } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    // Retrieve session data
    const sessionData = sessionStorage.get(sessionId);
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const { childData, storyResult, generatedImages, singleImage } = sessionData;
    
    console.log(`📚 Generating PDF storybook for ${childData.childName}...`);

    let pdfFilename: string;

    if (multiChapter && generatedImages && generatedImages.length > 0) {
      // Generate multi-chapter PDF
      pdfFilename = await pdfGeneratorService.createMultiChapterPDF({
        childName: childData.childName,
        age: childData.age,
        gender: childData.gender,
        language: childData.language,
        parentName: childData.parentName,
        chapterImages: generatedImages,
        storyText: storyResult.storyText
      });
    } else {
      // Generate single-image PDF
      pdfFilename = await pdfGeneratorService.generatePDF({
        childName: childData.childName,
        age: childData.age,
        gender: childData.gender,
        language: childData.language,
        parentName: childData.parentName,
        caricatureImagePath: singleImage,
        storyText: storyResult.storyText
      });
    }

    // Update session with PDF info
    sessionData.pdfFilename = pdfFilename;
    sessionData.pdfTimestamp = Date.now();
    sessionStorage.set(sessionId, sessionData);

    console.log(`✅ PDF generated successfully: ${pdfFilename}`);

    res.json({
      success: true,
      data: {
        pdfFilename,
        downloadUrl: `/api/pdf/download/${sessionId}`
      }
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF storybook. Please try again.'
    });
  }
});

/**
 * GET /api/pdf/download/:sessionId
 * Download generated PDF
 */
router.get('/pdf/download/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    // Retrieve session data
    const sessionData = sessionStorage.get(sessionId);
    if (!sessionData || !sessionData.pdfFilename) {
      return res.status(404).json({
        success: false,
        error: 'PDF not found'
      });
    }

    const { pdfFilename, childData } = sessionData;
    
    if (!fs.existsSync(pdfFilename)) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found on server'
      });
    }

    const downloadName = `${childData.childName}_storybook.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    
    const fileStream = fs.createReadStream(pdfFilename);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Error downloading PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download PDF'
    });
  }
});

/**
 * GET /api/image/:filename
 * Serve generated images
 */
router.get('/image/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Security: only allow specific patterns
    if (!/^(output_|chapter_)[\w-]+\.(jpg|jpeg|png)$/i.test(filename)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    if (!fs.existsSync(filename)) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    res.sendFile(path.resolve(filename));

  } catch (error) {
    console.error('❌ Error serving image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve image'
    });
  }
});

/**
 * GET /api/session/:sessionId
 * Get session data
 */
router.get('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const sessionData = sessionStorage.get(sessionId);
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Return safe session data (without sensitive info)
    res.json({
      success: true,
      data: {
        childData: sessionData.childData,
        hasStory: !!sessionData.storyResult,
        hasUpload: !!sessionData.uploadResult,
        hasImages: !!(sessionData.generatedImages || sessionData.singleImage),
        hasPDF: !!sessionData.pdfFilename,
        chapters: sessionData.storyResult?.chapters || [],
        generatedImages: sessionData.generatedImages?.map((img: any) => ({
          chapterNumber: img.chapterNumber,
          filename: img.filename
        })) || []
      }
    });

  } catch (error) {
    console.error('❌ Error getting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session data'
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

export default router;