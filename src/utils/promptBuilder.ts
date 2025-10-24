/**
 * Storybook Prompt Template Builder
 * Creates structured prompts for character image generation
 * Following the storybook-prompt template specification
 * Enhanced with Scene Composition for FLUX models
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
  useSceneComposition?: boolean; // NEW: Enable scene composition mode
}

/**
 * Build a storybook-style prompt for character image generation
 * Uses consistent template structure for all chapters
 * Enhanced with scene composition mode for better FLUX model understanding
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

  // SCENE COMPOSITION MODE (RECOMMENDED for FLUX)
  if (useSceneComposition) {
    // 1. Character Introduction
    promptLines.push(
      `Create a 2D flat digital caricature illustration of the person in the uploaded photo as ${childName}, a ${age}-year-old ${gender === 'boy' ? 'boy' : 'girl'}.`
    );

    // 2. Scene Composition (Visual Hierarchy)
    const chapterTheme = detectChapterTheme(chapterText, chapterNumber);
    const { cameraAngle, lighting } = getCameraAndLighting({ chapterNumber, chapterTheme });
    
    const objects = extractMidgroundObjects(sceneContext);
    const settings = extractBackgroundSettings(environment);

    const sceneComposition = buildSceneComposition({
      characterPose: visualPose,
      emotion,
      objects,
      settings,
      cameraAngle,
      lighting
    });

    promptLines.push(sceneComposition);

    // 3. Style Specifications
    promptLines.push(
      'Style: flat 2D vector, bold outlines (3–5 px), solid colors, no gradients, no 3D, clean shapes.'
    );

    // 4. Likeness Preservation
    promptLines.push(
      'Preserve facial likeness, hairstyle, and proportions from uploaded photo.'
    );

    // 5. Keywords for guidance
    promptLines.push(
      'Keywords: storybook illustration, vibrant colors, expressive pose, flat 2D cartoon, bold outlines.'
    );

  } else {
    // LEGACY MODE (Original template)
    promptLines.push(
      `Create a 2D flat digital caricature illustration of the person in the uploaded photo as ${childName}, a ${age}-year-old ${gender === 'boy' ? 'boy' : 'girl'}.`
    );
    
    promptLines.push(`${pronoun} is ${visualPose}, ${possessive} face showing ${emotion}.`);

    if (sceneContext && sceneContext.trim().length > 0) {
      promptLines.push(`Around ${objectPronoun}, ${sceneContext}.`);
    }

    if (environment && environment.trim().length > 0) {
      promptLines.push(`Background: ${environment}.`);
    } else {
      promptLines.push(`Background: simple colorful storybook setting.`);
    }

    promptLines.push(
      'Style: flat-vector children\'s storybook art, bold black outlines (3–5 px), solid colors, no gradients or realistic shading.'
    );

    promptLines.push(
      'Preserve facial likeness, hairstyle, and proportions from the uploaded photo.'
    );

    promptLines.push(
      'Keywords: storybook illustration, vibrant colors, expressive pose, flat 2D cartoon, bold outlines, warm lighting.'
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
