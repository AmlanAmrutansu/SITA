import React from 'react';
import {
  Utensils,
  Droplet,
  Leaf,
  Sun,
  ShieldCheck,
  HeartPulse,
  Activity,
  Sparkles,
  Flower2,
  FileText,
  Check,
  X,
  Slash,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import {
  NutritionRecommendation,
  FoodOption,
  RecommendationInteraction,
} from '../lib/recommendations';

interface Props {
  recommendation: NutritionRecommendation;
  interactionsToday: RecommendationInteraction[];
  onAction: (params: {
    recommendationId: string;
    itemName: string;
    category: 'nutrition';
    action: 'ate' | 'skipped' | 'not_available';
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export const PersonalizedNutritionCard: React.FC<Props> = ({
  recommendation,
  interactionsToday,
  onAction,
  isSubmitting = false,
}) => {
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplet':
        return <Droplet className="w-5 h-5 text-rose-600" />;
      case 'Leaf':
        return <Leaf className="w-5 h-5 text-emerald-600" />;
      case 'Sun':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-teal-600" />;
      case 'HeartPulse':
        return <HeartPulse className="w-5 h-5 text-pink-600" />;
      case 'Activity':
        return <Activity className="w-5 h-5 text-indigo-600" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'Flower2':
        return <Flower2 className="w-5 h-5 text-rose-500" />;
      default:
        return <Utensils className="w-5 h-5 text-slate-600" />;
    }
  };

  const getItemInteraction = (itemName: string) => {
    return interactionsToday.find(
      (i) => i.recommendationId === recommendation.id && i.itemName === itemName
    );
  };

  return (
    <div
      id={`nutrition-card-${recommendation.id}`}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all hover:shadow-md"
    >
      {/* Card Header */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center">
              {getCategoryIcon(recommendation.iconName)}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{recommendation.title}</h3>
              <p className="text-xs text-slate-500">{recommendation.whyRecommended}</p>
            </div>
          </div>

          {/* Badge: Personalized vs General */}
          <div>
            {recommendation.isPersonalized ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Personalized Finding
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                General Stage Guidance
              </span>
            )}
          </div>
        </div>

        {/* Source Record Grounding Box (when personalized) */}
        {recommendation.isPersonalized && recommendation.sourceRecord && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50/90 border border-slate-200/70 flex items-start gap-2.5">
            <FileText className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div className="text-xs space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">
                  {recommendation.sourceRecord.recordTitle}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 font-medium">
                  {recommendation.sourceRecord.documentType}
                </span>
                {recommendation.sourceRecord.documentDate && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      Date: {recommendation.sourceRecord.documentDate}
                    </span>
                  </>
                )}
              </div>
              <p className="text-slate-700">
                <strong className="text-slate-900">Documented Finding:</strong>{' '}
                <span className="text-emerald-900 font-medium bg-emerald-100/60 px-1.5 py-0.5 rounded">
                  {recommendation.sourceRecord.relevantFinding}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recommended Foods Grid */}
      <div className="p-5 space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Recommended Whole Foods & Preparation
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recommendation.foods.map((food: FoodOption, idx: number) => {
            const currentInteraction = getItemInteraction(food.name);
            const status = currentInteraction?.action;

            return (
              <div
                key={idx}
                id={`food-item-${recommendation.id}-${idx}`}
                className={`p-3.5 rounded-xl border transition-all ${
                  status === 'ate'
                    ? 'bg-emerald-50/50 border-emerald-200/90 shadow-xs'
                    : status === 'skipped'
                    ? 'bg-slate-50/60 border-slate-200/60 opacity-75'
                    : status === 'not_available'
                    ? 'bg-amber-50/40 border-amber-200/70'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      {food.name}
                      {status === 'ate' && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                          <Check className="w-3 h-3" /> Eaten
                        </span>
                      )}
                      {status === 'skipped' && (
                        <span className="inline-flex items-center text-[11px] font-medium text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded">
                          Skipped
                        </span>
                      )}
                      {status === 'not_available' && (
                        <span className="inline-flex items-center text-[11px] font-medium text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded">
                          Unavailable
                        </span>
                      )}
                    </h5>
                    <span className="inline-block mt-0.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {food.nutrient}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {food.reason}
                </p>

                {food.preparationTip && (
                  <p className="text-[11px] text-slate-500 mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-slate-700 font-medium">Safe Tip:</strong> {food.preparationTip}
                    </span>
                  </p>
                )}

                {/* Interaction Action Buttons */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      onAction({
                        recommendationId: recommendation.id,
                        itemName: food.name,
                        category: 'nutrition',
                        action: 'ate',
                      })
                    }
                    disabled={isSubmitting}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      status === 'ate'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {status === 'ate' ? 'Ate Today' : 'Ate'}
                  </button>

                  <button
                    onClick={() =>
                      onAction({
                        recommendationId: recommendation.id,
                        itemName: food.name,
                        category: 'nutrition',
                        action: 'skipped',
                      })
                    }
                    disabled={isSubmitting}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all ${
                      status === 'skipped'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="sr-only">Skip</span>
                    {status === 'skipped' ? 'Skipped' : 'Skip'}
                  </button>

                  <button
                    onClick={() =>
                      onAction({
                        recommendationId: recommendation.id,
                        itemName: food.name,
                        category: 'nutrition',
                        action: 'not_available',
                      })
                    }
                    disabled={isSubmitting}
                    title="Not available at home"
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      status === 'not_available'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    <Slash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {recommendation.lifestyleNote && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <span>
              <strong className="text-blue-950 font-semibold">Nutritional Note:</strong>{' '}
              {recommendation.lifestyleNote}
            </span>
          </div>
        )}
      </div>

      {/* Safety Disclaimer Footer */}
      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          Curated nutritional suggestions based on available health records. For informational support only; does not replace medical treatment.
        </span>
      </div>
    </div>
  );
};
