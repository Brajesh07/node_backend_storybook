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
const uploadHandler = upload.single('photo');
router.post('/upload', (req: any, res: any, next: any) => {
  uploadHandler(req, res, async (err: any) => {
    if (err) {
      console.error('❌ Multer error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Upload failed'
      });
    }

    try {
      let { sessionId } = req.body;
      
      // Generate new sessionId if not provided
      if (!sessionId) {
        sessionId = uuidv4();
        console.log(`📝 Generated new sessionId for upload: ${sessionId}`);
      }

      // Retrieve or create session data
      let sessionData = sessionStorage.get(sessionId);
      if (!sessionData) {
        // Create basic session data for upload-only flow
        sessionData = {
          childData: {
            childName: 'User', // Default values for upload-only flow
            age: 6,
            gender: 'boy',
            language: 'English',
            parentName: 'Parent'
          },
          timestamp: Date.now()
        };
        sessionStorage.set(sessionId, sessionData);
        console.log(`📝 Created basic session data for upload`);
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

      return res.json({
        success: true,
        data: {
          uploadedFile: uploadResult.url,
          sessionId: sessionId,
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
      return res.status(500).json({
        success: false,
        error: 'Failed to upload image. Please try again.'
      });
    }
  });
});/**
 * POST /api/character/generate
 * Generate character images
 */
router.post('/character/generate', async (req: Request, res: Response) => {
  try {
    const { sessionId, generateMultiple = false, existingStory, existingAnalysis } = req.body;
    
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

    // If we have existing story and analysis data, use it
    if (existingStory) {
      console.log(`📚 Using existing story data with ${existingStory.chapters?.length || 0} chapters`);
      sessionData.storyResult = existingStory;
    }
    
    if (existingAnalysis) {
      console.log(`🔍 Using existing analysis data`);
      sessionData.analysisResult = existingAnalysis;
    }

    const { childData, analysisResult, uploadResult } = sessionData;
    
    console.log(`🎨 Generating character images for ${childData.childName}...`);

    let generatedImages: any[] = [];
    let singleImage: string | null = null;

    // Skip actual image generation for now - focus on PDF generation
    console.log(`⏭️  Skipping image generation for ${childData.childName} - focusing on PDF`);
    
    // Always create 8 chapters and character images for the storybook
    const totalChapters = 8;
    const chapterPrompts: string[] = [];
    
    // Check if we have existing story chapters from the story generation
    const hasExistingStory = sessionData.storyResult && sessionData.storyResult.chapters && sessionData.storyResult.chapters.length > 0;
    console.log(`📚 Has existing story: ${hasExistingStory}`);
    
    // Generate detailed story chapters
    const defaultChapterStories = [
      `${childData.childName} discovers a magical door hidden behind the old oak tree in their backyard. As they push it open, a world of wonder and adventure awaits them on the other side.`,
      `Stepping through the magical door, ${childData.childName} finds themselves in an enchanted forest where the trees whisper secrets and flowers glow with their own light.`,
      `${childData.childName} meets a wise talking owl who becomes their guide. The owl tells them about an ancient treasure that can only be found by someone with a pure heart.`,
      `Together with their new friend, ${childData.childName} crosses a sparkling river on the back of a friendly dragon who loves to help young adventurers on their quests.`,
      `${childData.childName} discovers a hidden cave filled with glittering crystals. Each crystal holds a memory of courage from children who came before them.`,
      `In a beautiful meadow, ${childData.childName} helps a family of lost rabbits find their way home, learning that kindness is the greatest magic of all.`,
      `${childData.childName} faces their biggest challenge yet - crossing a bridge guarded by a lonely giant who just wants a friend to talk to.`,
      `With the treasure in hand and new friends by their side, ${childData.childName} returns home, knowing that the greatest adventure is the one that lives in their heart.`
    ];
    
    // Generate 8 chapters with character images
    for (let i = 0; i < totalChapters; i++) {
      const chapterNumber = i + 1;
      
      // Prioritize existing story chapters, then use defaults
      let chapterText = defaultChapterStories[i]; // Default fallback
      
      if (hasExistingStory && sessionData.storyResult.chapters[i]) {
        const existingChapter = sessionData.storyResult.chapters[i];
        chapterText = existingChapter.fullChapterText || existingChapter.chapterText || chapterText;
        console.log(`📖 Using existing chapter ${chapterNumber} text (${chapterText.length} chars)`);
      } else {
        console.log(`📝 Using default chapter ${chapterNumber} text`);
      }
      
      // Generate character prompt for this chapter
      const chapterPrompt = `A magical character illustration of ${childData.childName}, a ${childData.age}-year-old ${childData.gender}, in Chapter ${chapterNumber} of their adventure story. The character should be depicted in an engaging scene that matches the chapter's theme.`;
      
      chapterPrompts.push(chapterPrompt);
    }
    
    // Create generated images data for all 8 chapters
    generatedImages = Array.from({ length: totalChapters }, (_, index) => {
      const chapterNumber = index + 1;
      
      // Prioritize existing story chapters, then use defaults
      let chapterText = defaultChapterStories[index]; // Default fallback
      
      if (hasExistingStory && sessionData.storyResult.chapters[index]) {
        const existingChapter = sessionData.storyResult.chapters[index];
        chapterText = existingChapter.fullChapterText || existingChapter.chapterText || chapterText;
      }
      
      return {
        chapterNumber,
        filename: `mock_chapter_${chapterNumber}.jpg`,
        prompt: chapterPrompts[index],
        url: uploadResult.url, // Use uploaded image as character placeholder
        fullChapterText: chapterText
      };
    });
    
    // Update analysis result
    if (analysisResult) {
      analysisResult.chapterPrompts = chapterPrompts;
    }

    // Update session with generated images and preserve story data
    sessionData.generatedImages = generatedImages;
    sessionData.singleImage = null; // No single image in multi-chapter mode
    sessionData.generateTimestamp = Date.now();
    
    // Ensure story data is preserved for PDF generation
    if (hasExistingStory) {
      console.log(`📚 Preserving story data with ${sessionData.storyResult.chapters.length} chapters`);
    }
    
    sessionStorage.set(sessionId, sessionData);

    console.log(`✅ Character generation completed for ${childData.childName} - ${generatedImages.length} chapters created`);

    return res.json({
      success: true,
      data: {
        singleImage: null,
        images: generatedImages.map(img => ({
          chapterNumber: img.chapterNumber,
          filename: img.filename,
          url: img.url,
          prompt: img.prompt.substring(0, 100) + '...'
        })),
        generatedImages: generatedImages.map(img => ({
          chapterNumber: img.chapterNumber,
          filename: img.filename,
          url: img.url,
          prompt: img.prompt.substring(0, 100) + '...'
        })),
        totalImages: generatedImages.length,
        isMultiChapter: true
      }
    });

  } catch (error) {
    console.error('❌ Error generating character images:', error);
    return res.status(500).json({
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

    const { childData, storyResult, generatedImages, singleImage, uploadResult } = sessionData;
    
    console.log(`📚 Generating PDF storybook for ${childData.childName}...`);
    console.log(`DEBUG: Has storyResult: ${!!storyResult}`);
    console.log(`DEBUG: Has uploadResult: ${!!uploadResult}`);
    console.log(`DEBUG: singleImage: ${singleImage}`);
    console.log(`DEBUG: Generated images count: ${generatedImages?.length || 0}`);
    
    // Debug story data
    if (storyResult && storyResult.chapters) {
      console.log(`DEBUG: Story has ${storyResult.chapters.length} chapters`);
      storyResult.chapters.forEach((chapter: any, index: number) => {
        const text = chapter.fullChapterText || chapter.chapterText || '';
        console.log(`DEBUG: Story Chapter ${index + 1}: ${text.substring(0, 100)}...`);
      });
    } else {
      console.log(`DEBUG: No story chapters found in storyResult`);
    }
    console.log(`DEBUG: Has storyResult: ${!!storyResult}`);
    console.log(`DEBUG: Has uploadResult: ${!!uploadResult}`);
    console.log(`DEBUG: singleImage: ${singleImage}`);
    console.log(`DEBUG: generatedImages count: ${generatedImages?.length || 0}`);

    let pdfFilename: string;
    const imagePath = singleImage || uploadResult?.url || null;
    const storyText = storyResult?.storyText || `A wonderful story about ${childData.childName}'s adventure!`;
    
    console.log(`DEBUG: Using imagePath: ${imagePath}`);
    console.log(`DEBUG: Story text length: ${storyText.length} characters`);
    console.log(`DEBUG: Generated images count: ${generatedImages?.length || 0}`);
    
    // Log each chapter for debugging
    if (generatedImages) {
      generatedImages.forEach((img: any) => {
        console.log(`DEBUG: Chapter ${img.chapterNumber} - Text length: ${img.fullChapterText?.length || 0}`);
        console.log(`DEBUG: Chapter ${img.chapterNumber} - Text preview: ${img.fullChapterText?.substring(0, 100)}...`);
        console.log(`DEBUG: Chapter ${img.chapterNumber} - Has URL: ${!!img.url}`);
      });
    }

    // Always use multi-chapter format if we have generated images
    if (generatedImages && generatedImages.length > 0) {
      console.log(`📚 Generating multi-chapter PDF with ${generatedImages.length} chapters`);
      // Generate multi-chapter PDF
      pdfFilename = await pdfGeneratorService.createMultiChapterPDF({
        childName: childData.childName,
        age: childData.age,
        gender: childData.gender,
        language: childData.language,
        parentName: childData.parentName,
        chapterImages: generatedImages,
        storyText: storyText
      });
    } else {
      console.log(`📚 Generating single-image PDF`);
      // Generate single-image PDF
      pdfFilename = await pdfGeneratorService.generatePDF({
        childName: childData.childName,
        age: childData.age,
        gender: childData.gender,
        language: childData.language,
        parentName: childData.parentName,
        caricatureImagePath: imagePath,
        storyText: storyText
      });
    }

    // Update session with PDF info
    sessionData.pdfFilename = pdfFilename;
    sessionData.pdfTimestamp = Date.now();
    sessionStorage.set(sessionId, sessionData);

    console.log(`✅ PDF generated successfully: ${pdfFilename}`);

    return res.json({
      success: true,
      data: {
        pdfFilename,
        downloadUrl: `http://localhost:3001/api/pdf/download/${sessionId}`,
        metadata: {
          title: `${childData.childName}_storybook.pdf`,
          childName: childData.childName,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    return res.status(500).json({
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
    return; // Explicitly return after streaming

  } catch (error) {
    console.error('❌ Error downloading PDF:', error);
    return res.status(500).json({
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

    return res.sendFile(path.resolve(filename));

  } catch (error) {
    console.error('❌ Error serving image:', error);
    return res.status(500).json({
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
    return res.json({
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
    return res.status(500).json({
      success: false,
      error: 'Failed to get session data'
    });
  }
});

/**
 * GET /api/debug/session/:sessionId
 * Debug endpoint to check session data
 */
router.get('/debug/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const sessionData = sessionStorage.get(sessionId);
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Return detailed session data for debugging
    return res.json({
      success: true,
      data: {
        hasStoryResult: !!sessionData.storyResult,
        storyChaptersCount: sessionData.storyResult?.chapters?.length || 0,
        storyChapters: sessionData.storyResult?.chapters?.map((ch: any, i: number) => ({
          chapterNumber: ch.chapterNumber,
          hasFullChapterText: !!ch.fullChapterText,
          hasChapterText: !!ch.chapterText,
          textPreview: (ch.fullChapterText || ch.chapterText || '').substring(0, 100) + '...'
        })) || [],
        hasGeneratedImages: !!sessionData.generatedImages,
        generatedImagesCount: sessionData.generatedImages?.length || 0,
        generatedImages: sessionData.generatedImages?.map((img: any) => ({
          chapterNumber: img.chapterNumber,
          hasFullChapterText: !!img.fullChapterText,
          textPreview: (img.fullChapterText || '').substring(0, 100) + '...'
        })) || []
      }
    });

  } catch (error) {
    console.error('❌ Error getting debug session:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get debug session data'
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