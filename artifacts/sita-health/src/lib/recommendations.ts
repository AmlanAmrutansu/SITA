/**
 * SITA Recommendations Client & Types
 */

import { api } from './api';

export interface SourceRecordEvidence {
  recordId?: string;
  recordTitle: string;
  documentType: string;
  documentDate?: string;
  relevantFinding: string;
}

export interface FoodOption {
  name: string;
  nutrient: string;
  reason: string;
  preparationTip?: string;
}

export interface NutritionRecommendation {
  id: string;
  category: 'iron_support' | 'folate_support' | 'vitamin_d_support' | 'calcium_support' | 'b12_support' | 'glycemic_support' | 'thyroid_support' | 'general_stage_nutrition';
  title: string;
  iconName: string;
  isPersonalized: boolean;
  whyRecommended: string;
  sourceRecord?: SourceRecordEvidence;
  foods: FoodOption[];
  lifestyleNote?: string;
}

export interface ActivityExercise {
  name: string;
  instructions: string;
  benefit: string;
}

export interface ActivityRecommendation {
  id: string;
  title: string;
  intensity: 'gentle' | 'low-impact' | 'moderate' | 'restricted';
  durationMinutes: number;
  description: string;
  exercises: ActivityExercise[];
  disclaimer: string;
  isRestricted: boolean;
  restrictionReason?: string;
}

export interface RecommendationInteraction {
  id: string;
  recommendationId: string;
  itemName: string;
  recommendationDate: string;
  mode: 'pregnancy' | 'postpartum';
  category: 'nutrition' | 'activity';
  action: 'ate' | 'completed' | 'skipped' | 'not_available';
  createdAt: string;
}

export interface RecommendationEngineResult {
  mode: 'pregnancy' | 'postpartum';
  stageWeek?: number;
  stageLabel: string;
  nutritionRecommendations: NutritionRecommendation[];
  activityRecommendation: ActivityRecommendation;
  interactionsToday: RecommendationInteraction[];
  summaryMessage: string;
}

/**
 * Fetch pregnancy nutrition & activity recommendations
 */
export async function fetchPregnancyRecommendations(): Promise<RecommendationEngineResult> {
  return await api.get<RecommendationEngineResult>('/recommendations/pregnancy');
}

/**
 * Fetch postpartum recovery nutrition & activity recommendations
 */
export async function fetchPostpartumRecommendations(): Promise<RecommendationEngineResult> {
  return await api.get<RecommendationEngineResult>('/recommendations/postpartum');
}

/**
 * Persist recommendation interaction ('ate', 'completed', 'skipped', 'not_available')
 */
export async function recordRecommendationInteraction(params: {
  recommendation_id: string;
  item_name: string;
  recommendation_date?: string;
  mode: 'pregnancy' | 'postpartum';
  category: 'nutrition' | 'activity';
  action: 'ate' | 'completed' | 'skipped' | 'not_available';
}): Promise<{
  success: boolean;
  interaction: RecommendationInteraction;
  interactionsToday: RecommendationInteraction[];
}> {
  return await api.post('/recommendations/interactions', params);
}

/**
 * Fetch interactions for a date
 */
export async function fetchRecommendationInteractions(params: {
  mode?: 'pregnancy' | 'postpartum';
  date?: string;
}): Promise<{
  date: string;
  mode: string;
  interactions: RecommendationInteraction[];
  totalAllTime: number;
}> {
  const query = new URLSearchParams();
  if (params.mode) query.set('mode', params.mode);
  if (params.date) query.set('date', params.date);
  return await api.get(`/recommendations/interactions?${query.toString()}`);
}
