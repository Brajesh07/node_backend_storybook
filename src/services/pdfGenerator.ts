import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import { GeneratedImage } from './imageProcessing';

export interface PDFGenerationOptions {
  childName: string;
  age: number;
  gender: string;
  language: string;
  parentName: string;
  caricatureImagePath?: string;
  storyText: string;
  chapterImages?: GeneratedImage[];
}

export class PDFGeneratorService {

  /**
   * Generate a PDF storybook with caricature image and story text
   */
  async generatePDF(options: PDFGenerationOptions): Promise<string> {
    const {
      childName,
      age,
      gender,
      language,
      parentName,
      caricatureImagePath,
      storyText
    } = options;

    const pdfFilename = `storybook_${uuidv4()}.pdf`;
    
    try {
      // Create HTML content for the PDF
      console.log(`DEBUG: Starting PDF generation for ${childName}`);
      console.log(`DEBUG: Story text length: ${storyText.length} characters`);
      console.log(`DEBUG: Image path: ${caricatureImagePath}`);
      
      const htmlContent = await this.createStoryHTML({
        childName,
        age,
        gender,
        language,
        parentName,
        caricatureImagePath,
        storyText
      });

      console.log(`DEBUG: HTML content generated, length: ${htmlContent.length} characters`);

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: pdfFilename,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      await browser.close();
      
      console.log(`DEBUG: PDF generated: ${pdfFilename}`);
      return pdfFilename;

    } catch (error) {
      console.error(`ERROR: Failed to generate PDF: ${error}`);
      throw new Error(`PDF generation failed: ${error}`);
    }
  }

  /**
   * Generate a PDF storybook with multiple chapter images
   */
  async createMultiChapterPDF(options: PDFGenerationOptions): Promise<string> {
    const {
      childName,
      age,
      gender,
      language,
      parentName,
      chapterImages = [],
      storyText
    } = options;

    const pdfFilename = `storybook_multi_${uuidv4()}.pdf`;
    
    try {
      // Create HTML content for the multi-chapter PDF
      const htmlContent = await this.createMultiChapterHTML({
        childName,
        age,
        gender,
        language,
        parentName,
        chapterImages,
        storyText
      });

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: pdfFilename,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      await browser.close();
      
      console.log(`DEBUG: Multi-chapter PDF generated: ${pdfFilename}`);
      return pdfFilename;

    } catch (error) {
      console.error(`ERROR: Failed to generate multi-chapter PDF: ${error}`);
      throw new Error(`Multi-chapter PDF generation failed: ${error}`);
    }
  }

