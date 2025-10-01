import { Chapter } from './storyGenerator';

export interface ChapterElements {
  settings: string[];
  objects: string[];
  actions: string[];
  moods: string[];
  chapterText: string;
}

export interface StoryAnalysis {
  enhancedPrompt: string;
  chapterPrompts: string[];
  chapters: Chapter[];
  primaryTheme: string;
  ageCategory: string;
}

export class StoryAnalysisService {

  /**
   * Extract key story elements from a chapter for prompt enhancement
   */
  analyzeChapterElements(chapterText: string): ChapterElements {
    const chapterLower = chapterText.toLowerCase();
    
    // Define element keywords for extraction
    const settingKeywords = {
      forest: ['forest', 'woods', 'trees', 'woodland', 'grove'],
      castle: ['castle', 'palace', 'tower', 'throne', 'kingdom'],
      ocean: ['ocean', 'sea', 'beach', 'waves', 'underwater'],
      mountain: ['mountain', 'cliff', 'peak', 'valley', 'cave'],
      garden: ['garden', 'park', 'meadow', 'field', 'flowers'],
      city: ['city', 'town', 'street', 'building', 'market'],
      sky: ['sky', 'clouds', 'flying', 'air', 'wind'],
      space: ['space', 'planet', 'stars', 'galaxy', 'rocket']
    };
    
    const objectKeywords = {
      crystal: ['crystal', 'gem', 'stone', 'jewel'],
      book: ['book', 'scroll', 'map', 'letter'],
      sword: ['sword', 'shield', 'weapon', 'armor'],
      wand: ['wand', 'staff', 'magic stick', 'rod'],
      crown: ['crown', 'tiara', 'ring', 'treasure'],
      door: ['door', 'gate', 'portal', 'entrance'],
      bridge: ['bridge', 'path', 'road', 'way'],
      flower: ['flower', 'rose', 'petal', 'bloom']
    };
    
    const actionKeywords = {
      exploring: ['exploring', 'searching', 'looking', 'discovering'],
      flying: ['flying', 'soaring', 'floating', 'gliding'],
      running: ['running', 'chasing', 'racing', 'rushing'],
      climbing: ['climbing', 'ascending', 'scaling', 'rising'],
      swimming: ['swimming', 'diving', 'splashing', 'floating'],
      fighting: ['fighting', 'battling', 'defeating', 'conquering'],
      helping: ['helping', 'saving', 'rescuing', 'protecting']
    };
    
    const moodKeywords = {
      magical: ['magical', 'enchanted', 'mystical', 'glowing', 'sparkling'],
      happy: ['happy', 'joyful', 'cheerful', 'smiling', 'laughing'],
      exciting: ['exciting', 'thrilling', 'adventurous', 'amazing'],
      peaceful: ['peaceful', 'calm', 'serene', 'quiet', 'gentle'],
      brave: ['brave', 'courageous', 'bold', 'fearless', 'heroic'],
      mysterious: ['mysterious', 'secret', 'hidden', 'unknown']
    };
    
    // Extract elements
    const detectedSettings: string[] = [];
    const detectedObjects: string[] = [];
    const detectedActions: string[] = [];
    const detectedMoods: string[] = [];
    
    for (const [setting, keywords] of Object.entries(settingKeywords)) {
      if (keywords.some(keyword => chapterLower.includes(keyword))) {
        detectedSettings.push(setting);
      }
    }
    
    for (const [obj, keywords] of Object.entries(objectKeywords)) {
      if (keywords.some(keyword => chapterLower.includes(keyword))) {
        detectedObjects.push(obj);
      }
    }
    
    for (const [action, keywords] of Object.entries(actionKeywords)) {
      if (keywords.some(keyword => chapterLower.includes(keyword))) {
        detectedActions.push(action);
      }
    }
    
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => chapterLower.includes(keyword))) {
        detectedMoods.push(mood);
      }
    }
    
    return {
      settings: detectedSettings,
      objects: detectedObjects,
      actions: detectedActions,
      moods: detectedMoods,
      chapterText
    };
  }

  /**
   * Generate a character prompt for a specific chapter
   */
  generateChapterPrompt(age: number, gender: string, chapterNumber: number, chapterElements: ChapterElements): string {
    // Base character prompt
    let characterPrompt = `A ${age}-year-old ${gender} character ${chapterElements.chapterText ? 'in ' + chapterElements.chapterText.substring(0, 100) : ''}`;

    // Age-appropriate styling
    let ageStyle: string;
    if (age <= 4) {
      ageStyle = "toddler proportions with large head, chubby cheeks, innocent expression";
    } else if (age <= 7) {
      ageStyle = "young child proportions with bright curious eyes, energetic posture";
    } else if (age <= 12) {
      ageStyle = "child proportions with confident expression, adventurous spirit";
    } else {
      ageStyle = "teen proportions with mature confident expression, heroic stance";
    }

    // Chapter-specific outfit variations
    const outfits = [
      "wearing casual adventure clothes like a colorful t-shirt and shorts",
      "dressed in explorer outfit with vest and comfortable pants",
      "in magical outfit with cape and adventure gear",
      "wearing nature-themed clothes with earth tones",
      "in heroic outfit with impressive details and bright colors"
    ];
    
    const outfit = outfits[(chapterNumber - 1) % outfits.length];

    // Setting-based background
    let setting = "warm colorful background";
    if (chapterElements.settings.length > 0) {
      const primarySetting = chapterElements.settings[0];
      const settingMap: { [key: string]: string } = {
        forest: "enchanted forest background with trees and magical light",
        castle: "majestic castle background with towers and banners",
        ocean: "ocean background with waves and coral",
        mountain: "mountain landscape with peaks and valleys",
        garden: "beautiful garden with flowers and butterflies",
        city: "magical city background with towers",
        sky: "sky background with clouds and light",
        space: "cosmic space background with stars"
      };
      setting = settingMap[primarySetting] || setting;
    }

    // Objects as props
    let props = "";
    if (chapterElements.objects.length > 0) {
      const obj = chapterElements.objects[0];
      const propMap: { [key: string]: string } = {
        crystal: "holding a glowing magical crystal",
        book: "carrying an ancient book",
        sword: "wielding a heroic sword",
        wand: "holding a magical wand",
        crown: "wearing a small crown",
        flower: "holding beautiful flowers"
      };
      props = propMap[obj] || "";
    }

    // Combine elements
    return `${characterPrompt}, ${ageStyle}, ${outfit}${props ? ', ' + props : ''}, in ${setting}, digital art style, vibrant colors, friendly expression`;
  }

  /**
   * Analyze story text and build enhanced character prompt
   */
  buildChapterSpecificPrompt(
    baseAnalysis: StoryAnalysis,
    chapterElements: ChapterElements,
    childName: string,
    age: number,
    gender: string,
    chapterNumber: number
  ): string {
    // Base character template with chapter context
    const basePrompt = `Create a digital caricature of the person in the uploaded photo as ${childName} ` +
      `(${age}-year-old ${gender}). Exaggerate the head size and facial features in a humorous yet flattering style ` +
      `with bold outlines and vibrant shading, while keeping the recognizable hairstyle.`;
    
    // Age-appropriate body description with chapter variation
    let bodyDesc: string;
    let outfitOptions: string[];
    
    if (age <= 4) {
      bodyDesc = "The body should have toddler proportions — short legs, chubby cheeks, playful energy.";
      outfitOptions = [
        "wearing a colorful adventure outfit with tiny boots",
        "in a magical cape with sparkly details",
        "wearing explorer clothes with a small backpack",
        "in a superhero costume with bright colors"
      ];
    } else if (age <= 7) {
      bodyDesc = "The body should have young child proportions — longer legs, confident posture, and playful energy.";
      outfitOptions = [
        "wearing an adventurer's outfit with sturdy boots",
        "in a flowing magical cloak with mystical patterns",
        "wearing explorer gear with useful pockets",
        "in a heroic costume with a flowing cape"
      ];
    } else {
      bodyDesc = "The body should have child proportions — mature posture, confident stance, ready for adventure.";
      outfitOptions = [
        "wearing a detailed adventure outfit with professional gear",
        "in an elegant magical robe with intricate designs",
        "wearing sophisticated explorer clothing",
        "in a heroic outfit with impressive details"
      ];
    }
    
    // Select outfit based on chapter number for variety
    const outfitBase = outfitOptions[(chapterNumber - 1) % outfitOptions.length];
    
    // Chapter-specific character styling variations
    const chapterStyles: { [key: number]: string } = {
      1: "with excited, wide-open eyes and a big adventurous smile, hair slightly tousled from excitement",
      2: "with curious, bright eyes and a determined expression, hair neatly styled for the journey",
      3: "with focused, confident eyes and a brave smile, hair flowing with adventure",
      4: "with kind, gentle eyes and a warm, caring smile, hair softly framing the face",
      5: "with courageous, steady eyes and a fearless expression, hair dramatically styled",
      6: "with creative, sparkling eyes and an innovative smile, hair styled with artistic flair",
      7: "with triumphant, glowing eyes and a victorious smile, hair perfectly styled for success",
      8: "with peaceful, satisfied smile and relaxed posture, hair perfectly styled for the happy ending"
    };
    
    const characterVariation = chapterStyles[chapterNumber] || "with adventurous expression and confident smile";

    // Build setting description  
    let settingDesc: string;
    if (chapterElements.settings.length > 0) {
      const primarySetting = chapterElements.settings[0];
      const settingDescriptions: { [key: string]: string } = {
        forest: "a lush, enchanted forest with towering trees and dappled sunlight",
        castle: "a majestic castle with tall spires and flowing banners",
        ocean: "a sparkling ocean with gentle waves and coral reefs",
        mountain: "dramatic mountains with misty peaks and rocky cliffs",
        garden: "a beautiful garden filled with colorful flowers and butterflies",
        city: "a bustling magical city with towers and floating bridges",
        sky: "a vast sky filled with fluffy clouds and rainbow light",
        space: "a cosmic space setting with stars and glowing planets"
      };
      settingDesc = settingDescriptions[primarySetting] || "a magical adventure setting";
    } else {
      settingDesc = "a warm, colorful adventure setting";
    }
    
    // Add objects as props
    let propsDesc = "";
    if (chapterElements.objects.length > 0) {
      const primaryObject = chapterElements.objects[0];
      const objectDescriptions: { [key: string]: string } = {
        crystal: "holding a glowing magical crystal that sparkles with inner light",
        book: "carrying an ancient spellbook with mystical symbols",
        sword: "wielding a heroic sword that gleams in the light",
        wand: "holding a magical wand with a glowing tip",
        crown: "wearing a small crown that catches the light beautifully",
        door: "standing before an ornate magical door with intricate patterns",
        bridge: "crossing a magnificent bridge that spans the landscape",
        flower: "surrounded by magical flowers that glow softly"
      };
      propsDesc = ` ${objectDescriptions[primaryObject] || ''}`;
    }
    
    // Add action-based pose
    let poseDesc = "";
    if (chapterElements.actions.length > 0) {
      const primaryAction = chapterElements.actions[0];
      const actionDescriptions: { [key: string]: string } = {
        exploring: "in an exploring pose, looking ahead with curiosity and wonder",
        flying: "in a dynamic flying pose with arms outstretched and cape flowing",
        running: "in an action running pose with energy and determination",
        climbing: "in a climbing pose showing strength and perseverance",
        swimming: "in a graceful swimming pose with water effects around",
        fighting: "in a heroic fighting stance with confident posture",
        helping: "in a caring helping pose, reaching out with kindness"
      };
      poseDesc = ` Position ${childName} ${actionDescriptions[primaryAction] || 'in a confident, adventurous pose'}.`;
    }
    
    // Add mood-based lighting and atmosphere
    let atmosphereDesc = "";
    if (chapterElements.moods.length > 0) {
      const primaryMood = chapterElements.moods[0];
      const moodDescriptions: { [key: string]: string } = {
        magical: "Use magical lighting with sparkles and glowing effects throughout the scene.",
        happy: "Use bright, cheerful lighting with warm, golden tones.",
        exciting: "Use dynamic lighting with vibrant colors and energy effects.",
        peaceful: "Use soft, gentle lighting with calming pastel tones.",
        brave: "Use heroic lighting with strong contrasts and bold highlights.",
        mysterious: "Use mystical lighting with deep purples and ethereal glows."
      };
      atmosphereDesc = ` ${moodDescriptions[primaryMood] || ''}`;
    }
    
    // Combine all elements into chapter-specific character prompt
    const enhancedPrompt = `${basePrompt} ${bodyDesc} Show ${childName} ${characterVariation}. ` +
      `${outfitBase}${propsDesc}${poseDesc} Set this in ${settingDesc}.${atmosphereDesc} ` +
      `Use a warm, artistic background to keep focus on the character. The overall look should be colorful, ` +
      `playful, and expressive — like a professional hand-drawn caricature illustration with unique styling for this chapter.`;
    
    return enhancedPrompt;
  }

  /**
   * Analyze the generated story and build enhanced caricature prompts
   */
  analyzeStoryAndBuildPrompt(storyText: string, age: number, gender: string): StoryAnalysis {
    // Determine age category
    let ageCategory: string;
    if (age <= 4) {
      ageCategory = 'toddler';
    } else if (age <= 7) {
      ageCategory = 'young_child';
    } else if (age <= 12) {
      ageCategory = 'child';
    } else {
      ageCategory = 'teen';
    }
    
    // Analyze story themes
    const storyLower = storyText.toLowerCase();
    
    const themes = {
      magic: ['magic', 'magical', 'enchanted', 'spell', 'wizard', 'fairy'],
      adventure: ['adventure', 'journey', 'quest', 'explore', 'discover'],
      friendship: ['friend', 'friendship', 'together', 'help', 'kind'],
      nature: ['forest', 'tree', 'flower', 'animal', 'garden', 'nature'],
      ocean: ['ocean', 'sea', 'water', 'fish', 'mermaid', 'wave'],
      space: ['space', 'star', 'planet', 'rocket', 'galaxy', 'cosmic']
    };
    
    let primaryTheme = 'adventure';
    let maxCount = 0;
    
    for (const [theme, keywords] of Object.entries(themes)) {
      const count = keywords.reduce((acc, keyword) => {
        return acc + (storyLower.match(new RegExp(keyword, 'g')) || []).length;
      }, 0);
      
      if (count > maxCount) {
        maxCount = count;
        primaryTheme = theme;
      }
    }
    
    // Build base enhanced prompt
    const basePrompt = `Create a digital caricature of the person in the uploaded photo. ` +
      `Exaggerate the head size and facial features in a humorous yet flattering style, ` +
      `with bold outlines and vibrant shading. Maintain the person's recognizable hairstyle, ` +
      `clothing, and accessories.`;

    const ageTemplates: { [key: string]: string } = {
      toddler: `The character should have toddler proportions with a large head, chubby cheeks, ` +
        `short legs, and an innocent, playful expression. Show them in comfortable play clothes ` +
        `like overalls or a colorful t-shirt.`,
      young_child: `The character should have young child proportions with a slightly larger head, ` +
        `energetic posture, and bright, curious eyes. Dress them in adventure-ready clothes ` +
        `like jeans and a fun t-shirt or dress.`,
      child: `The character should have child proportions with confident posture, intelligent eyes, ` +
        `and a ready-for-anything attitude. Show them in casual but neat clothes suitable for adventures.`,
      teen: `The character should have teen proportions with a more mature stance, expressive features, ` +
        `and stylish but practical clothing that shows their personality.`
    };

    const themeTemplates: { [key: string]: string } = {
      magic: `Incorporate magical elements like sparkles, a wizard hat, or magical accessories. ` +
        `Use mystical colors like deep purples, shimmering golds, and magical blues. ` +
        `Add a subtle magical aura or glowing effects.`,
      adventure: `Show them in explorer gear like a safari hat, adventure backpack, or compass. ` +
        `Use earth tones mixed with bright accent colors. Position them in an action-ready pose ` +
        `that suggests they're ready for any adventure.`,
      friendship: `Include warm, welcoming body language and a big, genuine smile. ` +
        `Use warm colors like yellows, oranges, and soft pinks. Maybe add a friendly pet ` +
        `or companion in the background.`,
      nature: `Surround them with natural elements like flowers, leaves, or small forest creatures. ` +
        `Use natural greens, browns, and floral colors. Show them in outdoor-appropriate ` +
        `clothing with a peaceful, nature-loving expression.`,
      ocean: `Include ocean-themed elements like seashells, a sailor's hat, or ocean colors. ` +
        `Use blues, teals, and sandy colors. Maybe add some splashing water effects ` +
        `or sea creatures in the background.`,
      space: `Add cosmic elements like stars, planets, or a space helmet. Use cosmic colors ` +
        `like deep blues, purples, and silver accents. Include some twinkling star effects ` +
        `or nebula colors in the background.`
    };

    const enhancedPrompt = `${basePrompt}\n\n${ageTemplates[ageCategory]}\n\n${themeTemplates[primaryTheme]}\n\n` +
      `Use a warm, artistic background to keep focus on the character. The overall look should be colorful, ` +
      `playful, and expressive — like a professional hand-drawn caricature illustration.`;
    
    return {
      enhancedPrompt,
      chapterPrompts: [], // Will be populated when chapters are available
      chapters: [],
      primaryTheme,
      ageCategory
    };
  }
}

// Export singleton instance
export const storyAnalysisService = new StoryAnalysisService();