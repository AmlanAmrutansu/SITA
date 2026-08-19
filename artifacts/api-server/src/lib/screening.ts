export interface PCOSScreeningInput {
  irregularCycles: boolean;
  cycleLengthDays?: number;
  excessHairGrowth: boolean;
  persistentAcne: boolean;
  hairThinning: boolean;
  weightChallenges: boolean;
  familyHistory: boolean;
  pelvicPain: boolean;
}

export interface PCOSScreeningResult {
  screeningType: "pcos";
  riskLevel: "low" | "moderate" | "elevated";
  score: number;
  criteriaMatched: string[];
  summary: string;
  recommendations: string[];
  disclaimer: string;
}

export function evaluatePCOS(input: PCOSScreeningInput): PCOSScreeningResult {
  const criteriaMatched: string[] = [];
  let score = 0;

  if (input.irregularCycles || (input.cycleLengthDays && (input.cycleLengthDays > 35 || input.cycleLengthDays < 21))) {
    score += 3;
    criteriaMatched.push("Cycle Irregularity (Oligo/Anovulation pattern)");
  }

  const androgenSigns: string[] = [];
  if (input.excessHairGrowth) androgenSigns.push("excess facial/body hair");
  if (input.persistentAcne) androgenSigns.push("persistent cystic acne");
  if (input.hairThinning) androgenSigns.push("hair thinning");

  if (androgenSigns.length > 0) {
    score += androgenSigns.length * 1.5;
    criteriaMatched.push(`Androgenic Signs (${androgenSigns.join(", ")})`);
  }

  if (input.weightChallenges) {
    score += 1;
    criteriaMatched.push("Metabolic / Weight Fluctuations");
  }

  if (input.familyHistory) {
    score += 1;
    criteriaMatched.push("Family History of PCOS or Insulin Resistance");
  }

  if (input.pelvicPain) {
    score += 1;
    criteriaMatched.push("Pelvic Discomfort");
  }

  let riskLevel: "low" | "moderate" | "elevated" = "low";
  let summary = "";

  if (score >= 5.5) {
    riskLevel = "elevated";
    summary = "Your responses include several hallmark patterns that frequently align with Polycystic Ovary Syndrome (PCOS).";
  } else if (score >= 3) {
    riskLevel = "moderate";
    summary = "Your responses indicate some overlapping symptoms that warrant further observation and discussion with a clinician.";
  } else {
    riskLevel = "low";
    summary = "Your reported symptoms show minimal current alignment with typical PCOS criteria.";
  }

  return {
    screeningType: "pcos",
    riskLevel,
    score,
    criteriaMatched,
    summary,
    recommendations: [
      "Keep a symptom log of your cycle dates, pain levels, and physical changes.",
      "Schedule a dedicated consultation with an OB/GYN or endocrinologist.",
      "Consider requesting standard baseline lab tests (FSH/LH, total testosterone, DHEA-S, fasting insulin, and pelvic ultrasound) for a comprehensive picture.",
    ],
    disclaimer: "SITA screening is an informational awareness tool and not a medical diagnosis. Only a qualified healthcare provider can diagnose PCOS.",
  };
}

export interface SymptomTriageInput {
  symptom: string;
  durationDays: number;
  severity: "mild" | "moderate" | "severe";
  hasFever: boolean;
  heavyBleeding: boolean;
  severePain: boolean;
  dizzinessOrFainting: boolean;
  reproductiveMode: "not-pregnant" | "pregnant" | "postpartum";
}

export interface SymptomTriageResult {
  screeningType: "symptom_triage";
  riskLevel: "low" | "moderate" | "elevated" | "prompt_attention";
  category: "General information / monitor" | "Consider contacting a healthcare professional" | "Prompt medical evaluation";
  summary: string;
  actionSteps: string[];
  warningSigns: string[];
  disclaimer: string;
}

export function evaluateSymptomTriage(input: SymptomTriageInput): SymptomTriageResult {
  const redFlags: string[] = [];

  if (input.severePain) redFlags.push("Severe sudden or unmanageable pain");
  if (input.heavyBleeding) redFlags.push("Heavy bleeding (e.g. soaking >2 pads per hour)");
  if (input.hasFever && (input.reproductiveMode === "postpartum" || input.reproductiveMode === "pregnant" || input.severePain)) {
    redFlags.push("Fever accompanied by pelvic or pregnancy symptoms");
  }
  if (input.dizzinessOrFainting) redFlags.push("Dizziness, lightheadedness, or fainting");

  if (redFlags.length > 0) {
    return {
      screeningType: "symptom_triage",
      riskLevel: "prompt_attention",
      category: "Prompt medical evaluation",
      summary: "One or more potentially acute symptoms were reported that should be assessed promptly by a healthcare professional.",
      actionSteps: [
        "Seek in-person medical care or visit an urgent care / emergency clinic.",
        "Do not wait for symptoms to resolve on their own if you feel unsafe or pain is escalating.",
        "Keep track of the exact onset time and intensity of symptoms to share with the care team.",
      ],
      warningSigns: redFlags,
      disclaimer: "This triage assessment is for educational awareness and does not replace emergency medical judgment.",
    };
  }

  if (input.severity === "moderate" || input.durationDays > 7) {
    return {
      screeningType: "symptom_triage",
      riskLevel: "moderate",
      category: "Consider contacting a healthcare professional",
      summary: "Your symptoms appear persistent or moderately impactful. While not immediately dangerous, discussing them with your doctor can help find relief.",
      actionSteps: [
        "Log your daily symptoms and note what helps or aggravates them.",
        "Reach out to your primary care provider or gynecologist for non-urgent guidance.",
        "Stay hydrated and prioritize gentle rest while monitoring.",
      ],
      warningSigns: [
        "Watch for sudden escalation in pain, fever, or unusually heavy bleeding.",
      ],
      disclaimer: "SITA provides educational guidance to support informed conversations with your doctor.",
    };
  }

  return {
    screeningType: "symptom_triage",
    riskLevel: "low",
    category: "General information / monitor",
    summary: "Your reported symptoms appear typical for common cycle or wellness variations.",
    actionSteps: [
      "Continue gentle self-care (hydration, warmth/heating pad, balanced nourishment).",
      "Log your symptoms in SITA so you can observe patterns over time.",
      "Check in with your body again tomorrow.",
    ],
    warningSigns: [
      "If pain worsens or new symptoms develop, consider seeking medical advice.",
    ],
    disclaimer: "Informational support only. Always trust your instincts if your body feels unwell.",
  };
}
