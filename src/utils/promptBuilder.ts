/**
 * Storybook Prompt Template Builder
 * Creates structured prompts for character image generation
 * Following the storybook-prompt template specification
 * Enhanced with Scene Composition for NanoBanana model
 */

import {
  buildSceneComposition,
  extractMidgroundObjects,
  extractBackgroundSettings,
  getCameraAndLighting,
  detectChapterTheme,
  type ChapterContext
} from './sceneCompositionBuilder';

export interface StorybookPromptParams {
  childName: string;
  age: number;
  gender: 'boy' | 'girl';
  visualPose: string;
  emotion: string;
  sceneContext: string;
  environment: string;
  chapterNumber?: number;
  chapterText?: string;
  useSceneComposition?: boolean; // NEW: Enable scene composition mode for NanoBanana
}

/**
 * Build a storybook-style prompt for character image generation
 * Uses consistent template structure for all chapters
 * Enhanced with scene composition mode for better NanoBanana model understanding
 */
export function buildStorybookPrompt({
  childName,
  age,
  gender,
  visualPose,
  emotion,
  sceneContext,
  environment,
  chapterNumber = 1,
  chapterText = '',
  useSceneComposition = true, // Default: USE scene composition
}: StorybookPromptParams): string {
  const pronoun = gender === 'boy' ? 'He' : 'She';
  const possessive = gender === 'boy' ? 'his' : 'her';
  const objectPronoun = gender === 'boy' ? 'him' : 'her';

  const promptLines: string[] = [];

  // SCENE COMPOSITION MODE (RECOMMENDED for NanoBanana)
  if (useSceneComposition) {
    // 1. Character Introduction with scene narrative
    promptLines.push(
      `Create a 3D plus digital sketch illustration type of character named ${childName}, a ${age}-year-old ${gender === 'boy' ? 'boy' : 'girl'} in a magical forest.`
    );

    // 2. Scene Description (Narrative style for NanoBanana)
    const chapterTheme = detectChapterTheme(chapterText, chapterNumber);
    const { cameraAngle, lighting } = getCameraAndLighting({ chapterNumber, chapterTheme });
    
    // Build narrative scene description
    let sceneDescription = `Scene: ${childName} ${visualPose}`;
    
    // Add scene context if available
    if (sceneContext && sceneContext.trim().length > 0) {
      sceneDescription += `, ${sceneContext}`;
    }
    
    // Add environment details
    if (environment && environment.trim().length > 0) {
      sceneDescription += `. ${environment}`;
    }
    
    // Add camera and lighting details
    sceneDescription += `. ${cameraAngle}, ${lighting}.`;
    
    promptLines.push(sceneDescription);

    // 3. Style Specifications
    promptLines.push(
      'Style: bold outlines (3–5 px), solid colors, clean shapes.'
    );

    // 4. Likeness Preservation
    promptLines.push(
      'Preserve facial likeness, hairstyle, proportions, and clothing.'
    );

    // 5. Keywords for guidance
    promptLines.push(
      `Keywords: storybook illustration, vibrant colors, expressive, magical forest, ${emotion}.`
    );

  } else {
    // LEGACY MODE (Original template - also updated for NanoBanana)
    promptLines.push(
      `Create a 3D plus digital sketch illustration type of character named ${childName}, a ${age}-year-old ${gender === 'boy' ? 'boy' : 'girl'} in a magical forest.`
    );
    
    promptLines.push(`Scene: ${childName} is ${visualPose}, ${possessive} face showing ${emotion}.`);

    if (sceneContext && sceneContext.trim().length > 0) {
      promptLines.push(`${sceneContext}.`);
    }

    if (environment && environment.trim().length > 0) {
      promptLines.push(`${environment}.`);
    } else {
      promptLines.push(`A bright forest clearing glows with warm sunlight.`);
    }

    promptLines.push(
      'Style: bold outlines (3–5 px), solid colors, clean shapes.'
    );

    promptLines.push(
      'Preserve facial likeness, hairstyle, proportions, and clothing.'
    );

    promptLines.push(
      `Keywords: storybook illustration, vibrant colors, expressive, magical forest, ${emotion}.`
    );
  }

  return promptLines.join('\n');
}

/**
 * Validate prompt parameters before building
 * Returns validation errors if any
 */
export function validatePromptParams(params: StorybookPromptParams): string[] {
  const errors: string[] = [];

  if (!params.childName || params.childName.trim().length === 0) {
    errors.push('childName is required');
  }

  if (!params.age || params.age < 2 || params.age > 12) {
    errors.push('age must be between 2 and 12');
  }

  if (!params.gender || !['boy', 'girl'].includes(params.gender)) {
    errors.push('gender must be "boy" or "girl"');
  }

  if (!params.visualPose || params.visualPose.trim().length === 0) {
    errors.push('visualPose is required');
  }

  if (!params.emotion || params.emotion.trim().length === 0) {
    errors.push('emotion is required');
  }

  return errors;
}