  /**
   * Create HTML content for single-image storybook
   */
  private async createStoryHTML(options: PDFGenerationOptions): Promise<string> {
    const {
      childName,
      age,
      gender,
      language,
      parentName,
      caricatureImagePath,
      storyText
    } = options;

    // Convert image to base64 if it exists
    let imageBase64 = '';
    if (caricatureImagePath) {
      try {
        imageBase64 = await this.getImageAsBase64(caricatureImagePath);
        console.log(`DEBUG: Successfully converted image to base64 for PDF`);
      } catch (error) {
        console.error(`ERROR: Failed to convert image to base64:`, error);
      }
    }

    // Get font family based on language
    const fontFamily = this.getFontFamily(language);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: ${fontFamily};
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .title {
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 30px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        .character-image {
            display: block;
            margin: 30px auto;
            max-width: 300px;
            max-height: 300px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }
        .story-content {
            font-size: 14px;
            line-height: 1.8;
            text-align: justify;
            margin: 30px 0;
        }
        .chapter {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        .chapter-title {
            font-size: 18px;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 10px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 40px;
            font-style: italic;
        }
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="title">${childName}'s Adventure Story</div>
    
    ${imageBase64 ? `<img src="${imageBase64}" alt="${childName}'s Character" class="character-image">` : ''}
    
    <div class="story-content">
        ${this.formatStoryText(storyText)}
    </div>
    
    <div class="footer">
        Created with love for ${childName} by ${parentName}
    </div>
</body>
</html>`;
  }

  /**
   * Create HTML content for multi-chapter storybook
   */
  private async createMultiChapterHTML(options: PDFGenerationOptions): Promise<string> {
    const {
      childName,
      age,
      gender,
      language,
      parentName,
      chapterImages = [],
      storyText
    } = options;

    // Get font family based on language
    const fontFamily = this.getFontFamily(language);

    console.log(`DEBUG: Creating multi-chapter PDF with ${chapterImages.length} chapters`);

    // Convert chapter images to base64
    const chapterImagesWithBase64 = await Promise.all(
      chapterImages.map(async (chapter, index) => {
        let imageBase64 = '';
        try {
          // Use the URL (which contains the actual Cloudinary URL)
          const imagePath = chapter.url || chapter.cloudinaryUrl;
          if (imagePath) {
            console.log(`DEBUG: Converting chapter ${chapter.chapterNumber} image from URL: ${imagePath}`);
            imageBase64 = await this.getImageAsBase64(imagePath);
            console.log(`DEBUG: Successfully converted chapter ${chapter.chapterNumber} image to base64`);
          } else {
            console.error(`ERROR: No URL found for chapter ${chapter.chapterNumber}`);
          }
        } catch (error) {
          console.error(`ERROR: Failed to convert chapter ${chapter.chapterNumber} image:`, error);
        }
        
        console.log(`DEBUG: Chapter ${chapter.chapterNumber} text:`, chapter.fullChapterText?.substring(0, 100) + '...');
        return { ...chapter, imageBase64 };
      })
    );

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: ${fontFamily};
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .title {
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 40px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .chapter {
            margin-bottom: 30px;
            page-break-inside: avoid;
            padding: 20px 0;
        }
        .chapter-title {
            font-size: 20px;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 15px;
            text-align: center;
            padding: 10px 0;
            border-bottom: 2px solid #3498db;
        }
        .chapter-image {
            display: block;
            margin: 15px auto;
            max-width: 280px;
            max-height: 280px;
            border-radius: 12px;
            box-shadow: 0 6px 12px rgba(0,0,0,0.2);
        }
        .chapter-text {
            font-size: 14px;
            line-height: 1.9;
            text-align: justify;
            margin: 20px 0;
            padding: 0 10px;
            min-height: 100px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 50px;
            font-style: italic;
        }
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="title">${childName}'s Adventure Story</div>
    
    ${chapterImagesWithBase64.map((chapter, index) => {
      console.log(`DEBUG: Rendering chapter ${chapter.chapterNumber} in PDF`);
      console.log(`DEBUG: Chapter has image: ${!!chapter.imageBase64}`);
      console.log(`DEBUG: Chapter text length: ${chapter.fullChapterText?.length || 0}`);
      
      return `
        <div class="chapter">
            <div class="chapter-title">Chapter ${chapter.chapterNumber}</div>
            ${chapter.imageBase64 ? `<img src="${chapter.imageBase64}" alt="Chapter ${chapter.chapterNumber}" class="chapter-image">` : '<div style="text-align: center; color: #999; margin: 20px;">Character Image Loading...</div>'}
            <div class="chapter-text">${this.formatChapterText(chapter.fullChapterText || `Chapter ${chapter.chapterNumber} content is being prepared...`)}</div>
            ${index < chapterImagesWithBase64.length - 1 ? '<div class="page-break"></div>' : ''}
        </div>
      `;
    }).join('')}
    
    <div class="footer">
        Created with love for ${childName} by ${parentName}
    </div>
</body>
</html>`;
  }

  /**
   * Format story text with proper HTML structure
   */
  private formatStoryText(storyText: string): string {
    // Simple formatting - just ensure paragraphs are properly formatted
    if (!storyText || storyText.trim() === '') {
      return '<p>No story content available.</p>';
    }
    
    // Split by double newlines for paragraphs, or chapters if they exist
    const chapters = storyText.split(/Chapter \d+:/);
    
    if (chapters.length > 1) {
      // Has chapters
      return chapters
        .filter(chapter => chapter.trim())
        .map((chapter, index) => {
          const lines = chapter.trim().split('\n');
          const title = lines[0]?.trim();
          const content = lines.slice(1).join('\n').trim();
          
          if (index === 0 && !title) {
            // First part before any chapter
            return `<div class="chapter-text"><p>${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p></div>`;
          }
          
          return `
            <div class="chapter">
              <div class="chapter-title">Chapter ${index + 1}: ${title}</div>
              <div class="chapter-text"><p>${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p></div>
            </div>
          `;
        })
        .join('');
    } else {
      // Simple story without chapters
      const paragraphs = storyText.split(/\n\n+/);
      return paragraphs
        .filter(p => p.trim())
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }
  }

  /**
   * Format individual chapter text
   */
  private formatChapterText(chapterText: string): string {
    if (!chapterText || chapterText.trim() === '') {
      return '<p>Chapter content is being prepared...</p>';
    }
    
    // Remove any existing chapter titles/numbers from the text
    const cleanText = chapterText.replace(/^Chapter \d+:?\s*/i, '').trim();
    
    // Split into paragraphs and format
    const paragraphs = cleanText.split(/\n\n+/);
    return paragraphs
      .filter(p => p.trim())
      .map(p => `<p>${p.replace(/\n/g, '<br>').trim()}</p>`)
      .join('');
  }

  /**
   * Convert image (URL or local path) to base64
   */
  private async getImageAsBase64(imagePath: string): Promise<string> {
    try {
      // Check if it's a URL
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        console.log(`DEBUG: Downloading image from URL: ${imagePath}`);
        const response = await fetch(imagePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        console.log(`DEBUG: Successfully converted URL image to base64, size: ${buffer.length} bytes`);
        return base64;
      } else {
        // It's a local file path
        console.log(`DEBUG: Reading local image file: ${imagePath}`);
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          const base64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
          console.log(`DEBUG: Successfully converted local image to base64, size: ${imageBuffer.length} bytes`);
          return base64;
        } else {
          throw new Error(`Local file not found: ${imagePath}`);
        }
      }
    } catch (error) {
      console.error(`ERROR: Failed to convert image to base64: ${imagePath}`, error);
      // Return a placeholder base64 image (1x1 transparent pixel)
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
  }

  /**
   * Get appropriate font family based on language
   */
  private getFontFamily(language: string): string {
    const fontMap: { [key: string]: string } = {
      'Hindi': '"Devanagari Sangam MN", "Noto Sans Devanagari", "Arial Unicode MS", sans-serif',
      'Chinese': '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      'Arabic': '"Geeza Pro", "Arabic Typesetting", "Tahoma", sans-serif',
      'Japanese': '"Hiragino Kaku Gothic Pro", "Meiryo", sans-serif',
      'Korean': '"Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      'default': '"Helvetica Neue", "Arial", sans-serif'
    };

    return fontMap[language] || fontMap['default'];
  }

  /**
   * Clean up generated PDF files
   */
  async cleanupPDFFile(filename: string): Promise<void> {
    try {
      if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
        console.log(`DEBUG: Cleaned up PDF file: ${filename}`);
      }
    } catch (error) {
      console.error(`Warning: Failed to cleanup PDF ${filename}:`, error);
    }
  }
}

// Export singleton instance
export const pdfGeneratorService = new PDFGeneratorService();