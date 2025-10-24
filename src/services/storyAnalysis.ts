import { Chapter } from './storyGenerator';
import { buildStorybookPrompt, validatePromptParams } from '../utils/promptBuilder';

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
   * Generate a character prompt for a specific chapter (LEGACY/SIMPLIFIED VERSION)
   * NOTE: For production use, prefer buildChapterSpecificPrompt() which generates
   * more detailed prompts with full 2D flat style specifications.
   * This method is kept for backwards compatibility and quick testing.
   */
  generateChapterPrompt(age: number, gender: string, chapterNumber: number, chapterElements: ChapterElements): string {
    // Base character prompt with 2D flat style emphasis
    let characterPrompt = `A ${age}-year-old ${gender} character in flat 2D illustration style ${chapterElements.chapterText ? 'in ' + chapterElements.chapterText.substring(0, 100) : ''}`;

    // Age-appropriate styling
    let ageStyle: string;
    if (age <= 4) {
      ageStyle = "toddler proportions with large head, chubby cheeks, innocent expression, rendered with bold outlines and flat colors";
    } else if (age <= 7) {
      ageStyle = "young child proportions with bright curious eyes, energetic posture, illustrated in graphic novel style";
    } else if (age <= 12) {
      ageStyle = "child proportions with confident expression, adventurous spirit, shown in bold 2D cartoon style";
    } else {
      ageStyle = "teen proportions with mature confident expression, heroic stance, rendered in flat digital art";
    }

    // Chapter-specific outfit variations with 2D emphasis
    const outfits = [
      "wearing casual adventure clothes like a colorful t-shirt and shorts, rendered with thick outlines and flat cel-shading",
      "dressed in explorer outfit with vest and comfortable pants, illustrated in bold graphic style",
      "in magical outfit with cape and adventure gear, shown with vibrant flat colors and clean edges",
      "wearing nature-themed clothes with earth tones, rendered in simplified 2D shapes",
      "in heroic outfit with impressive details and bright colors, illustrated with bold black outlines"
    ];
    
    const outfit = outfits[(chapterNumber - 1) % outfits.length];

    // Setting-based background with flat 2D styling
    let setting = "warm colorful background with flat graphic elements";
    if (chapterElements.settings.length > 0) {
      const primarySetting = chapterElements.settings[0];
      const settingMap: { [key: string]: string } = {
        forest: "flat 2D enchanted forest background with simplified trees and bold shapes",
        castle: "graphic 2D castle background with geometric towers rendered in flat perspective",
        ocean: "flat 2D ocean background with simplified waves and bold coral shapes",
        mountain: "2D mountain landscape with clean geometric peaks and flat color blocks",
        garden: "flat 2D garden with graphic flower shapes and bold simplified butterflies",
        city: "graphic 2D magical city background with geometric towers and clean lines",
        sky: "flat 2D sky background with simplified clouds and bold graphic elements",
        space: "2D cosmic space background with geometric stars and flat planet shapes"
      };
      setting = settingMap[primarySetting] || setting;
    }

    // Objects as props with flat 2D style
    let props = "";
    if (chapterElements.objects.length > 0) {
      const obj = chapterElements.objects[0];
      const propMap: { [key: string]: string } = {
        crystal: "holding a glowing crystal rendered with flat geometric facets",
        book: "carrying a book shown with simple flat pages and bold outlines",
        sword: "wielding a sword illustrated with clean lines and flat metallic colors",
        wand: "holding a wand with a simple glowing tip shown as flat shapes",
        crown: "wearing a crown rendered with geometric shapes and flat gold",
        flower: "holding flowers shown as bold graphic shapes with flat colors"
      };
      props = propMap[obj] || "";
    }

    // Combine elements with strong 2D flat style emphasis
    return `${characterPrompt}, ${ageStyle}, ${outfit}${props ? ', ' + props : ''}, in ${setting}, ` +
      `FLAT 2D digital art style with THICK BLACK OUTLINES, cel-shaded flat colors, vibrant saturated hues, ` +
      `friendly expression, NO 3D effects, NO realistic shading, graphic novel aesthetic`;
  }

  /**
   * Extract visual pose and action from story text
   * IMPROVED: Returns visually-interpretable descriptions, not narrative text
   * Avoids narrative verbs (promised, would find) in favor of visual verbs (standing, holding)
   */
  private extractVisualPose(chapterText: string): string {
    const chapterLower = chapterText.toLowerCase();
    
    // Visual pose patterns with priority (most specific first)
    const posePatterns = [
      // ANYA STORY SPECIFIC - Most detailed (4+ keywords)
      { keywords: ['kneeling', 'holding', 'pebble', 'glowing'], pose: 'kneeling near an old oak tree, gently holding a glowing, rainbow-colored pebble with awe' },
      { keywords: ['sitting', 'humming', 'weaving', 'vines'], pose: 'sitting beside a sparkling stream, smiling with joy as she hums and gently weaves apart glowing Giggle-Vines' },
      { keywords: ['sitting', 'stream', 'weaving', 'vines'], pose: 'sitting beside the stream, gently weaving apart the shimmering Giggle-Vines with care' },
      
      // Specific three-action combinations (most detailed)
      { keywords: ['kneeling', 'holding', 'locket', 'heart'], pose: 'kneeling under an old oak tree, gently holding a glowing heart-shaped locket' },
      { keywords: ['standing', 'beside', 'star', 'laughing'], pose: 'standing beside the glowing Wishing Star, laughing joyfully' },
      { keywords: ['kneeling', 'digging', 'pebble'], pose: 'kneeling in the garden, digging near the old oak tree with excitement' },
      { keywords: ['holding', 'pebble', 'rainbow'], pose: 'holding a smooth, rainbow-colored pebble that glows softly' },
      
      // Specific two-action combinations
      { keywords: ['standing', 'holding', 'locket', 'glowing'], pose: 'standing confidently, holding an open glowing locket' },
      { keywords: ['kneeling', 'holding', 'locket'], pose: 'kneeling down, holding a glowing locket in both hands' },
      { keywords: ['kneeling', 'digging', 'shovel'], pose: 'kneeling in the soil, digging with a small shovel' },
      { keywords: ['holding', 'pebble', 'glowing'], pose: 'holding a glowing pebble close, with wide eyes full of wonder' },
      { keywords: ['sitting', 'humming', 'stream'], pose: 'sitting beside the stream, humming a gentle melody' },
      { keywords: ['carrying', 'cupped hands'], pose: 'walking carefully with cupped hands carrying something small' },
      { keywords: ['reaching', 'offering', 'leaf'], pose: 'reaching forward, offering a leaf with both hands' },
      { keywords: ['sitting', 'reading', 'book'], pose: 'sitting cross-legged, reading an open book' },
      { keywords: ['standing', 'pointing'], pose: 'standing upright, pointing ahead excitedly' },
      { keywords: ['standing', 'laughing'], pose: 'standing joyfully, laughing with arms slightly raised' },
      { keywords: ['climbing', 'tree'], pose: 'climbing up carefully' },
      { keywords: ['painting', 'drawing'], pose: 'painting or drawing with creative focus' },
      
      // Single clear poses
      { keywords: ['kneeling down', 'kneel'], pose: 'kneeling down on one knee' },
      { keywords: ['holding', 'locket'], pose: 'holding a glowing locket gently in both hands' },
      { keywords: ['holding', 'crystal', 'gem', 'stone'], pose: 'holding a glowing object in both hands' },
      { keywords: ['holding', 'flower', 'leaf'], pose: 'holding a flower/leaf gently in cupped hands' },
      { keywords: ['reaching out', 'reaching'], pose: 'reaching out with one hand extended' },
      { keywords: ['waving'], pose: 'waving cheerfully with one hand raised' },
      { keywords: ['laughing', 'giggling'], pose: 'laughing joyfully with a bright smile' },
      { keywords: ['pointing'], pose: 'pointing forward with determination' },
      { keywords: ['dancing', 'twirling'], pose: 'dancing joyfully with arms out' },
      { keywords: ['running'], pose: 'running forward with determination' },
      { keywords: ['walking forward', 'walking'], pose: 'walking forward confidently' },
      { keywords: ['sitting'], pose: 'sitting comfortably' },
      { keywords: ['standing tall', 'standing'], pose: 'standing upright' },
      { keywords: ['looking up', 'gazing'], pose: 'looking up with wonder' },
      { keywords: ['hugging'], pose: 'hugging warmly' },
      { keywords: ['offering', 'giving'], pose: 'offering something with outstretched hands' }
    ];
    
    // Find the most specific matching pose
    for (const pattern of posePatterns) {
      const matchCount = pattern.keywords.filter(kw => chapterLower.includes(kw)).length;
      if (matchCount === pattern.keywords.length) {
        return pattern.pose;
      }
    }
    
    // Default friendly pose
    return 'standing with a warm, friendly expression';
  }

  /**
   * Extract scene context with other characters/objects mentioned in the story
   * This adds depth to the scene (e.g., "tiny Glimmerwings flutter nearby")
   */
  private extractSceneContext(chapterText: string): string {
    const chapterLower = chapterText.toLowerCase();
    const contexts: string[] = [];
    
    // Character/creature presence patterns (expanded for Anya's story)
    const characterPatterns = [
      // Specific Anya story characters (most detailed first)
      { keywords: ['pip', 'pixie', 'sprite'], context: 'Pip the Pixie-sprite floats near her shoulder, laughing along' },
      { keywords: ['pip', 'shoulder'], context: 'Pip the Pixie-sprite hovers near her shoulder with joy' },
      { keywords: ['pip', 'flittering'], context: 'Pip the Pixie-sprite flits nearby with butterfly wings' },
      { keywords: ['pip', 'glimmerwing'], context: 'Pip the Glimmerwing hovers nearby, beaming proudly' },
      { keywords: ['pip'], context: 'Pip, a tiny creature with emerald skin, sparkles nearby' },
      { keywords: ['dewdrop', 'sprite'], context: 'colorful Dewdrop Sprites dance around with sparkles' },
      { keywords: ['leaf', 'elf', 'elves'], context: 'giggling Leaf-Elves cheer with joy' },
      { keywords: ['sprites', 'elves', 'creatures'], context: 'magical creatures celebrate together' },
      { keywords: ['fireflies', 'forest'], context: 'little fireflies and gentle forest sprites twinkle around' },
      
      // General patterns
      { keywords: ['glimmerwings', 'flutter', 'worried'], context: 'tiny Glimmerwings flutter nearby with worried expressions' },
      { keywords: ['glimmerwings', 'flutter'], context: 'tiny Glimmerwings flutter around with sparkly wings' },
      { keywords: ['glimmerwing', 'sparkle'], context: 'a tiny Glimmerwing named Pip sparkles in the warm light' },
      { keywords: ['caterpillar', 'pip'], context: 'a small caterpillar rests nearby' },
      { keywords: ['fairy', 'fairies'], context: 'small fairies hover around' },
      { keywords: ['dragon', 'friendly'], context: 'a friendly dragon stands nearby' },
      { keywords: ['butterfly', 'butterflies', 'glow'], context: 'glowing butterflies flutter in the warm light' },
      { keywords: ['butterfly', 'butterflies'], context: 'colorful butterflies flutter around' },
      { keywords: ['bird', 'birds'], context: 'cheerful birds perch nearby' },
      { keywords: ['rabbit', 'bunny'], context: 'a small rabbit watches curiously' },
      { keywords: ['moss', 'soft'], context: 'soft moss and glowing elements surround the scene' }
    ];
    
    // Object/portal patterns (expanded for Anya's story)
    const objectPatterns = [
      // Specific Anya story objects (most detailed first)
      { keywords: ['moonpetal', 'flowers', 'bloom'], context: 'the Moonpetal Flowers bloom beautifully, bathing the scene in warm silvery light' },
      { keywords: ['giggle', 'vines', 'shimmer'], context: 'sparkling Giggle-Vines wiggle playfully nearby' },
      { keywords: ['starlight', 'stream', 'flow'], context: 'the Starlight Stream flows and sparkles beside her' },
      { keywords: ['wishing', 'star', 'glow'], context: 'the brilliant Wishing Star shines overhead' },
      { keywords: ['portal', 'shimmer', 'colors'], context: 'a shimmering portal of colors glows in the background' },
      { keywords: ['oak', 'tree', 'old'], context: 'an old oak tree stands majestically behind' },
      { keywords: ['pebble', 'rainbow', 'glow'], context: 'sunlight filters through the branches, making scattered pebbles and moss sparkle' },
      { keywords: ['petals', 'glow'], context: 'glowing petals and soft light fill the air' },
      { keywords: ['archway', 'hidden'], context: 'hints of a hidden archway glow softly in the distance' },
      
      // General patterns
      { keywords: ['portal', 'glowing', 'shimmering'], context: 'a shimmering portal glows faintly in the background' },
      { keywords: ['door', 'magical', 'glowing'], context: 'a magical glowing door stands behind' },
      { keywords: ['tree', 'ancient', 'glowing'], context: 'an ancient glowing tree towers in the background' },
      { keywords: ['crystal', 'floating'], context: 'floating crystals shimmer around' },
      { keywords: ['rainbow', 'light'], context: 'rainbow light illuminates the scene' },
      { keywords: ['rainbow'], context: 'a soft rainbow arcs in the background' },
      { keywords: ['stars', 'glowing'], context: 'glowing stars twinkle around' },
      { keywords: ['sparkles', 'laughter'], context: 'bright sparkles fill the air' }
    ];
    
    // Check for character presence (can add multiple)
    let characterCount = 0;
    for (const pattern of characterPatterns) {
      if (pattern.keywords.every(kw => chapterLower.includes(kw))) {
        contexts.push(pattern.context);
        characterCount++;
        if (characterCount >= 2) break; // Limit to 2 character contexts
      }
    }
    
    // Check for object/portal presence
    for (const pattern of objectPatterns) {
      if (pattern.keywords.every(kw => chapterLower.includes(kw))) {
        contexts.push(pattern.context);
        break; // Only add one object context
      }
    }
    
    return contexts.join(', and ');
  }

  /**
   * Extract emotional transition from story text
   * Looks for emotional changes (excitement → surprise, happy → worried, etc.)
   */
  private extractEmotionalTransition(chapterText: string): string {
    const chapterLower = chapterText.toLowerCase();
    
    // Pattern: "from X to Y" emotions
    const transitionPatterns = [
      { pattern: /excit.*?to.*?(surprise|worry|amaze|shock)/i, result: 'excitement to surprised worry' },
      { pattern: /happy.*?to.*?(sad|worry|fear)/i, result: 'happiness to concern' },
      { pattern: /curious.*?to.*?(excit|amaze|delight)/i, result: 'curiosity to amazement' },
      { pattern: /calm.*?to.*?(excit|worry|alert)/i, result: 'calm to alert excitement' },
      { pattern: /brave.*?to.*?(triumph|proud|happy)/i, result: 'bravery to triumph' }
    ];
    
    for (const { pattern, result } of transitionPatterns) {
      if (pattern.test(chapterLower)) {
        return result;
      }
    }
    
    // Check for "suddenly" or "just" indicating a moment of change
    if (chapterLower.includes('suddenly') || chapterLower.includes('just then')) {
      // Look for emotion words after "suddenly"
      const emotions = ['surprised', 'amazed', 'worried', 'excited', 'shocked', 'delighted', 'gasped'];
      for (const emotion of emotions) {
        if (chapterLower.includes(emotion)) {
          return `surprise and ${emotion}`;
        }
      }
      return 'surprise and wonder';
    }
    
    // Single emotion states (expanded for better detection)
    const singleEmotions = [
      // Specific compound emotions (check first)
      { keywords: ['awe', 'excitement'], expression: 'awe and excitement' },
      { keywords: ['joy', 'laughter'], expression: 'joy and laughter' },
      { keywords: ['wonder', 'curiosity'], expression: 'wonder and curiosity' },
      
      // Primary emotions
      { keywords: ['gentle', 'gently', 'kindly', 'softly'], expression: 'gentle kindness' },
      { keywords: ['laughing', 'laughter', 'giggling'], expression: 'joyful laughter' },
      { keywords: ['excited', 'thrilled'], expression: 'excitement' },
      { keywords: ['amazed', 'astonished'], expression: 'amazement' },
      { keywords: ['awe', 'wonder'], expression: 'awe and wonder' },
      { keywords: ['happy', 'joyful', 'cheerful'], expression: 'joy and happiness' },
      { keywords: ['brave', 'courageous'], expression: 'bravery' },
      { keywords: ['worried', 'concerned'], expression: 'worry' },
      { keywords: ['curious'], expression: 'curiosity' },
      { keywords: ['proud'], expression: 'pride' },
      { keywords: ['triumph', 'victorious'], expression: 'triumph' },
      { keywords: ['peaceful', 'calm'], expression: 'peaceful calm' }
    ];
    
    for (const { keywords, expression } of singleEmotions) {
      if (keywords.some(kw => chapterLower.includes(kw))) {
        return expression;
      }
    }
    
    return 'wonder and excitement';
  }

  /**
   * Extract specific nouns (scene elements) directly from chapter text
   * This ensures scene description matches the actual story content
   */
  private extractSceneNouns(chapterText: string): string[] {
    const chapterLower = chapterText.toLowerCase();
    const sceneNouns: string[] = [];
    
    // Environment/Location nouns (Anya story enhanced)
    const environments = ['garden', 'forest', 'meadow', 'field', 'castle', 'palace', 'ocean', 'sea', 'beach', 
                         'mountain', 'cave', 'river', 'lake', 'stream', 'village', 'town', 'city', 'sky', 'clouds', 
                         'space', 'room', 'house', 'door', 'gate', 'path', 'road', 'bridge', 'archway', 'portal'];
    
    // Nature elements (Anya story enhanced)
    const nature = ['tree', 'oak tree', 'flower', 'moonpetal', 'blossom', 'sunflower', 'rose', 'grass', 'leaf', 'branch', 
                   'mushroom', 'stone', 'pebble', 'rock', 'water', 'sun', 'moon', 'star', 'rainbow', 'moss', 'petals'];
    
    // Creatures (Anya story enhanced)
    const creatures = ['bird', 'butterfly', 'bee', 'caterpillar', 'rabbit', 'squirrel', 'owl', 
                      'dragon', 'unicorn', 'fairy', 'pixie', 'sprite', 'glimmerwing', 'pip', 
                      'fish', 'whale', 'dolphin', 'firefly'];
    
    // Objects (Anya story enhanced)
    const objects = ['crown', 'wand', 'sword', 'book', 'crystal', 'gem', 'treasure', 'door', 
                    'window', 'lantern', 'candle', 'basket', 'cup', 'pebble', 'locket', 
                    'vines', 'giggle-vines', 'shovel'];
    
    const allNouns = [...environments, ...nature, ...creatures, ...objects];
    
    for (const noun of allNouns) {
      if (chapterLower.includes(noun)) {
        sceneNouns.push(noun);
      }
    }
    
    return sceneNouns;
  }

  /**
   * Extract specific physical actions from chapter text
   * Returns detailed action descriptions for accurate pose generation
   */
  private extractPhysicalActions(chapterText: string): string {
    const chapterLower = chapterText.toLowerCase();
    
    // Specific physical actions with their descriptions (Anya story enhanced)
    const actionPatterns = [
      { keywords: ['digging', 'shovel'], description: 'digging with a small shovel' },
      { keywords: ['holding', 'pebble'], description: 'holding a glowing pebble close' },
      { keywords: ['humming', 'singing'], description: 'humming a gentle melody' },
      { keywords: ['weaving', 'vines'], description: 'gently weaving apart vines' },
      { keywords: ['carrying', 'carried', 'holding', 'held', 'cupped hands'], description: 'gently holding something in cupped hands' },
      { keywords: ['kneeling', 'kneel', 'crouching'], description: 'kneeling down' },
      { keywords: ['reaching', 'reaching out', 'extending'], description: 'reaching out with one hand' },
      { keywords: ['pointing', 'pointed'], description: 'pointing excitedly' },
      { keywords: ['hugging', 'embracing'], description: 'hugging warmly' },
      { keywords: ['offering', 'offered', 'giving', 'gave'], description: 'offering something with both hands' },
      { keywords: ['climbing', 'climbed'], description: 'climbing carefully' },
      { keywords: ['jumping', 'jumped', 'leaping'], description: 'jumping with joy' },
      { keywords: ['running', 'ran'], description: 'running energetically' },
      { keywords: ['walking', 'walked'], description: 'walking forward confidently' },
      { keywords: ['sitting', 'sat'], description: 'sitting comfortably' },
      { keywords: ['standing', 'stood'], description: 'standing upright' },
      { keywords: ['looking', 'searching', 'watching'], description: 'looking ahead curiously' },
      { keywords: ['waving', 'waved'], description: 'waving cheerfully' },
      { keywords: ['dancing', 'danced'], description: 'dancing happily' }
    ];
    
    // Find the most specific action mentioned in the text
    for (const pattern of actionPatterns) {
      for (const keyword of pattern.keywords) {
        if (chapterLower.includes(keyword)) {
          return pattern.description;
        }
      }
    }
    
    // Default action
    return 'standing with a friendly pose';
  }

  /**
   * Extract emotion/expression from chapter text
   * Returns specific emotional state for facial expression
   */
  private extractEmotion(chapterText: string): string {
    const chapterLower = chapterText.toLowerCase();
    
    const emotionPatterns = [
      { keywords: ['excited', 'excitement', 'thrilled'], expression: 'beaming with excitement' },
      { keywords: ['amazed', 'astonished', 'surprised'], expression: 'looking amazed and wide-eyed' },
      { keywords: ['happy', 'joyful', 'delighted'], expression: 'smiling joyfully' },
      { keywords: ['gentle', 'gently', 'softly', 'carefully'], expression: 'smiling gently and kindly' },
      { keywords: ['brave', 'courageous', 'determined'], expression: 'showing brave determination' },
      { keywords: ['curious', 'wondering', 'puzzled'], expression: 'looking curious and thoughtful' },
      { keywords: ['proud'], expression: 'smiling proudly' },
      { keywords: ['grateful', 'thankful'], expression: 'smiling warmly with gratitude' },
      { keywords: ['worried', 'concerned'], expression: 'looking concerned but hopeful' },
      { keywords: ['peaceful', 'calm', 'relaxed'], expression: 'smiling peacefully' }
    ];
    
    for (const pattern of emotionPatterns) {
      for (const keyword of pattern.keywords) {
        if (chapterLower.includes(keyword)) {
          return pattern.expression;
        }
      }
    }
    
    return 'smiling warmly';
  }

  /**
   * Build scene description directly from story nouns
   * Ensures background matches actual story content
   */
  private buildSceneDescription(sceneNouns: string[]): string {
    if (sceneNouns.length === 0) {
      return 'a colorful magical storybook setting';
    }
    
    // Group nouns by category for natural description (Anya story enhanced)
    const hasGarden = sceneNouns.some(n => ['garden', 'flower', 'sunflower', 'blossom', 'backyard'].includes(n));
    const hasForest = sceneNouns.some(n => ['forest', 'tree', 'woods', 'oak tree'].includes(n));
    const hasMagicalForest = sceneNouns.some(n => ['glowing', 'moonpetal', 'starlight', 'portal', 'archway'].includes(n));
    const hasStream = sceneNouns.some(n => ['stream', 'starlight stream'].includes(n));
    const hasWater = sceneNouns.some(n => ['ocean', 'sea', 'river', 'lake', 'water'].includes(n));
    const hasCreatures = sceneNouns.some(n => ['butterfly', 'caterpillar', 'bird', 'pixie', 'fairy', 'sprite', 'glimmerwing'].includes(n));
    
    let scene = '';
    
    if (hasMagicalForest) {
      scene = 'glowing magical forest with';
      const magicalElements = sceneNouns.filter(n => 
        ['moonpetal', 'starlight', 'portal', 'archway', 'sprite', 'glimmerwing', 'petals'].includes(n)
      );
      if (magicalElements.length > 0) {
        scene += ' ' + magicalElements.slice(0, 3).join(', ');
      } else {
        scene += ' sparkling trees and enchanted flowers';
      }
    } else if (hasStream) {
      scene = 'sparkling stream scene with';
      const streamElements = sceneNouns.filter(n => 
        ['vines', 'giggle-vines', 'moonpetal', 'flowers', 'forest'].includes(n)
      );
      if (streamElements.length > 0) {
        scene += ' ' + streamElements.slice(0, 3).join(', ');
      } else {
        scene += ' flowing water and magical plants';
      }
    } else if (hasGarden) {
      scene = 'sunny garden with';
      const gardenElements = sceneNouns.filter(n => 
        ['sunflower', 'flower', 'blossom', 'grass', 'rainbow', 'butterfly', 'caterpillar', 'oak tree', 'pebble', 'moss'].includes(n)
      );
      if (gardenElements.length > 0) {
        scene += ' ' + gardenElements.slice(0, 3).join(', ');
      } else {
        scene += ' colorful flowers and green grass';
      }
    } else if (hasForest) {
      scene = 'enchanted forest with';
      const forestElements = sceneNouns.filter(n => 
        ['tree', 'oak tree', 'mushroom', 'leaf', 'owl', 'squirrel', 'moss', 'petals'].includes(n)
      );
      if (forestElements.length > 0) {
        scene += ' ' + forestElements.slice(0, 3).join(', ');
      } else {
        scene += ' tall trees and magical plants';
      }
    } else if (hasWater) {
      scene = 'water scene with';
      const waterElements = sceneNouns.filter(n => 
        ['fish', 'coral', 'wave', 'dolphin', 'whale'].includes(n)
      );
      if (waterElements.length > 0) {
        scene += ' ' + waterElements.slice(0, 3).join(', ');
      } else {
        scene += ' sparkling water and aquatic life';
      }
    } else {
      // Use first 3 nouns found
      scene = sceneNouns.slice(0, 3).join(', ');
    }
    
    if (hasCreatures && !scene.includes('butterfly') && !scene.includes('caterpillar')) {
      const creatures = sceneNouns.filter(n => 
        ['butterfly', 'caterpillar', 'bird', 'pixie', 'fairy', 'bee'].includes(n)
      );
      if (creatures.length > 0) {
        scene += ' and ' + creatures[0];
      }
    }
    
    return scene;
  }

  /**
   * Analyze story text and build enhanced caricature prompt
   * IMPROVEMENT v4: Uses storybook-prompt template for consistency
   * Following storybook_prompt_tasks.md specification
   */
  buildChapterSpecificPrompt(
    baseAnalysis: StoryAnalysis,
    chapterElements: ChapterElements,
    childName: string,
    age: number,
    gender: string,
    chapterNumber: number
  ): string {
    // Extract story elements using existing methods
    const visualPose = this.extractVisualPose(chapterElements.chapterText);
    const emotion = this.extractEmotionalTransition(chapterElements.chapterText);
    const sceneContext = this.extractSceneContext(chapterElements.chapterText);
    
    // Build environment description from settings
    let environment = 'simple colorful storybook setting';
    if (chapterElements.settings && chapterElements.settings.length > 0) {
      environment = chapterElements.settings.join(', ');
    }
    
    // Prepare prompt parameters with scene composition enabled
    const promptParams = {
      childName,
      age,
      gender: gender as 'boy' | 'girl',
      visualPose,
      emotion,
      sceneContext,
      environment,
      chapterNumber,
      chapterText: chapterElements.chapterText,
      useSceneComposition: true, // Enable scene composition mode
    };
    
    // Validate parameters (optional but recommended)
    const validationErrors = validatePromptParams(promptParams);
    if (validationErrors.length > 0) {
      console.warn(`⚠️ Prompt validation warnings for chapter ${chapterNumber}:`, validationErrors);
    }
    
    // Build prompt using storybook template with scene composition
    const finalPrompt = buildStorybookPrompt(promptParams);
    
    // Debug logging
    console.log(`\n🎨 CHAPTER ${chapterNumber} PROMPT (scene composition mode):`);
    console.log(`📖 Story excerpt: "${chapterElements.chapterText.substring(0, 150)}..."`);
    console.log(`🎭 Visual pose: ${visualPose}`);
    console.log(`😊 Emotion: ${emotion}`);
    console.log(`🌟 Scene context: ${sceneContext || 'none'}`);
    console.log(`🏞️ Environment: ${environment}`);
    console.log(`\n📝 FINAL PROMPT (with scene composition):\n${finalPrompt}\n`);
    
    return finalPrompt;
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
    
    // Build base enhanced prompt in concise format
    const basePrompt = [
      `Create a 2D flat digital caricature illustration of the person in the uploaded photo.`,
      `Style: bold cartoon illustration with flat colors, clean outlines (3-5px), and simple geometric shapes.`,
      `Keep their facial likeness, hair shape, and smile recognizable.`,
      `No 3D, no gradients, no realistic shading.`,
      `Add a soft, bright fantasy background.`,
      `Keywords: flat-vector, children's storybook art, vibrant palette, clean outlines.`
    ].join('\n');
    
    return {
      enhancedPrompt: basePrompt,
      chapterPrompts: [], // Will be populated when chapters are available
      chapters: [],
      primaryTheme,
      ageCategory
    };
  }
}

// Export singleton instance
export const storyAnalysisService = new StoryAnalysisService();