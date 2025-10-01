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
      const htmlContent = this.createStoryHTML({
        childName,
        age,
        gender,
        language,
        parentName,
        caricatureImagePath,
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
      const htmlContent = this.createMultiChapterHTML({
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
  private createStoryHTML(options: PDFGenerationOptions): string {
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
    if (caricatureImagePath && fs.existsSync(caricatureImagePath)) {
      const imageBuffer = fs.readFileSync(caricatureImagePath);
      imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
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
  private createMultiChapterHTML(options: PDFGenerationOptions): string {
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

    // Convert chapter images to base64
    const chapterImagesWithBase64 = chapterImages.map(chapter => {
      let imageBase64 = '';
      if (fs.existsSync(chapter.filename)) {
        const imageBuffer = fs.readFileSync(chapter.filename);
        imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
      }
      return { ...chapter, imageBase64 };
    });

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
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        .chapter-title {
            font-size: 22px;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 20px;
            text-align: center;
        }
        .chapter-image {
            display: block;
            margin: 20px auto;
            max-width: 250px;
            max-height: 250px;
            border-radius: 12px;
            box-shadow: 0 6px 12px rgba(0,0,0,0.2);
        }
        .chapter-text {
            font-size: 13px;
            line-height: 1.8;
            text-align: justify;
            margin: 20px 0;
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
    
    ${chapterImagesWithBase64.map(chapter => `
        <div class="chapter">
            <div class="chapter-title">Chapter ${chapter.chapterNumber}</div>
            ${chapter.imageBase64 ? `<img src="${chapter.imageBase64}" alt="Chapter ${chapter.chapterNumber}" class="chapter-image">` : ''}
            <div class="chapter-text">${this.formatChapterText(chapter.fullChapterText)}</div>
        </div>
    `).join('')}
    
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
    // Split by chapters and format
    const chapters = storyText.split(/Chapter \d+:/);
    
    return chapters
      .filter(chapter => chapter.trim())
      .map((chapter, index) => {
        const lines = chapter.trim().split('\n');
        const title = lines[0]?.trim();
        const content = lines.slice(1).join('\n').trim();
        
        if (index === 0 && !title) {
          // First part before any chapter
          return `<div class="chapter-text">${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>`;
        }
        
        return `
          <div class="chapter">
            <div class="chapter-title">Chapter ${index + 1}: ${title}</div>
            <div class="chapter-text">${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Format individual chapter text
   */
  private formatChapterText(chapterText: string): string {
    return chapterText
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
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