import { configService } from '../config';

export interface ChildData {
  childName: string;
  age: number;
  gender: 'boy' | 'girl';
  language: string;
  parentName: string;
  chapterCount?: number; // Optional, defaults to 8
}

export interface Chapter {
  chapterNumber: number;
  chapterText: string;
  fullChapterText: string;
}

export interface StoryResult {
  storyText: string;
  chapters: Chapter[];
  wordCount: number;
}

export class StoryGeneratorService {
  
  /**
   * Generate a personalized story using Google Gemini AI
   */
  async generateStory(childData: ChildData): Promise<StoryResult> {
    try {
      const model = configService.genAI.getGenerativeModel({ 
        model: configService.config.geminiModel 
      });

      const prompt = this.buildStoryPrompt(childData);
      
      console.log(`🎭 Generating story for ${childData.childName} using Gemini AI...`);
      
      const result = await model.generateContent(prompt);
      const storyText = result.response.text();
      
      console.log(`✅ Story generated successfully (${storyText.length} characters)`);
      
      // Extract chapters from the generated story
      const chapters = this.extractChaptersFromStory(storyText);
      
      return {
        storyText,
        chapters,
        wordCount: storyText.split(' ').length
      };

    } catch (error) {
      console.error('❌ Error generating story with Gemini:', error);
      
      // Fallback to a structured story template
      console.log('🔄 Using fallback story generation...');
      return this.generateFallbackStory(childData);
    }
  }

  /**
   * Build the story generation prompt for Gemini AI
   */
  private buildStoryPrompt(childData: ChildData): string {
    const { childName, age, gender, language, chapterCount = 8 } = childData;
    
    const languageInstruction = language === 'English' 
      ? ''
      : ` Write the story in ${language} language.`;

    const totalWords = chapterCount * 135; // Average 135 words per chapter
    const minWords = chapterCount * 120;
    const maxWords = chapterCount * 150;

    return `Create a personalized adventure story for a ${age}-year-old ${gender} named ${childName}. 

Requirements:
- Story should be exactly ${chapterCount} chapters long
- Each chapter should be 4-5 paragraphs (120-150 words per chapter)
- Age-appropriate content for a ${age}-year-old
- The child (${childName}) should be the main character and hero
- Include themes of friendship, courage, kindness, and creativity
- Make it magical and adventurous but not scary
- Each chapter should have a clear beginning: "Chapter X: [Title]"
- Total story should be ${minWords}-${maxWords} words
${languageInstruction}

Story themes to include:
- A magical discovery that starts the adventure
- Meeting friendly magical creatures
- Solving problems through kindness and creativity
- Learning valuable lessons about friendship and courage
- A happy ending where ${childName} returns home with new wisdom

Please structure it exactly like this:
Chapter 1: [Chapter Title]
[Chapter content]

Chapter 2: [Chapter Title]
[Chapter content]

...and so on for all ${chapterCount} chapters.Make ${childName} brave, kind, and clever. The story should inspire and delight a ${age}-year-old child.`;
  }

  /**
   * Extract chapters from the generated story text
   */
  extractChaptersFromStory(storyText: string): Chapter[] {
    const chapters: Chapter[] = [];
    
    // Split by chapter markers
    const chapterPattern = /Chapter\s+(\d+):\s*([^\n]+)\n\n?([\s\S]*?)(?=Chapter\s+\d+:|$)/gi;
    let match;
    
    while ((match = chapterPattern.exec(storyText)) !== null) {
      const chapterNumber = parseInt(match[1], 10);
      const chapterTitle = match[2].trim();
      const chapterContent = match[3].trim();
      
      chapters.push({
        chapterNumber,
        chapterText: `${chapterTitle}\n\n${chapterContent}`,
        fullChapterText: `Chapter ${chapterNumber}: ${chapterTitle}\n\n${chapterContent}`
      });
    }
    
    // If no chapters found with regex, try alternative splitting
    if (chapters.length === 0) {
      console.log('⚠️ No chapters found with regex, trying alternative parsing...');
      const lines = storyText.split('\n');
      let currentChapter: Partial<Chapter> | null = null;
      let chapterContent: string[] = [];
      
      for (const line of lines) {
        const chapterMatch = line.match(/Chapter\s+(\d+):\s*(.+)/i);
        
        if (chapterMatch) {
          // Save previous chapter if exists
          if (currentChapter && chapterContent.length > 0) {
            chapters.push({
              chapterNumber: currentChapter.chapterNumber!,
              chapterText: chapterContent.join('\n').trim(),
              fullChapterText: `Chapter ${currentChapter.chapterNumber}: ${chapterContent.join('\n').trim()}`
            });
          }
          
          // Start new chapter
          currentChapter = {
            chapterNumber: parseInt(chapterMatch[1], 10)
          };
          chapterContent = [chapterMatch[2]];
        } else if (currentChapter && line.trim()) {
          chapterContent.push(line);
        }
      }
      
      // Add the last chapter
      if (currentChapter && chapterContent.length > 0) {
        chapters.push({
          chapterNumber: currentChapter.chapterNumber!,
          chapterText: chapterContent.join('\n').trim(),
          fullChapterText: `Chapter ${currentChapter.chapterNumber}: ${chapterContent.join('\n').trim()}`
        });
      }
    }
    
    console.log(`📚 Extracted ${chapters.length} chapters from story`);
    return chapters;
  }

