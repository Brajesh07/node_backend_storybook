/**
 * Scene Composition Builder for FLUX Models
 * Provides visual hierarchy and scene layout information
 * that FLUX models understand better than prose
 */

export interface SceneCompositionElements {
  characterPose: string;
  emotion: string;
  objects: string[];
  settings: string[];
  cameraAngle?: string;
  lighting?: string;
}

export interface ChapterContext {
  chapterNumber: number;
  chapterTheme: 'discovery' | 'problem-solving' | 'joyful-ending' | 'adventure' | 'conflict' | 'resolution';
}

/**
 * Build structured scene composition for FLUX model
 * Provides foreground, midground, background hierarchy
 */
export function buildSceneComposition(elements: SceneCompositionElements): string {
  const {
    characterPose,
    emotion,
    objects,
    settings,
    cameraAngle = 'front view',
    lighting = 'soft daylight'
  } = elements;

  const lines: string[] = ['Scene Composition:'];
  
  // Foreground: Character action + expression
  lines.push(`Foreground: ${characterPose}, ${emotion}.`);
  
  // Midground: Key objects (if any)
  if (objects && objects.length > 0) {
    lines.push(`Midground: ${objects.join(', ')}.`);
  }
  
  // Background: Setting + light mood
  if (settings && settings.length > 0) {
    lines.push(`Background: ${settings.join(', ')}.`);
  }
  
  // Camera angle
  lines.push(`Camera angle: ${cameraAngle}.`);
  
  // Lighting
  lines.push(`Lighting: ${lighting}.`);

  return lines.join('\n');
}

/**
 * Determine camera angle and lighting based on chapter context
 * Different story moments need different visual framing
 */
export function getCameraAndLighting(context: ChapterContext): { cameraAngle: string; lighting: string } {
  const { chapterNumber, chapterTheme } = context;

  // First chapter: Discovery or introduction
  if (chapterNumber === 1 || chapterTheme === 'discovery') {
    return {
      cameraAngle: 'front view, slightly low angle',
      lighting: 'warm sunlight with magical glows'
    };
  }

  // Problem-solving or conflict
  if (chapterTheme === 'problem-solving' || chapterTheme === 'conflict') {
    return {
      cameraAngle: 'mid-shot, eye level',
      lighting: 'diffused light with dramatic shadows'
    };
  }

  // Joyful ending or resolution
  if (chapterTheme === 'joyful-ending' || chapterTheme === 'resolution') {
    return {
      cameraAngle: 'wide shot, slightly high angle',
      lighting: 'bright light with sparkles and glow'
    };
  }

  // Adventure or action
  if (chapterTheme === 'adventure') {
    return {
      cameraAngle: 'dynamic angle, slightly tilted',
      lighting: 'vibrant light with strong highlights'
    };
  }

  // Default: neutral framing
  return {
    cameraAngle: 'front view, eye level',
    lighting: 'soft daylight'
  };
}

/**
 * Detect chapter theme from story text
 * Helps determine appropriate camera/lighting preset
 */
export function detectChapterTheme(chapterText: string, chapterNumber: number): ChapterContext['chapterTheme'] {
  const chapterLower = chapterText.toLowerCase();

  // Discovery themes
  if (chapterLower.includes('discover') || 
      chapterLower.includes('found') || 
      chapterLower.includes('glowing') ||
      chapterLower.includes('mysterious') ||
      chapterNumber === 1) {
    return 'discovery';
  }

  // Problem-solving themes
  if (chapterLower.includes('problem') || 
      chapterLower.includes('blocked') || 
      chapterLower.includes('help') ||
      chapterLower.includes('fix') ||
      chapterLower.includes('solve')) {
    return 'problem-solving';
  }

  // Joyful ending themes
  if (chapterLower.includes('bloom') || 
      chapterLower.includes('success') || 
      chapterLower.includes('celebrate') ||
      chapterLower.includes('triumph') ||
      chapterLower.includes('victory') ||
      chapterLower.includes('saved')) {
    return 'joyful-ending';
  }

  // Conflict themes
  if (chapterLower.includes('worried') || 
      chapterLower.includes('danger') || 
      chapterLower.includes('challenge') ||
      chapterLower.includes('difficult')) {
    return 'conflict';
  }

  // Resolution themes
  if (chapterLower.includes('finally') || 
      chapterLower.includes('resolved') || 
      chapterLower.includes('peaceful') ||
      chapterLower.includes('return home')) {
    return 'resolution';
  }

  // Adventure themes
  if (chapterLower.includes('journey') || 
      chapterLower.includes('explore') || 
      chapterLower.includes('adventure') ||
      chapterLower.includes('followed')) {
    return 'adventure';
  }

  return 'adventure'; // Default
}

