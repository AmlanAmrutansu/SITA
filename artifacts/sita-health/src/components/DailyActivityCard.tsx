import React from 'react';
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import {
  ActivityRecommendation,
  RecommendationInteraction,
} from '../lib/recommendations';

interface Props {
  recommendation: ActivityRecommendation;
  interactionsToday: RecommendationInteraction[];
  onAction: (params: {
    recommendationId: string;
    itemName: string;
    category: 'activity';
    action: 'completed' | 'skipped';
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export const DailyActivityCard: React.FC<Props> = ({
  recommendation,
  interactionsToday,
  onAction,
  isSubmitting = false,
}) => {
  const currentInteraction = interactionsToday.find(
    (i) => i.recommendationId === recommendation.id && i.category === 'activity'
  );
  const status = currentInteraction?.action;

  const getIntensityBadge = (intensity: string) => {
    switch (intensity) {
      case 'restricted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Clinical Guidance Required
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            Moderate
          </span>
        );
      case 'low-impact':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Low-Impact
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
            Gentle
          </span>
        );
    }
  };

  return (
    <div
      id={`activity-card-${recommendation.id}`}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all hover:shadow-md"
    >
      {/* Card Header */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-teal-50/40 via-white to-slate-50/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{recommendation.title}</h3>
              <p className="text-xs text-slate-500">{recommendation.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recommendation.durationMinutes > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                ~{recommendation.durationMinutes} mins
              </span>
            )}
            {getIntensityBadge(recommendation.intensity)}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* If activity is clinically restricted */}
        {recommendation.isRestricted ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Activity Guidance Limited</span>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              Activity guidance is limited because your available records contain information that requires individualized clinical advice.
            </p>
            {recommendation.restrictionReason && (
              <p className="text-xs text-rose-900 font-medium bg-rose-100/70 p-2.5 rounded-lg border border-rose-200/60">
                {recommendation.restrictionReason}
              </p>
            )}
            <p className="text-xs text-rose-700 pt-1">
              Please discuss any exercise or physical activity with your obstetrician or midwife before proceeding.
            </p>
          </div>
        ) : (
          <>
            {/* Exercises List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Stage-Appropriate Gentle Sequence
              </h4>

              <div className="space-y-2">
                {recommendation.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    id={`exercise-item-${idx}`}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {ex.name}
                      </h5>
                    </div>

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed pl-6">
                      {ex.instructions}
                    </p>

                    <p className="text-[11px] text-teal-800 font-medium mt-2 pl-6 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{ex.benefit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Completion Interaction Controls */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onAction({
                      recommendationId: recommendation.id,
                      itemName: recommendation.title,
                      category: 'activity',
                      action: 'completed',
                    })
                  }
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    status === 'completed'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/80'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {status === 'completed' ? 'Completed Today' : 'Mark Completed'}
                </button>

                <button
                  onClick={() =>
                    onAction({
                      recommendationId: recommendation.id,
                      itemName: recommendation.title,
                      category: 'activity',
                      action: 'skipped',
                    })
                  }
                  disabled={isSubmitting}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    status === 'skipped'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <X className="w-4 h-4" />
                  {status === 'skipped' ? 'Skipped' : 'Skip'}
                </button>
              </div>

              {status === 'completed' && (
                <span className="text-xs font-medium text-teal-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Great job staying active safely today!
                </span>
              )}
              {status === 'skipped' && (
                <span className="text-xs font-medium text-slate-500">
                  Skipped today — rest is equally valuable.
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Medical Safety Disclaimer Footer */}
      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
        <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
        <span>{recommendation.disclaimer}</span>
      </div>
    </div>
  );
};