  /**
   * Generate a structured fallback story when Gemini is unavailable
   */
  private generateFallbackStory(childData: ChildData): StoryResult {
    const { childName, age, gender } = childData;
    const pronoun = gender === 'girl' ? 'she' : 'he';
    const possessive = gender === 'girl' ? 'her' : 'his';
    
    const adventureTypes = ['enchanted forest', 'magical kingdom', 'floating cloud city', 'underwater palace'];
    const companions = ['friendly dragons', 'talking animals', 'wise fairies', 'helpful elves'];
    const challenges = ['restore the lost magic', 'find the missing rainbow', 'save the crystal of friendship', 'help lost creatures find home'];
    
    const adventureType = adventureTypes[age % adventureTypes.length];
    const companion = companions[age % companions.length];
    const challenge = challenges[age % challenges.length];

    const storyText = `Chapter 1: The Discovery

${childName} was a curious and brave ${age}-year-old who loved exploring. One sunny morning, while playing in the backyard, ${childName} noticed something sparkling behind the old oak tree. It was a beautiful, glowing crystal that seemed to pulse with magical light.

"Wow!" ${childName} whispered, carefully picking up the crystal. As soon as ${pronoun} touched it, the world around ${possessive} began to shimmer and change.

Chapter 2: The Magical Journey

Suddenly, ${childName} found ${possessive}self standing at the edge of a magnificent ${adventureType}. The crystal had transported ${possessive} to a place where magic was real and adventures waited around every corner.

"Hello there, young adventurer!" called a friendly voice. ${childName} looked around and saw a group of ${companion} approaching with warm smiles.

"We've been waiting for someone brave like you," said the leader, a wise creature with kind eyes. "Our land is in trouble, and only someone with a pure heart can help us ${challenge}."

Chapter 3: The Great Challenge

${childName} felt excited and a little nervous, but ${possessive} adventurous spirit took over. "I want to help! What do I need to do?"

The ${companion} explained that long ago, their land was filled with wonder and joy. But recently, something had gone wrong. The magic that kept their world beautiful was fading, and they needed ${childName}'s help to restore it.

"The solution lies in three special tasks," they explained. "First, you must show kindness to someone who needs it. Second, you must be brave when facing your fears. And third, you must use your creativity to solve a puzzle that has stumped us all."

Chapter 4: Acts of Kindness

As they traveled through the ${adventureType}, ${childName} encountered a small, sad creature sitting alone by a stream. It was crying softly, and ${childName}'s heart went out to it.

"What's wrong?" ${childName} asked gently, sitting down beside the creature.

"I've lost my way home," the creature sniffled. "I've been wandering for days, and I don't know which path to take."

Without hesitation, ${childName} stood up and offered ${possessive} hand. "Don't worry, I'll help you find your way. We can look for clues together."

Chapter 5: Facing Fears

They spent the afternoon searching, and finally found the creature's home hidden behind a waterfall. The grateful creature thanked ${childName}, and suddenly, the first part of the crystal began to glow brighter.

The second task led ${childName} to a dark cave where strange sounds echoed from within. The ${companion} explained that inside was a gentle giant who had been misunderstood and feared by everyone.

${childName} felt scared, but ${pronoun} remembered that being brave doesn't mean not feeling afraid—it means doing the right thing even when you're scared.

Chapter 6: Creative Solutions

Taking a deep breath, ${childName} walked into the cave and discovered that the "scary" sounds were actually the giant crying because he was lonely.

${childName} sat with the giant and listened to his story. Soon, they became friends, and the giant's tears of sadness turned to tears of joy. The second part of the crystal glowed even brighter.

The final task was the most challenging. The group came to an ancient door covered in symbols and riddles. Many wise creatures had tried to solve it, but none had succeeded.

Chapter 7: The Reward

${childName} studied the door carefully, using ${possessive} creativity and imagination. ${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} noticed that the symbols looked like a story when arranged in a certain way.

"It's not just a puzzle—it's telling us about friendship, kindness, and courage!" ${childName} exclaimed. By arranging the symbols to tell a story about all the adventures ${pronoun} had just experienced, the door slowly opened.

Inside was the heart of the ${adventureType}—a room filled with swirling colors and beautiful music. The magic that had been fading was restored, and the entire land began to sparkle with renewed life.

Chapter 8: Coming Home

"You did it, ${childName}!" cheered the ${companion}. "Your kindness, bravery, and creativity have saved our world!"

As a reward, they gave ${childName} a special gift—a small pendant that would always remind ${possessive} that ${pronoun} had the power to make a difference in the world.

With the crystal still glowing warmly in ${possessive} hand, ${childName} found ${possessive}self back in the familiar backyard. But everything looked a little more magical now.

${childName} realized that the adventure had taught ${possessive} something important: the magic of kindness, courage, and creativity existed not just in faraway lands, but right here at home, in everyday life.`;

    const chapters = this.extractChaptersFromStory(storyText);
    
    return {
      storyText,
      chapters,
      wordCount: storyText.split(' ').length
    };
  }
}

// Export singleton instance
export const storyGeneratorService = new StoryGeneratorService();