/**
 * Extract objects for midground layer
 * Parses scene context to separate objects from environmental settings
 */
export function extractMidgroundObjects(sceneContext: string): string[] {
  if (!sceneContext || sceneContext.trim().length === 0) {
    return [];
  }

  const objects: string[] = [];
  const sceneLower = sceneContext.toLowerCase();

  // Specific magical objects
  const magicalObjects = [
    { keywords: ['pebble', 'rainbow', 'glow'], obj: 'a glowing rainbow pebble in her hands' },
    { keywords: ['giggle', 'vines'], obj: 'shimmering Giggle-Vines wiggling nearby' },
    { keywords: ['moonpetal', 'flower'], obj: 'Moonpetal Flowers blooming with silvery light' },
    { keywords: ['locket', 'heart'], obj: 'a heart-shaped locket glowing softly' },
    { keywords: ['portal', 'shimmer'], obj: 'a shimmering portal behind her' },
    { keywords: ['moss', 'sparkle'], obj: 'moss and small flowers glowing faintly' },
    { keywords: ['crystal'], obj: 'floating crystals' },
    { keywords: ['star'], obj: 'glowing stars' }
  ];

  for (const pattern of magicalObjects) {
    if (pattern.keywords.every(kw => sceneLower.includes(kw))) {
      objects.push(pattern.obj);
    }
  }

  // If no specific objects found, parse the scene context generically
  if (objects.length === 0 && sceneContext.length > 0) {
    // Extract noun phrases (simple heuristic)
    const phrases = sceneContext.split(/,|and/).map(p => p.trim()).filter(p => p.length > 0);
    objects.push(...phrases.slice(0, 2)); // Take first 2 phrases as objects
  }

  return objects;
}

/**
 * Extract settings for background layer
 * Determines environmental context from environment string
 */
export function extractBackgroundSettings(environment: string): string[] {
  if (!environment || environment.trim().length === 0) {
    return ['colorful storybook setting'];
  }

  const settings: string[] = [];
  const envLower = environment.toLowerCase();

  // Specific environment patterns
  const environmentPatterns = [
    { keywords: ['magical', 'forest'], setting: 'glowing magical forest' },
    { keywords: ['stream', 'sparkle'], setting: 'sparkling stream with soft ripples' },
    { keywords: ['garden', 'oak'], setting: 'garden with old oak tree and sunlight filtering through branches' },
    { keywords: ['garden'], setting: 'sunny garden with flowers' },
    { keywords: ['forest'], setting: 'enchanted forest with tall trees' },
    { keywords: ['ocean', 'sea'], setting: 'ocean waves and blue sky' },
    { keywords: ['meadow'], setting: 'open meadow with wildflowers' },
    { keywords: ['castle'], setting: 'castle walls and towers' },
    { keywords: ['cave'], setting: 'cave with glowing crystals' },
    { keywords: ['sky', 'cloud'], setting: 'clouds and sky' }
  ];

  for (const pattern of environmentPatterns) {
    if (pattern.keywords.every(kw => envLower.includes(kw))) {
      settings.push(pattern.setting);
      break; // Only add one primary setting
    }
  }

  // If no match, use the environment as-is
  if (settings.length === 0) {
    settings.push(environment);
  }

  // Add lighting hints from environment
  if (envLower.includes('glow') || envLower.includes('magical')) {
    settings.push('soft magical glow in the air');
  }

  return settings;
}
