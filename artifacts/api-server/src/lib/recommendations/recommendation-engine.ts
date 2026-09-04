/**
 * SITA Deterministic Recommendation Engine
 * Safe, auditable, and grounded strictly in existing user health records.
 *
 * HARD CONSTRAINTS:
 * 1. Zero LLM dependency. Pure deterministic rule-based evaluation.
 * 2. Never infer a deficiency merely from symptoms.
 * 3. Only trigger deficiency-specific guidance when an actual documented health record supports it.
 * 4. Ground every personalized recommendation in documented evidence (title, date, finding).
 * 5. Strictly enforce provider restrictions (e.g., bedrest, placenta previa, high-risk activity warnings).
 * 6. Differentiate clearly between PERSONALIZED and GENERAL guidance.
 */

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

export interface ActivityRecommendation {
  id: string;
  title: string;
  intensity: 'gentle' | 'low-impact' | 'moderate' | 'restricted';
  durationMinutes: number;
  description: string;
  exercises: Array<{
    name: string;
    instructions: string;
    benefit: string;
  }>;
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

// ----------------------------------------------------------------------
// Safe helper to extract and clean strings
// ----------------------------------------------------------------------
function cleanStr(val: unknown): string {
  return typeof val === 'string' ? val.trim().toLowerCase() : '';
}

// ----------------------------------------------------------------------
// Documented Restriction Checker
// ----------------------------------------------------------------------
const RESTRICTIVE_TERMS = [
  'placenta previa',
  'cervical insufficiency',
  'cerclage',
  'incompetent cervix',
  'vaginal bleeding',
  'threatened abortion',
  'threatened miscarriage',
  'threatened preterm',
  'preterm labor',
  'preeclampsia',
  'severe hypertension',
  'uncontrolled hypertension',
  'bed rest',
  'strict bedrest',
  'pelvic rest',
  'avoid strenuous',
  'wound dehiscence',
  'postpartum hemorrhage',
  'severe infection',
  'endometritis',
];

export function detectActivityRestrictions(medicalRecords: any[]): { isRestricted: boolean; reason?: string; source?: SourceRecordEvidence } {
  for (const record of medicalRecords) {
    const sData = record.structured_data || {};
    const title = record.title || sData.title || 'Medical Record';
    const date = record.document_date || sData.document_date || '';
    const type = record.document_type || sData.document_type || 'Clinical Document';

    // 1. Check diagnoses
    const diagnoses: string[] = Array.isArray(sData.diagnoses) ? sData.diagnoses : [];
    for (const d of diagnoses) {
      const dClean = cleanStr(d);
      for (const term of RESTRICTIVE_TERMS) {
        if (dClean.includes(term)) {
          return {
            isRestricted: true,
            reason: `Documented clinical diagnosis: "${d}". Individualized medical clearance is required prior to activity.`,
            source: { recordId: record.id, recordTitle: title, documentType: type, documentDate: date, relevantFinding: d },
          };
        }
      }
    }

    // 2. Check important findings & notes
    const findings: string[] = Array.isArray(sData.important_findings) ? sData.important_findings : [];
    if (sData.notes) findings.push(sData.notes);
    if (record.notes) findings.push(record.notes);

    for (const f of findings) {
      const fClean = cleanStr(f);
      for (const term of RESTRICTIVE_TERMS) {
        if (fClean.includes(term)) {
          return {
            isRestricted: true,
            reason: `Documented clinical observation: "${f}". Individualized medical clearance is required prior to activity.`,
            source: { recordId: record.id, recordTitle: title, documentType: type, documentDate: date, relevantFinding: f },
          };
        }
      }
    }
  }

  return { isRestricted: false };
}

// ----------------------------------------------------------------------
// Documented Deficiency & Finding Matcher
// ----------------------------------------------------------------------
export function extractDocumentedNutritionFindings(medicalRecords: any[]): Array<{
  category: 'iron_support' | 'folate_support' | 'vitamin_d_support' | 'calcium_support' | 'b12_support' | 'glycemic_support' | 'thyroid_support';
  source: SourceRecordEvidence;
}> {
  const detectedFindings: Array<{
    category: 'iron_support' | 'folate_support' | 'vitamin_d_support' | 'calcium_support' | 'b12_support' | 'glycemic_support' | 'thyroid_support';
    source: SourceRecordEvidence;
  }> = [];

  const seenCategories = new Set<string>();

  for (const record of medicalRecords) {
    const sData = record.structured_data || {};
    const title = record.title || sData.title || 'Laboratory / Clinical Report';
    const date = record.document_date || sData.document_date || '';
    const type = record.document_type || sData.document_type || 'Medical Record';

    const labResults = Array.isArray(sData.lab_results) ? sData.lab_results : [];
    const diagnoses = Array.isArray(sData.diagnoses) ? sData.diagnoses : [];
    const medications = Array.isArray(sData.medications) ? sData.medications : [];
    const findings = Array.isArray(sData.important_findings) ? sData.important_findings : [];

    // 1. IRON SUPPORT CHECK
    if (!seenCategories.has('iron_support')) {
      let matchNote = '';
      // Check labs
      for (const lab of labResults) {
        const testName = cleanStr(lab.test_name);
        const flag = cleanStr(lab.flag);
        const val = typeof lab.numeric_value === 'number' ? lab.numeric_value : parseFloat(String(lab.value || '').replace(/[^0-9.-]/g, ''));

        if (testName.includes('hemoglobin') || testName.includes('haemoglobin') || testName === 'hb') {
          if (flag === 'low' || flag === 'abnormal' || (!isNaN(val) && val > 0 && val < 11.5)) {
            matchNote = `Hemoglobin: ${lab.value} ${lab.unit || ''} (documented low)`;
            break;
          }
        }
        if (testName.includes('ferritin')) {
          if (flag === 'low' || (!isNaN(val) && val > 0 && val < 25)) {
            matchNote = `Serum Ferritin: ${lab.value} ${lab.unit || ''} (documented low)`;
            break;
          }
        }
      }
      // Check diagnoses
      if (!matchNote) {
        for (const d of diagnoses) {
          const dClean = cleanStr(d);
          if (dClean.includes('anemia') || dClean.includes('iron deficiency') || dClean.includes('gestational anemia')) {
            matchNote = `Diagnosed: ${d}`;
            break;
          }
        }
      }
      // Check medications
      if (!matchNote) {
        for (const m of medications) {
          const mName = cleanStr(m.name || m);
          if (mName.includes('ferrous') || mName.includes('iron') || mName.includes('autrin') || mName.includes('orofer')) {
            matchNote = `Prescribed iron therapy: ${m.name || m}`;
            break;
          }
        }
      }
      // Check findings
      if (!matchNote) {
        for (const f of findings) {
          const fClean = cleanStr(f);
          if (fClean.includes('iron deficiency') || fClean.includes('low ferritin') || fClean.includes('iron stores')) {
            matchNote = f;
            break;
          }
        }
      }

      if (matchNote) {
        seenCategories.add('iron_support');
        detectedFindings.push({
          category: 'iron_support',
          source: { recordId: record.id, recordTitle: title, documentType: type, documentDate: date, relevantFinding: matchNote },
        });
      }
    }

    // 2. FOLATE SUPPORT CHECK
    if (!seenCategories.has('folate_support')) {
      let matchNote = '';
      for (const lab of labResults) {
        const testName = cleanStr(lab.test_name);
        const flag = cleanStr(lab.flag);
        if ((testName.includes('folate') || testName.includes('folic')) && (flag === 'low' || flag === 'abnormal')) {
          matchNote = `Serum Folate: ${lab.value} ${lab.unit || ''} (documented low)`;
          break;
        }
      }
      if (!matchNote) {
        for (const m of medications) {
          const mName = cleanStr(m.name || m);
          if (mName.includes('folic') || mName.includes('folate') || mName.includes('methylfolate')) {
            matchNote = `Prescribed folate support: ${m.name || m}`;
            break;
          }
        }
      }
      if (matchNote) {
        seenCategories.add('folate_support');
        detectedFindings.push({
          category: 'folate_support',
          source: { recordId: record.id, recordTitle: title, documentType: type, documentDate: date, relevantFinding: matchNote },
        });
      }
    }

    // 3. VITAMIN D SUPPORT CHECK
    if (!seenCategories.has('vitamin_d_support')) {
      let matchNote = '';
      for (const lab of labResults) {
        const testName = cleanStr(lab.test_name);
        const flag = cleanStr(lab.flag);
        const val = typeof lab.numeric_value === 'number' ? lab.numeric_value : parseFloat(String(lab.value || '').replace(/[^0-9.-]/g, ''));
        if ((testName.includes('vitamin d') || testName.includes('vit d') || testName.includes('25-oh')) && (flag === 'low' || (!isNaN(val) && val > 0 && val < 30))) {
          matchNote = `Vitamin D (25-OH): ${lab.value} ${lab.unit || ''} (documented insufficient/low)`;
          break;
        }
      }
      if (!matchNote) {
        for (const m of medications) {
          const mName = cleanStr(m.name || m);
          if (mName.includes('cholecalciferol') || mName.includes('calcirol') || mName.includes('d3 60k')) {
            matchNote = `Prescribed Vitamin D3 support: ${m.name || m}`;
            break;
          }
        }
      }
      if (matchNote) {
        seenCategories.add('vitamin_d_support');
        detectedFindings.push({
          category: 'vitamin_d_support',
          source: { recordId: record.id, recordTitle: title, documentType: type, documentDate: date, relevantFinding: matchNote },
        });
      }
    }

    // 4. CALCIUM SUPPORT CHECK
    if (!seenCategories.has('calcium_support')) {
      let matchNote = '';
      for (const lab of labResults) {
        const testName = cleanStr(lab.test_name);
        const flag = cleanStr(lab.flag);
        if (testName.includes('calcium') && (flag === 'low' || flag === 'borderline')) {
          matchNote = `Serum Calcium: ${lab.value} ${lab.unit || ''} (${flag})`;
          break;
        }
      }
      if (!matchNote) {
        for (const m of medications) {
          const mName = cleanStr(m.name || m);
          if (mName.includes('calcium') || mName.includes('shelcal') || mName.includes('calcimax')) {
            matchNote = `Prescribed Calcium therapy: ${m.name || m}`;
            break;
          }
        }
      }
      if (matchNote) {
        seenCategories.add('calcium_support');
        detectedFindings.push({
          category: 'calcium_support',
          source: { recordId: record.id, recordTitle: title, documentType: type, documentDate: date, relevantFinding: matchNote },
        });
      }
    }

    // 5. VITAMIN B12 SUPPORT CHECK
    if (!seenCategories.has('b12_support')) {
      let matchNote = '';
      for (const lab of labResults) {
        const testName = cleanStr(lab.test_name);
        const flag = cleanStr(lab.flag);
        const val = typeof lab.numeric_value === 'number' ? lab.numeric_value : parseFloat(String(lab.value || '').replace(/[^0-9.-]/g, ''));
        if ((testName.includes('b12') || testName.includes('cobalamin')) && (flag === 'low' || (!isNaN(val) && val > 0 && val < 220))) {
          matchNote = `Vitamin B12: ${lab.value} ${lab.unit || ''} (documented low)`;
          break;
        }
      }
      if (matchNote) {
        seenCategories.add('b12_support');
        detectedFindings.push({
          category: 'b12_support',
          source: { recordId: record.id, recordTitle: title, documentType: type, documentDate: date, relevantFinding: matchNote },
        });
      }
    }

    // 6. GLYCEMIC SUPPORT CHECK
    if (!seenCategories.has('glycemic_support')) {
      let matchNote = '';
      for (const lab of labResults) {
        const testName = cleanStr(lab.test_name);
        const flag = cleanStr(lab.flag);
        if ((testName.includes('glucose') || testName.includes('sugar') || testName.includes('ogtt') || testName.includes('hba1c')) && (flag === 'high' || flag === 'abnormal')) {
          matchNote = `Blood Glucose / GTT: ${lab.value} ${lab.unit || ''} (documented elevated)`;
          break;
        }
      }
      if (!matchNote) {
        for (const d of diagnoses) {
          const dClean = cleanStr(d);
          if (dClean.includes('gestational diabetes') || dClean.includes('gdm') || dClean.includes('hyperglycemia')) {
            matchNote = `Documented: ${d}`;
            break;
          }
        }
      }
      if (matchNote) {
        seenCategories.add('glycemic_support');
        detectedFindings.push({
          category: 'glycemic_support',
          source: { recordId: record.id, recordTitle: title, documentType: type, documentDate: date, relevantFinding: matchNote },
        });
      }
    }

    // 7. THYROID METABOLIC CHECK
    if (!seenCategories.has('thyroid_support')) {
      let matchNote = '';
      for (const lab of labResults) {
        const testName = cleanStr(lab.test_name);
        const flag = cleanStr(lab.flag);
        if (testName.includes('tsh') && (flag === 'high' || flag === 'low' || flag === 'abnormal')) {
          matchNote = `Thyroid TSH: ${lab.value} ${lab.unit || ''} (documented ${flag})`;
          break;
        }
      }
      if (!matchNote) {
        for (const m of medications) {
          const mName = cleanStr(m.name || m);
          if (mName.includes('thyronorm') || mName.includes('levothyroxine') || mName.includes('eltroxin')) {
            matchNote = `Thyroid medication documented: ${m.name || m}`;
            break;
          }
        }
      }
      if (matchNote) {
        seenCategories.add('thyroid_support');
        detectedFindings.push({
          category: 'thyroid_support',
          source: { recordId: record.id, recordTitle: title, documentType: type, documentDate: date, relevantFinding: matchNote },
        });
      }
    }
  }

  return detectedFindings;
}

// ----------------------------------------------------------------------
// Curated Nutrition Knowledge Base
// ----------------------------------------------------------------------
function getCuratedFoodsForCategory(category: string, mode: 'pregnancy' | 'postpartum'): { title: string; iconName: string; why: string; foods: FoodOption[]; lifestyle: string } {
  switch (category) {
    case 'iron_support':
      return {
        title: mode === 'pregnancy' ? 'Iron Support' : 'Iron Recovery & Blood Building',
        iconName: 'Droplet',
        why: 'Your recent health record contains a finding relevant to iron status.',
        foods: [
          { name: 'Cooked Lentils (Dal)', nutrient: 'Non-heme Iron & Folate', reason: 'High-density plant iron and protein, gentle on digestion.', preparationTip: 'Add lemon juice right before eating; vitamin C boosts iron absorption.' },
          { name: 'Dark Leafy Greens (Spinach/Kale)', nutrient: 'Iron & Magnesium', reason: 'Steamed greens supply bioavailable minerals and support expanding blood volume.', preparationTip: 'Cook thoroughly; avoid taking alongside calcium or dairy to maximize iron uptake.' },
          { name: 'Black Beans or Chickpeas', nutrient: 'Iron & Dietary Fiber', reason: 'Provides steady minerals and dietary fiber to promote regularity.', preparationTip: 'Well-cooked and lightly spiced with cumin and coriander for digestive ease.' },
          { name: 'Hard-Boiled Eggs', nutrient: 'Heme Iron, Choline, Protein', reason: 'Complete amino acid profile plus choline for maternal-fetal health.', preparationTip: 'Must be cooked until both yolk and white are completely firm.' },
          { name: 'Lean Poultry (or Tofu for vegetarian)', nutrient: 'Bioavailable Iron & Protein', reason: 'Easily digestible protein that supports maternal hemoglobin synthesis.', preparationTip: 'Cook to safe internal temperature (minimum 165°F / 74°C).' },
        ],
        lifestyle: 'Separate calcium-rich meals or dairy by at least 1–2 hours from iron-rich foods, as calcium can reduce iron absorption.',
      };

    case 'folate_support':
      return {
        title: 'Folate & Cellular Support',
        iconName: 'Leaf',
        why: 'Your health record notes a finding regarding folate requirements.',
        foods: [
          { name: 'Steamed Asparagus', nutrient: 'Natural Folate', reason: 'One of the most folate-dense vegetables, supporting cellular repair.', preparationTip: 'Steam lightly for 3–4 minutes to preserve heat-sensitive folates.' },
          { name: 'Ripe Avocado', nutrient: 'Folate & Healthy Fats', reason: 'Provides monounsaturated fatty acids that aid fat-soluble nutrient absorption.', preparationTip: 'Enjoy freshly sliced on whole-grain toast or in warm grain bowls.' },
          { name: 'Steamed Edamame & Green Peas', nutrient: 'Folate & Plant Protein', reason: 'Supports tissue synthesis and steady daytime energy levels.', preparationTip: 'Lightly boiled or steamed with a pinch of iodized salt.' },
          { name: 'Fortified Steel-cut Oats', nutrient: 'Folic Acid & Soluble Fiber', reason: 'Provides steady sustained energy release and maternal metabolic support.', preparationTip: 'Cook with pasteurized milk or water, topped with crushed walnuts.' },
        ],
        lifestyle: 'Folate is water-soluble; steaming or light sautéing helps retain higher nutrient levels than prolonged boiling.',
      };

    case 'vitamin_d_support':
      return {
        title: 'Vitamin D & Bone Mineral Support',
        iconName: 'Sun',
        why: 'Your health record indicates a finding concerning Vitamin D levels.',
        foods: [
          { name: 'Fortified Pasteurized Milk / Plant Milk', nutrient: 'Vitamin D3/D2 & Calcium', reason: 'A primary dietary vehicle for Vitamin D and bone mineralization.', preparationTip: 'Ensure label confirms vitamin D fortification and pasteurization.' },
          { name: 'Cooked Salmon (Low Mercury)', nutrient: 'Vitamin D3 & Omega-3 DHA', reason: 'Supports fetal neural growth and maternal musculoskeletal integrity.', preparationTip: 'Bake or grill thoroughly to an internal temperature of 145°F (63°C).' },
          { name: 'Pasture-Raised Egg Yolks', nutrient: 'Natural Vitamin D & Choline', reason: 'One of the few natural whole-food sources of dietary vitamin D.', preparationTip: 'Always fully cooked until firm.' },
          { name: 'Fortified Greek Yogurt', nutrient: 'Vitamin D & Probiotics', reason: 'Promotes both maternal bone density and gut microbiome balance.', preparationTip: 'Choose unflavored or low-sugar varieties; sweeten with berries.' },
        ],
        lifestyle: 'Safe brief morning sunlight exposure (10–15 minutes) on hands and arms supports endogenous synthesis where comfortable.',
      };

    case 'calcium_support':
      return {
        title: 'Calcium & Skeletal Support',
        iconName: 'ShieldCheck',
        why: 'Your documented health records reference calcium support and metabolic balance.',
        foods: [
          { name: 'Pasteurized Plain Greek Yogurt', nutrient: 'Bioavailable Calcium & Protein', reason: 'Dense source of easily absorbable calcium and digestive probiotics.', preparationTip: 'Top with sliced fresh figs or chia seeds.' },
          { name: 'Calcium-Set Tofu', nutrient: 'Plant Calcium & Complete Protein', reason: 'Excellent bioavailable calcium alternative for plant-forward diets.', preparationTip: 'Check label for "calcium sulfate" in ingredients; sauté with veggies.' },
          { name: 'Steamed Bok Choy & Broccoli', nutrient: 'Calcium & Vitamin K', reason: 'Cruciferous greens with lower oxalates, yielding high calcium bioavailability.', preparationTip: 'Quickly steam and dress with sesame oil.' },
          { name: 'Sesame Seeds (Til) / Tahini', nutrient: 'Mineral Calcium & Zinc', reason: 'Concentrated calcium reserve to support bone density and muscle relaxation.', preparationTip: 'Sprinkle 1 tablespoon over warm oats or roasted veggies.' },
        ],
        lifestyle: 'Adequate hydration and spacing calcium intake across the day maximizes intestinal absorption.',
      };

    case 'b12_support':
      return {
        title: 'Vitamin B12 & Nerve Support',
        iconName: 'HeartPulse',
        why: 'Your health record notes a finding regarding Vitamin B12 levels.',
        foods: [
          { name: 'Pasteurized Cottage Cheese (Paneer)', nutrient: 'Vitamin B12 & Protein', reason: 'Supports red blood cell formation and nervous system health.', preparationTip: 'Sauté lightly with colorful vegetables.' },
          { name: 'Fortified Nutritional Yeast', nutrient: 'B12 Complex', reason: 'Plant-based B12 powerhouse that adds a savory, cheesy flavor.', preparationTip: 'Stir 1–2 teaspoons into warm soup, pasta, or dal.' },
          { name: 'Fortified Grain Cereals / Oats', nutrient: 'Dietary B12 & Fiber', reason: 'Convenient morning replenishment to sustain daily stamina.', preparationTip: 'Pair with calcium-fortified plant milk.' },
        ],
        lifestyle: 'If following a vegetarian or vegan lifestyle, clinical monitoring of B12 status is routinely recommended.',
      };

    case 'glycemic_support':
      return {
        title: 'Balanced Glycemic Support',
        iconName: 'Activity',
        why: 'Your health record notes a finding related to glucose metabolism.',
        foods: [
          { name: 'Rolled Oats with Chia & Flaxseeds', nutrient: 'Soluble Beta-Glucan Fiber', reason: 'Slows carbohydrate breakdown, smoothing post-meal blood sugar curves.', preparationTip: 'Cook without refined sweeteners; add a dash of cinnamon.' },
          { name: 'Non-Starchy Roasted Vegetables', nutrient: 'Complex Micronutrients & Fiber', reason: 'Zucchini, green beans, cauliflower, and bell peppers offer nutrient fullness with minimal glycemic impact.', preparationTip: 'Roast with olive oil and herbs.' },
          { name: 'Moong Dal or Black Eyed Peas', nutrient: 'Low-Glycemic Protein & Fiber', reason: 'Provides gradual glucose release and sustained satiety.', preparationTip: 'Enjoy as a warm, comforting soup with ginger.' },
          { name: 'Raw Walnuts & Almonds', nutrient: 'Healthy Monounsaturated Fats', reason: 'Blunts the glucose curve when consumed with carbohydrates.', preparationTip: 'A small handful (1 oz) as a balanced afternoon snack.' },
        ],
        lifestyle: 'Pairing all carbohydrate-containing meals with protein and healthy fats helps maintain steady energy throughout the day.',
      };

    case 'thyroid_support':
      return {
        title: 'Thyroid Metabolic Support',
        iconName: 'Sparkles',
        why: 'Your record contains a finding relating to thyroid hormone parameters.',
        foods: [
          { name: 'Pasteurized Organic Yogurt', nutrient: 'Natural Dietary Iodine & Zinc', reason: 'Supplies essential dietary trace elements for healthy gestational metabolism.', preparationTip: 'Keep chilled; consume plain or with berries.' },
          { name: 'Pumpkin & Sunflower Seeds', nutrient: 'Selenium, Zinc & Magnesium', reason: 'Cofactor minerals involved in cellular thyroid hormone conversion.', preparationTip: 'Dry roast lightly and keep in an airtight container for snacking.' },
          { name: 'Well-Cooked Eggs', nutrient: 'Iodine, Choline & Selenium', reason: 'Essential trace minerals in bioavailable form.', preparationTip: 'Hard-boiled or fully set scrambled eggs.' },
          { name: 'Steamed Carrots & Zucchini', nutrient: 'Gentle Antioxidants', reason: 'Easy on the digestive tract while supporting cellular defense.', preparationTip: 'Cook until tender.' },
        ],
        lifestyle: 'If taking thyroid hormone replacement, remember clinical guidance to take it on an empty stomach 30–60 minutes before breakfast.',
      };

    default:
      return {
        title: 'Balanced Whole-Food Nutrition',
        iconName: 'Utensils',
        why: 'No deficiency-specific recommendation was identified from your available records.',
        foods: [
          { name: 'Mixed Legumes & Lentils', nutrient: 'Plant Protein & Fiber', reason: 'Provides steady complex energy and sustained satiety.', preparationTip: 'Cook thoroughly with mild aromatic spices.' },
          { name: 'Varied Colorful Vegetables', nutrient: 'Polyphenols & Vitamins', reason: 'Delivers a broad spectrum of protective antioxidants.', preparationTip: 'Wash thoroughly and lightly steam.' },
          { name: 'Fresh Fruits (Berries, Apples)', nutrient: 'Hydration & Dietary Fiber', reason: 'Natural sweetness combined with soluble pectin for healthy bowel regularity.', preparationTip: 'Always wash thoroughly under running water before peeling or eating.' },
          { name: 'Whole Grains (Brown Rice, Quinoa)', nutrient: 'B-Vitamins & Complex Carbs', reason: 'Steady glucose release to combat mid-day fatigue.', preparationTip: 'Pair with a healthy fat or protein source.' },
        ],
        lifestyle: 'Focus on balanced hydration, diverse colorful plates, and regular small meals.',
      };
  }
}

// ----------------------------------------------------------------------
// General Stage-Appropriate Nutrition Fallback Generator
// ----------------------------------------------------------------------
function getGeneralStageNutrition(mode: 'pregnancy' | 'postpartum', stageWeek?: number): NutritionRecommendation {
  if (mode === 'pregnancy') {
    const week = stageWeek || 20;
    let trimester = '2nd Trimester';
    let trimesterFocus = 'Supporting rapid skeletal growth and expanding maternal blood volume';
    let trimesterFoods: FoodOption[] = [
      { name: 'Warm Lentil & Spinach Soup', nutrient: 'Iron, Folate & Hydration', reason: 'Supports growing blood volume and supplies easy-to-absorb plant iron.', preparationTip: 'Squeeze fresh lemon juice before serving.' },
      { name: 'Pasteurized Greek Yogurt with Berries', nutrient: 'Calcium, Protein & Probiotics', reason: 'Protects maternal bone stores and aids healthy digestion.', preparationTip: 'Ensure label indicates pasteurized milk.' },
      { name: 'Roasted Sweet Potato with Olive Oil', nutrient: 'Beta-Carotene & Fiber', reason: 'Gentle slow-burning carbohydrate that helps soothe digestion.', preparationTip: 'Bake with skin washed thoroughly.' },
      { name: 'Avocado & Whole-Grain Toast', nutrient: 'Monounsaturated Fats & Folate', reason: 'Nourishing fats support developing fetal brain structure.', preparationTip: 'Serve freshly made with a pinch of seed mix.' },
    ];

    if (week <= 13) {
      trimester = '1st Trimester';
      trimesterFocus = 'Gentle hydration, digestive comfort, and vital foundational micronutrients';
      trimesterFoods = [
        { name: 'Ginger Lemon Warm Infusion', nutrient: 'Hydration & Digestive Soothing', reason: 'Calms morning digestive sensitivity and maintains fluid balance.', preparationTip: 'Steep fresh ginger slices in warm water with a touch of honey.' },
        { name: 'Oatmeal with Sliced Banana', nutrient: 'B-Vitamins & Potassium', reason: 'Gentle on an unsettled stomach while providing steady morning energy.', preparationTip: 'Cook with water or fortified milk until creamy.' },
        { name: 'Steamed Edamame / Peas', nutrient: 'Folate & Plant Protein', reason: 'Supports early cellular division in a light, non-greasy form.', preparationTip: 'Lightly boiled with a pinch of salt.' },
        { name: 'Whole-Grain Crackers with Hummus', nutrient: 'Complex Carbohydrates & Zinc', reason: 'Helps prevent nausea from an empty stomach during busy hours.', preparationTip: 'Keep small portions on hand for mid-morning snacks.' },
      ];
    } else if (week >= 28) {
      trimester = '3rd Trimester';
      trimesterFocus = 'Sustained stamina, fiber for digestive ease, and mineral replenishment';
      trimesterFoods = [
        { name: 'Chia & Flaxseed Warm Porridge', nutrient: 'Omega-3 ALA & Soluble Fiber', reason: 'Natural digestive regularity support to prevent third-trimester sluggishness.', preparationTip: 'Soak seeds for 10 minutes in warm milk before eating.' },
        { name: 'Steamed Broccoli with Sesame Oil', nutrient: 'Calcium & Vitamin C', reason: 'Supports late-stage fetal bone mineralization.', preparationTip: 'Steam crisp-tender; avoid overcooking.' },
        { name: 'Moong Dal Khichdi (Lentil & Rice)', nutrient: 'Easily Digestible Protein', reason: 'Gentle, comforting meal that avoids nighttime gastric reflux.', preparationTip: 'Cook soft with a teaspoon of pure ghee and cumin.' },
        { name: 'Fresh Ripe Kiwi or Orange Slices', nutrient: 'Vitamin C & Hydration', reason: 'Aids iron uptake and offers crisp hydration.', preparationTip: 'Wash skin thoroughly before slicing.' },
      ];
    }

    return {
      id: `general-preg-${week}`,
      category: 'general_stage_nutrition',
      title: `General Nutrition (${trimester})`,
      iconName: 'Flower2',
      isPersonalized: false,
      whyRecommended: 'No deficiency-specific recommendation was identified from your available records.',
      foods: trimesterFoods,
      lifestyleNote: `${trimesterFocus}. Aim for 8–10 glasses of water daily and listen to your body's natural hunger cues.`,
    };
  } else {
    // Postpartum mode
    const week = stageWeek || 4;
    let recoveryStage = 'Active Recovery (Weeks 3–6)';
    let postpartumFoods: FoodOption[] = [
      { name: 'Warm Moong Dal Stew with Ginger', nutrient: 'Digestible Protein & Zinc', reason: 'Promotes pelvic and abdominal tissue repair without taxing digestion.', preparationTip: 'Serve warm with a dash of turmeric and cumin.' },
      { name: 'Pasteurized Paneer or Firm Tofu', nutrient: 'Calcium & Complete Protein', reason: 'Restores maternal protein stores and supports lactation demands.', preparationTip: 'Lightly pan-tossed with seasonal greens.' },
      { name: 'Stewed Apple with Cinnamon', nutrient: 'Pectin Fiber & Hydration', reason: 'Gentle on post-delivery bowel motility while providing warm comfort.', preparationTip: 'Simmer chopped apple with 2 tablespoons water and cinnamon for 5 minutes.' },
      { name: 'Toasted Almonds & Pumpkin Seeds', nutrient: 'Healthy Fats, Magnesium & Iron', reason: 'Restorative nutrient density between infant feeding sessions.', preparationTip: 'Keep pre-portioned containers by your nursing or rest station.' },
    ];

    if (week <= 2) {
      recoveryStage = 'Immediate Healing (Weeks 1–2)';
      postpartumFoods = [
        { name: 'Warm Bone Broth or Nourishing Vegetable Broth', nutrient: 'Electrolytes, Collagen & Fluids', reason: 'Rehydrates maternal vascular volume and comforts the abdominal cavity.', preparationTip: 'Sip warm from a mug throughout the day.' },
        { name: 'Soft Rice Congee or Kheer (Low Sugar)', nutrient: 'Gentle Carbohydrates', reason: 'Immediate accessible energy requiring minimal digestive effort.', preparationTip: 'Cook very soft with cardamom and crushed nuts.' },
        { name: 'Steamed Spinach with Ghee', nutrient: 'Iron & Fat-Soluble Vitamins', reason: 'Aids in replenishing blood loss from delivery.', preparationTip: 'Cook thoroughly with mild cumin.' },
        { name: 'Hydrating Coconut Water', nutrient: 'Potassium & Natural Electrolytes', reason: 'Rapid fluid replenishment for lactation establishment.', preparationTip: 'Drink at room temperature.' },
      ];
    }

    return {
      id: `general-post-${week}`,
      category: 'general_stage_nutrition',
      title: `Recovery Nutrition (${recoveryStage})`,
      iconName: 'HeartPulse',
      isPersonalized: false,
      whyRecommended: 'No deficiency-specific recommendation was identified from your available records.',
      foods: postpartumFoods,
      lifestyleNote: 'Recovery is restorative work. Prioritize warm, comforting, easy-to-digest foods and drink water with every feeding or rest break.',
    };
  }
}

// ----------------------------------------------------------------------
// Activity Recommendation Generator
// ----------------------------------------------------------------------
export function generateActivityRecommendation(
  mode: 'pregnancy' | 'postpartum',
  stageWeek: number,
  restrictionInfo: { isRestricted: boolean; reason?: string; source?: SourceRecordEvidence },
): ActivityRecommendation {
  // If restricted, prioritize safety immediately
  if (restrictionInfo.isRestricted) {
    return {
      id: `act-restricted-${Date.now()}`,
      title: 'Individualized Clinical Advice Required',
      intensity: 'restricted',
      durationMinutes: 0,
      description: 'Activity guidance is limited because your available records contain information that requires individualized clinical advice.',
      exercises: [
        {
          name: 'Consult Healthcare Professional',
          instructions: restrictionInfo.reason || 'Please discuss physical activity with your doctor or midwife before engaging in exercise.',
          benefit: 'Ensures absolute safety based on your documented clinical profile.',
        },
      ],
      disclaimer: 'Your records indicate a finding that advises against routine unguided exercise. SITA prioritizes your safety.',
      isRestricted: true,
      restrictionReason: restrictionInfo.reason,
    };
  }

  if (mode === 'pregnancy') {
    if (stageWeek <= 13) {
      return {
        id: `act-preg-t1-${stageWeek}`,
        title: "Today's Activity — Gentle Pacing & Breath",
        intensity: 'gentle',
        durationMinutes: 15,
        description: 'General activity guidance — Suitable for many uncomplicated pregnancies.',
        exercises: [
          {
            name: 'Gentle Walking',
            instructions: '10–15 minutes of conversational-pace walking in comfortable footwear.',
            benefit: 'Promotes circulation and helps alleviate early pregnancy fatigue.',
          },
          {
            name: 'Diaphragmatic Belly Breathing',
            instructions: 'Sit comfortably with hands on ribs. Inhale deeply expanding ribcage, exhale slowly relaxing shoulders.',
            benefit: 'Calms the nervous system and supports oxygen exchange.',
          },
          {
            name: 'Gentle Seated Neck & Shoulder Openers',
            instructions: 'Slow neck rolls and gentle shoulder shrugs to release tension.',
            benefit: 'Relieves upper back strain from postural shifts.',
          },
        ],
        disclaimer: 'General activity guidance. Not medical clearance. Stop immediately if you feel dizzy, breathless, or uncomfortable.',
        isRestricted: false,
      };
    } else if (stageWeek <= 27) {
      return {
        id: `act-preg-t2-${stageWeek}`,
        title: "Today's Activity — Pelvic Mobility & Walking",
        intensity: 'low-impact',
        durationMinutes: 20,
        description: 'General activity guidance — Suitable for many uncomplicated pregnancies.',
        exercises: [
          {
            name: 'Brisk Conversational Walk',
            instructions: '15–20 minutes on flat ground. Maintain ability to speak in full sentences.',
            benefit: 'Sustains cardiovascular fitness and gestational blood glucose regulation.',
          },
          {
            name: 'Hands-and-Knees Cat-Cow Mobility',
            instructions: 'On a cushioned mat, gently arch and round the spine with slow breaths (8–10 repetitions).',
            benefit: 'Eases lumbar spine pressure and relieves round ligament tension.',
          },
          {
            name: 'Supported Wall Squats',
            instructions: 'Stand with back against wall, feet shoulder-width. Lower hips slightly into a shallow squat, hold 3 seconds, rise smoothly.',
            benefit: 'Strengthens pelvic floor, quadriceps, and hip stabilizers for labor endurance.',
          },
        ],
        disclaimer: 'General activity guidance. Avoid exercises lying flat on your back after the first trimester.',
        isRestricted: false,
      };
    } else {
      return {
        id: `act-preg-t3-${stageWeek}`,
        title: "Today's Activity — Gentle Walking & Pelvic Release",
        intensity: 'gentle',
        durationMinutes: 15,
        description: 'General activity guidance — Suitable for many uncomplicated pregnancies.',
        exercises: [
          {
            name: 'Gentle Pacing Walk',
            instructions: '10–15 minutes of gentle walking, taking breaks as needed.',
            benefit: 'Maintains pelvic joint mobility and aids digestive motility.',
          },
          {
            name: 'Seated Butterfly Stretch',
            instructions: 'Sit tall with soles of feet together, knees dropping outward comfortably. Breathe deeply for 5 cycles.',
            benefit: 'Gently opens adductors and prepares pelvic outlet for birth.',
          },
          {
            name: 'Calf & Ankle Release',
            instructions: 'Seated ankle circles and gentle wall calf stretches.',
            benefit: 'Reduces late-pregnancy ankle swelling and prevents nocturnal cramps.',
          },
        ],
        disclaimer: 'General activity guidance. Listen to your body and prioritize rest whenever tired.',
        isRestricted: false,
      };
    }
  } else {
    // Postpartum mode
    if (stageWeek <= 2) {
      return {
        id: `act-post-early-${stageWeek}`,
        title: "Today's Recovery Activity — Restorative Breathing",
        intensity: 'gentle',
        durationMinutes: 10,
        description: 'General recovery guidance for early postpartum healing.',
        exercises: [
          {
            name: 'Supine Diaphragmatic Breath',
            instructions: 'Lie supported on back with pillows under knees. Inhale gently into ribs and lower belly, exhale with a soft sigh.',
            benefit: 'Restores diaphragmatic coordination and relieves intra-abdominal pressure.',
          },
          {
            name: 'Gentle Ankle Pumps',
            instructions: 'Point and flex feet 15–20 times while resting.',
            benefit: 'Encourages venous return and helps reduce lower leg edema.',
          },
          {
            name: 'Gentle Stroll Around the Room',
            instructions: 'Short, unhurried walks around your living space as comfort allows.',
            benefit: 'Gently stimulates circulation without straining pelvic floor healing.',
          },
        ],
        disclaimer: 'Recovery guidance only. Not medical clearance. Rest is productive work during the fourth trimester.',
        isRestricted: false,
      };
    } else if (stageWeek <= 6) {
      return {
        id: `act-post-mid-${stageWeek}`,
        title: "Today's Recovery Activity — Gentle Walking & Pelvic Awareness",
        intensity: 'low-impact',
        durationMinutes: 15,
        description: 'General recovery guidance for mid-stage postpartum.',
        exercises: [
          {
            name: 'Low-Impact Outdoor Walk',
            instructions: '10–15 minutes of relaxed walking on level pathways.',
            benefit: 'Enhances maternal mood, Vitamin D synthesis, and gentle stamina rebuild.',
          },
          {
            name: 'Pelvic Floor Connection (Kegel Awareness)',
            instructions: 'Gently draw in and lift pelvic floor muscles on exhale, release fully on inhale (5–8 gentle reps). Do not strain.',
            benefit: 'Re-establishes neuromuscular tone and urinary continence support.',
          },
          {
            name: 'Seated Thoracic Rotation',
            instructions: 'Sit tall, gently turn torso side to side with arms crossed over chest.',
            benefit: 'Releases upper back stiffness caused by prolonged infant feeding.',
          },
        ],
        disclaimer: 'Gentle recovery guidance. Avoid high-impact running or heavy lifting until cleared by your healthcare provider.',
        isRestricted: false,
      };
    } else {
      return {
        id: `act-post-late-${stageWeek}`,
        title: "Today's Recovery Activity — Core Reconnection & Brisk Walk",
        intensity: 'moderate',
        durationMinutes: 20,
        description: 'General recovery guidance for ongoing postpartum strength.',
        exercises: [
          {
            name: 'Brisk 20-Minute Stroll',
            instructions: 'Maintain an upright posture, engage abdominal wall gently, breathe rhythmically.',
            benefit: 'Builds functional cardiovascular stamina for daily maternal activities.',
          },
          {
            name: 'Transverse Abdominal Engagement',
            instructions: 'On hands and knees, gently draw navel toward spine on exhale without moving pelvis. Hold 3 seconds, release.',
            benefit: 'Safely reconnects deep abdominal stabilizers and supports diastasis recti recovery.',
          },
          {
            name: 'Glute Bridges',
            instructions: 'Lie on back with knees bent, feet flat. Press through heels to lift hips in line with knees, hold 2 seconds, lower slowly (10 reps).',
            benefit: 'Strengthens posterior chain to protect the lumbar spine during lifting.',
          },
        ],
        disclaimer: 'General recovery guidance. Always consult your provider at your 6-week visit for individualized physical activity clearance.',
        isRestricted: false,
      };
    }
  }
}

// ----------------------------------------------------------------------
// MAIN ENGINE FUNCTION
// ----------------------------------------------------------------------
export function generatePersonalizedRecommendations(params: {
  mode: 'pregnancy' | 'postpartum';
  stageWeek?: number;
  medicalRecords: any[];
  existingInteractions?: RecommendationInteraction[];
}): RecommendationEngineResult {
  const { mode, medicalRecords = [], existingInteractions = [] } = params;

  // 1. Stage calculation
  const stageWeek = params.stageWeek || (mode === 'pregnancy' ? 20 : 4);
  const stageLabel = mode === 'pregnancy' ? `Week ${stageWeek} of Pregnancy` : `Week ${stageWeek} Postpartum`;

  // 2. Detect restrictions
  const restrictionInfo = detectActivityRestrictions(medicalRecords);

  // 3. Extract documented nutrition findings
  const documentedFindings = extractDocumentedNutritionFindings(medicalRecords);

  const nutritionRecommendations: NutritionRecommendation[] = [];

  if (documentedFindings.length > 0) {
    // Generate personalized recommendation cards for documented findings
    for (const item of documentedFindings) {
      const curated = getCuratedFoodsForCategory(item.category, mode);
      nutritionRecommendations.push({
        id: `rec-${item.category}-${item.source.recordDate || 'recent'}`,
        category: item.category,
        title: curated.title,
        iconName: curated.iconName,
        isPersonalized: true,
        whyRecommended: curated.why,
        sourceRecord: item.source,
        foods: curated.foods,
        lifestyleNote: curated.lifestyle,
      });
    }
  } else {
    // Phase 4 & Phase 15: No deficiency found. Explicitly note this and provide general stage guidance
    const generalCard = getGeneralStageNutrition(mode, stageWeek);
    nutritionRecommendations.push(generalCard);
  }

  // 4. Generate Activity Recommendation
  const activityRecommendation = generateActivityRecommendation(mode, stageWeek, restrictionInfo);

  // 5. Today's interactions filter
  const todayStr = new Date().toISOString().split('T')[0];
  const interactionsToday = existingInteractions.filter((i) => i.recommendationDate === todayStr);

  const personalizedCount = nutritionRecommendations.filter((n) => n.isPersonalized).length;
  const summaryMessage = personalizedCount > 0
    ? `Personalized recommendations generated based on ${personalizedCount} documented finding(s) in your medical records.`
    : `General stage-appropriate guidance provided. No deficiency-specific findings were identified in your available records.`;

  return {
    mode,
    stageWeek,
    stageLabel,
    nutritionRecommendations,
    activityRecommendation,
    interactionsToday,
    summaryMessage,
  };
}
