/**
 * Prompt Auto-Fill Helper
 * Automates prompt creation from story analysis
 * Future enhancement for streamlined workflow
 */

import { buildStorybookPrompt, StorybookPromptParams } from './promptBuilder';
import { ChapterElements } from '../services/storyAnalysis';

export interface ChildData {
  childName: string;
  age: number;
  gender: 'boy' | 'girl';
  language?: string;
  parentName?: string;
}

/**
 * Auto-generate prompt from chapter analysis
 * Combines extraction methods with template builder
 * 
 * @param chapterElements - Analyzed chapter elements
 * @param childData - Child information
 * @param extractVisualPose - Function to extract visual pose from text
 * @param extractEmotionalTransition - Function to extract emotion from text
 * @param extractSceneContext - Function to extract scene context from text
 * @returns Complete storybook prompt string
 */
export function generatePromptFromAnalysis(
  chapterElements: ChapterElements,
  childData: ChildData,
  extractVisualPose: (text: string) => string,
  extractEmotionalTransition: (text: string) => string,
  extractSceneContext: (text: string) => string
): string {
  // Extract all elements from chapter text
  const visualPose = extractVisualPose(chapterElements.chapterText);
  const emotion = extractEmotionalTransition(chapterElements.chapterText);
  const sceneContext = extractSceneContext(chapterElements.chapterText);
  
  // Build environment from settings
  let environment = 'simple colorful storybook setting';
  if (chapterElements.settings && chapterElements.settings.length > 0) {
    environment = chapterElements.settings.join(', ');
  }
  
  // Build prompt parameters
  const params: StorybookPromptParams = {
    childName: childData.childName,
    age: childData.age,
    gender: childData.gender,
    visualPose,
    emotion,
    sceneContext,
    environment,
  };
  
  return buildStorybookPrompt(params);
}

/**
 * Batch generate prompts for multiple chapters
 * Useful for processing entire stories at once
 * 
 * @param chapters - Array of chapter elements
 * @param childData - Child information
 * @param extractors - Object containing extraction functions
 * @returns Array of prompt strings
 */
export function generateBatchPrompts(
  chapters: ChapterElements[],
  childData: ChildData,
  extractors: {
    extractVisualPose: (text: string) => string;
    extractEmotionalTransition: (text: string) => string;
    extractSceneContext: (text: string) => string;
  }
): string[] {
  return chapters.map((chapterElements) =>
    generatePromptFromAnalysis(
      chapterElements,
      childData,
      extractors.extractVisualPose,
      extractors.extractEmotionalTransition,
      extractors.extractSceneContext
    )
  );
}

/**
 * Quick prompt preview for debugging
 * Returns first 200 characters of the prompt
 */
export function getPromptPreview(prompt: string): string {
  return prompt.substring(0, 200) + (prompt.length > 200 ? '...' : '');
}
