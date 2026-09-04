import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Clock, CheckCircle2, X, Search, Utensils, Info } from 'lucide-react';

interface FoodSafetyItem {
  name: string;
  category: 'avoid' | 'prepare_safely' | 'limit';
  reason: string;
  actionableGuidance: string;
}

const FOOD_SAFETY_GUIDELINES: FoodSafetyItem[] = [
  // FOODS TO AVOID
  {
    name: 'Raw or Undercooked Meat & Poultry',
    category: 'avoid',
    reason: 'Risk of Toxoplasma gondii and Salmonella infections which can cross the placenta.',
    actionableGuidance: 'Cook all meats thoroughly to safe internal temperatures (minimum 165°F / 74°C for poultry, 160°F for minced meat). Never consume rare or tartare meats.',
  },
  {
    name: 'Raw Seafood & Raw Sushi',
    category: 'avoid',
    reason: 'Can harbor harmful parasites and Vibrio bacteria.',
    actionableGuidance: 'Choose fully cooked seafood options like baked salmon or cooked shrimp. Avoid raw sashimi, nigiri, or oysters.',
  },
  {
    name: 'Unpasteurized Dairy & Soft Cheeses',
    category: 'avoid',
    reason: 'Risk of Listeria monocytogenes, bacteria that can survive refrigeration.',
    actionableGuidance: 'Check labels to confirm cheeses (brie, camembert, feta, blue cheese, queso fresco) are made with pasteurized milk. Cook until bubbling hot if uncertain.',
  },
  {
    name: 'Raw Sprouts (Alfalfa, Clover, Radish)',
    category: 'avoid',
    reason: 'Sprout seeds require warm, humid conditions that encourage bacterial proliferation.',
    actionableGuidance: 'Only consume sprouts if cooked thoroughly until steaming hot.',
  },
  {
    name: 'Deli / Luncheon Meats & Hot Dogs (Cold)',
    category: 'avoid',
    reason: 'Vulnerable to Listeria contamination post-processing.',
    actionableGuidance: 'Heat deli meats, hot dogs, and cold cuts until steaming hot (165°F) before eating.',
  },
  {
    name: 'High-Mercury Predatory Fish',
    category: 'avoid',
    reason: 'Bioaccumulated methylmercury can impact developing fetal central nervous system.',
    actionableGuidance: 'Avoid shark, swordfish, king mackerel, bigeye tuna, and tilefish.',
  },
  {
    name: 'Unpasteurized Juices & Raw Cider',
    category: 'avoid',
    reason: 'May contain harmful E. coli or Cryptosporidium bacteria.',
    actionableGuidance: 'Always purchase commercially pasteurized juices and shelf-stable ciders.',
  },

  // PREPARE SAFELY
  {
    name: 'Whole Eggs & Egg Dishes',
    category: 'prepare_safely',
    reason: 'Raw yolks carry risk of Salmonella enteritidis.',
    actionableGuidance: 'Cook eggs until both yolk and white are completely firm. Avoid homemade raw mayonnaise, hollandaise, or unbaked batter.',
  },
  {
    name: 'Fresh Fruits & Raw Vegetables',
    category: 'prepare_safely',
    reason: 'Surface soils may carry Toxoplasma or agricultural residues.',
    actionableGuidance: 'Rinse thoroughly under clean running water, scrubbing firm skins with a produce brush before peeling or cutting.',
  },
  {
    name: 'Leftovers & Reheated Meals',
    category: 'prepare_safely',
    reason: 'Rapid bacterial growth can occur in lukewarm foods.',
    actionableGuidance: 'Reheat refrigerated leftovers to an internal temperature of at least 165°F (steaming hot throughout). Consume within 2 days.',
  },
  {
    name: 'Cutting Boards & Kitchen Surfaces',
    category: 'prepare_safely',
    reason: 'Cross-contamination from raw meat to ready-to-eat produce.',
    actionableGuidance: 'Use separate color-coded cutting boards for raw proteins and ready-to-eat produce. Wash hands with warm soapy water for 20 seconds.',
  },

  // FOODS TO LIMIT
  {
    name: 'Caffeine (Coffee, Tea, Energy Drinks)',
    category: 'limit',
    reason: 'Caffeine crosses the placenta; fetal clearance is slower than maternal clearance.',
    actionableGuidance: 'Limit total caffeine intake to less than 200 mg per day (approximately one 12-ounce brewed coffee or two mugs of black tea).',
  },
  {
    name: 'Low-to-Moderate Mercury Seafood',
    category: 'limit',
    reason: 'Balancing beneficial Omega-3 DHA against trace environmental contaminants.',
    actionableGuidance: 'Enjoy 2 to 3 servings (8–12 oz total) per week of low-mercury fish such as wild salmon, canned light tuna, shrimp, or pollock.',
  },
  {
    name: 'Artificial Sweeteners & Ultra-Processed Foods',
    category: 'limit',
    reason: 'Promotes metabolic stability and nutrient-dense gestational nourishment.',
    actionableGuidance: 'Moderate sweetened beverages; emphasize water, herbal infusions, and whole unrefined foods.',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PregnancyFoodSafetyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'avoid' | 'prepare_safely' | 'limit'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredItems = FOOD_SAFETY_GUIDELINES.filter((item) => {
    const matchesTab = activeTab === 'all' || item.category === activeTab;
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.actionableGuidance.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        id="pregnancy-food-safety-modal"
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/60 via-amber-50/40 to-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pregnancy Food Safety Guide</h2>
              <p className="text-xs text-slate-500">Evidence-based clinical food hygiene & risk minimization</p>
            </div>
          </div>
          <button
            id="close-food-safety-modal"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="food-safety-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search foods (e.g. eggs, sushi, cheese, coffee)..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Items ({FOOD_SAFETY_GUIDELINES.length})
            </button>
            <button
              onClick={() => setActiveTab('avoid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'avoid'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Foods to Avoid (7)
            </button>
            <button
              onClick={() => setActiveTab('prepare_safely')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'prepare_safely'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Safe Preparation (4)
            </button>
            <button
              onClick={() => setActiveTab('limit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'limit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Foods to Limit (3)
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Utensils className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No matching food safety guidelines found.</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for a different food or reset your filter.</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isAvoid = item.category === 'avoid';
              const isPrepare = item.category === 'prepare_safely';

              return (
                <div
                  key={idx}
                  id={`food-safety-item-${idx}`}
                  className={`p-4 rounded-xl border transition-all ${
                    isAvoid
                      ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                      : isPrepare
                      ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                      : 'bg-indigo-50/40 border-indigo-200/80 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isAvoid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100 text-rose-800">
                          <ShieldAlert className="w-3 h-3" /> Avoid Completely
                        </span>
                      ) : isPrepare ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" /> Safe Preparation Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                          <Clock className="w-3 h-3" /> Limit Quantity
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 mt-2">{item.name}</h3>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    <strong className="text-slate-700">Clinical Reason:</strong> {item.reason}
                  </p>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {item.actionableGuidance}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Disclaimer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Based on standard ACOG and maternal-fetal nutrition safety standards.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
