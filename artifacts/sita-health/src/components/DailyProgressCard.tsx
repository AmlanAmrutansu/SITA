import React from 'react';
import { CheckCircle2, Circle, Clock, Flame, Sparkles } from 'lucide-react';
import {
  NutritionRecommendation,
  ActivityRecommendation,
  RecommendationInteraction,
} from '../lib/recommendations';

interface Props {
  nutritionRecommendations: NutritionRecommendation[];
  activityRecommendation?: ActivityRecommendation;
  interactionsToday: RecommendationInteraction[];
  mode: 'pregnancy' | 'postpartum';
}

export const DailyProgressCard: React.FC<Props> = ({
  nutritionRecommendations,
  activityRecommendation,
  interactionsToday,
  mode,
}) => {
  // Count total nutrition options available across active recommendation cards
  const totalFoodItems = nutritionRecommendations.reduce(
    (acc, rec) => acc + rec.foods.length,
    0
  );

  const eatenFoodsCount = interactionsToday.filter(
    (i) => i.category === 'nutrition' && i.action === 'ate'
  ).length;

  const skippedFoodsCount = interactionsToday.filter(
    (i) => i.category === 'nutrition' && i.action === 'skipped'
  ).length;

  const pendingFoodsCount = Math.max(0, totalFoodItems - eatenFoodsCount - skippedFoodsCount);

  // Activity progress
  const activityInteraction = interactionsToday.find(
    (i) => i.category === 'activity'
  );
  const isActivityDone = activityInteraction?.action === 'completed';
  const isActivitySkipped = activityInteraction?.action === 'skipped';

  return (
    <div
      id="daily-progress-summary-card"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-teal-800 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Today's Daily Plan</h4>
          <p className="text-xs text-slate-500">
            {mode === 'pregnancy' ? 'Nourishing pregnancy checklist' : 'Restorative postpartum checklist'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
        {/* Nutrition status */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Nutrition:</span>
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {eatenFoodsCount} logged
          </span>
          {pendingFoodsCount > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              <Circle className="w-3 h-3 text-slate-400" />
              {pendingFoodsCount} suggested
            </span>
          )}
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200"></div>

        {/* Activity status */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Activity:</span>
          {isActivityDone ? (
            <span className="inline-flex items-center gap-1 font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/70">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              Completed
            </span>
          ) : isActivitySkipped ? (
            <span className="inline-flex items-center gap-1 font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Skipped
            </span>
          ) : activityRecommendation?.isRestricted ? (
            <span className="inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
              Restricted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3 text-slate-400" />
              Pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
