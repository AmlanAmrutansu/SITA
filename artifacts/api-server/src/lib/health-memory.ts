import { responseJson, supabaseRequest } from "./supabase";
import { estimateTokens } from "./ai-service";

export interface RAGRetrievalResult {
  intents: string[];
  recordsRetrievedCount: number;
  recordsSelectedCount: number;
  recordsDiscardedCount: number;
  contextPrompt: string;
  relevanceSummary: string;
  estimatedTokens: number;
}

export interface UserHealthRecords {
  profile: any;
  cycles: any[];
  symptoms: any[];
  moods: any[];
  pregnancy: any;
  postpartum: any;
  screenings: any[];
  medicalRecords: any[];
  activeAssessment?: any;
}

/**
 * Classifies user query into relevant clinical & lifestyle domains
 */
export function classifyQueryIntents(
  queryText: string,
  hasAssessment = false,
  hasExtractedDoc = false
): string[] {
  const q = (queryText || "").toLowerCase().trim();
  const intents = new Set<string>();

  if (hasExtractedDoc) {
    intents.add("medical_document_new");
    intents.add("prescriptions");
    intents.add("lab_reports");
  }

  if (hasAssessment) {
    intents.add("assessment_active");
  }

  // 1. Pure Greeting
  if (
    q.match(/^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|greetings)[\s!.,?]*$/i) ||
    q.match(/^(hello|hi|hey)\s+sita[\s!.,?]*$/i) ||
    q.match(/^give me a (short )?greeting/i)
  ) {
    intents.add("greeting");
    return Array.from(intents);
  }

  // 2. Menstrual Cycle & Pattern
  if (
    q.match(/\b(cycle|period|periods|flow|cramp|cramps|ovulat|bleed|bleeding|luteal|follicular|menstrua|late period|delayed|spotting|pms|heavy flow|pad|tampon|menstrual|cycle pattern)\b/)
  ) {
    intents.add("cycles");
  }

  // 3. Symptoms & Physical Sensations
  if (
    q.match(/\b(symptom|symptoms|pain|headache|migraine|bloat|bloating|cramp|cramps|nausea|fatigue|tired|dizzy|dizziness|faint|fever|acne|hair fall|hair loss|cramping|backache|vomit)\b/)
  ) {
    intents.add("symptoms");
  }

  // 4. Mood, Sleep & Energy
  if (
    q.match(/\b(mood|moods|energy|stress|stressed|anxious|anxiety|sleep|insomnia|tired|exhausted|burnout|mental health|sad|depressed|calm)\b/)
  ) {
    intents.add("moods");
  }

  // 5. Prescriptions & Medicines
  if (
    q.match(/\b(med|meds|medication|medications|medicine|medicines|prescription|prescriptions|prescribe|prescribed|dose|dosage|tablet|pill|syrup|supplement|supplements|iron|folic|metformin|progesterone|calcium|drug|pharmacy|rx|what medicine|what medicines|taken|taking)\b/)
  ) {
    intents.add("prescriptions");
    intents.add("medical_records");
  }

  // 6. Medical Reports, Investigations & Labs
  if (
    q.match(/\b(report|reports|lab|labs|test|tests|investigation|investigations|blood|hemoglobin|haemoglobin|hb|tsh|thyroid|sugar|glucose|ferritin|ultrasound|scan|beta-hcg|hcg|cbc|platelet|wbc|rbc|urine|biomarker|value|result|results|sonography)\b/)
  ) {
    intents.add("lab_reports");
    intents.add("medical_records");
  }

  // 7. PCOS & Hormonal Screening
  if (
    q.match(/\b(pcos|pcod|polycystic|androgen|hirsutism|facial hair|rotterdam|ovary|ovaries|cyst|cysts|follicles)\b/)
  ) {
    intents.add("pcos_screening");
    intents.add("cycles");
    intents.add("medical_records");
  }

  // 8. Pregnancy & Fetal Health
  if (
    q.match(/\b(pregnan|pregnancy|trimester|due date|edd|baby|fetal|fetus|kick|kicks|movement|morning sickness|gestat|obgyn|antenatal|prenatal|lmp)\b/)
  ) {
    intents.add("pregnancy");
    intents.add("symptoms");
  }

  // 9. Postpartum Recovery
  if (
    q.match(/\b(postpartum|after birth|childbirth|delivery|lochia|postnatal|kegel|pelvic floor|recovery|breastfeed|nursing|baby blues|fourth trimester)\b/)
  ) {
    intents.add("postpartum");
    intents.add("symptoms");
    intents.add("moods");
  }

  // 10. Broad Longitudinal Health History Summary
  if (
    q.match(/\b(pattern|patterns|trend|trends|history|summarize|summary|progress|track|record|recorded|noticed|my health|health history|over time|past|previous|overall|profile|log|logged|know about me|know about my)\b/)
  ) {
    intents.add("longitudinal_summary");
  }

  // Default fallback if no specific keywords matched
  if (intents.size === 0) {
    intents.add("general_overview");
  }

  return Array.from(intents);
}

/**
 * Retrieves user health data strictly scoped by user JWT via Supabase RLS.
 * Queries ONLY the database tables relevant to the classified intents.
 */
export async function retrieveScopedHealthData(
  token: string,
  intents: string[],
  assessmentId?: string
): Promise<{
  records: UserHealthRecords;
  counts: {
    profileCount: number;
    cycleCount: number;
    symptomCount: number;
    moodCount: number;
    medicalCount: number;
    screeningCount: number;
    pregnancyCount: number;
    postpartumCount: number;
  };
}> {
  const isGreeting = intents.includes("greeting");
  const isLongitudinal = intents.includes("longitudinal_summary");
  const isGeneral = intents.includes("general_overview");

  const needCycles = !isGreeting && (intents.includes("cycles") || isLongitudinal || isGeneral);
  const needSymptoms = !isGreeting && (intents.includes("symptoms") || isLongitudinal || isGeneral);
  const needMoods = !isGreeting && (intents.includes("moods") || isLongitudinal);
  const needMedical = !isGreeting && (intents.includes("medical_records") || intents.includes("prescriptions") || intents.includes("lab_reports") || isLongitudinal || isGeneral);
  const needScreenings = !isGreeting && (intents.includes("pcos_screening") || isLongitudinal || !!assessmentId);
  const needPregnancy = !isGreeting && (intents.includes("pregnancy") || isLongitudinal);
  const needPostpartum = !isGreeting && (intents.includes("postpartum") || isLongitudinal);

  const [
    profileRes,
    cyclesRes,
    symptomsRes,
    moodsRes,
    pregRes,
    postRes,
    screeningsRes,
    recordsRes,
    specificScreeningRes,
  ] = await Promise.all([
    // Always fetch profile identity anchor (display name, mode, cycle baseline)
    supabaseRequest("/rest/v1/profiles?select=display_name,reproductive_mode,typical_cycle_length,typical_period_length,last_period_date,health_notes&limit=1", { method: "GET" }, token),
    needCycles ? supabaseRequest("/rest/v1/cycle_logs?select=period_date,end_date,flow,cramps,symptoms,notes&order=period_date.desc&limit=6", { method: "GET" }, token) : Promise.resolve(null),
    needSymptoms ? supabaseRequest("/rest/v1/symptom_logs?select=symptom,category,severity,notes,logged_at&order=logged_at.desc&limit=8", { method: "GET" }, token) : Promise.resolve(null),
    needMoods ? supabaseRequest("/rest/v1/moods?select=mood,stress,energy,sleep,logged_at&order=logged_at.desc&limit=4", { method: "GET" }, token) : Promise.resolve(null),
    needPregnancy ? supabaseRequest("/rest/v1/pregnancy_data?select=pregnancy_start_date,due_date,kick_count,last_kick_time,symptoms,notes&order=id.desc&limit=1", { method: "GET" }, token) : Promise.resolve(null),
    needPostpartum ? supabaseRequest("/rest/v1/postpartum_data?select=birth_date,bleeding_level,recovery_stage,sleep_hours,activity_level,kegel_count,notes&order=id.desc&limit=1", { method: "GET" }, token) : Promise.resolve(null),
    needScreenings ? supabaseRequest("/rest/v1/screening_sessions?select=id,screening_type,risk_level,summary_explanation,created_at&order=created_at.desc&limit=3", { method: "GET" }, token) : Promise.resolve(null),
    needMedical ? supabaseRequest("/rest/v1/medical_records?select=id,title,document_type,document_date,doctor_name,hospital_name,structured_data&order=document_date.desc&limit=5", { method: "GET" }, token) : Promise.resolve(null),
    assessmentId ? supabaseRequest(`/rest/v1/screening_sessions?id=eq.${encodeURIComponent(assessmentId)}&select=*`, { method: "GET" }, token) : Promise.resolve(null),
  ]);

  const profile = profileRes && profileRes.ok ? (await responseJson(profileRes))?.[0] : null;
  const cycles = cyclesRes && cyclesRes.ok ? (await responseJson(cyclesRes)) || [] : [];
  const symptoms = symptomsRes && symptomsRes.ok ? (await responseJson(symptomsRes)) || [] : [];
  const moods = moodsRes && moodsRes.ok ? (await responseJson(moodsRes)) || [] : [];
  const pregnancy = pregRes && pregRes.ok ? (await responseJson(pregRes))?.[0] : null;
  const postpartum = postRes && postRes.ok ? (await responseJson(postRes))?.[0] : null;
  const screenings = screeningsRes && screeningsRes.ok ? (await responseJson(screeningsRes)) || [] : [];
  const medicalRecords = recordsRes && recordsRes.ok ? (await responseJson(recordsRes)) || [] : [];
  const activeAssessment = specificScreeningRes && specificScreeningRes.ok ? (await responseJson(specificScreeningRes))?.[0] : null;

  const records: UserHealthRecords = {
    profile,
    cycles: Array.isArray(cycles) ? cycles : [],
    symptoms: Array.isArray(symptoms) ? symptoms : [],
    moods: Array.isArray(moods) ? moods : [],
    pregnancy,
    postpartum,
    screenings: Array.isArray(screenings) ? screenings : [],
    medicalRecords: Array.isArray(medicalRecords) ? medicalRecords : [],
    activeAssessment,
  };

  const counts = {
    profileCount: profile ? 1 : 0,
    cycleCount: records.cycles.length,
    symptomCount: records.symptoms.length,
    moodCount: records.moods.length,
    medicalCount: records.medicalRecords.length,
    screeningCount: records.screenings.length + (activeAssessment ? 1 : 0),
    pregnancyCount: pregnancy ? 1 : 0,
    postpartumCount: postpartum ? 1 : 0,
  };

  return { records, counts };
}

/**
 * Builds compact, prioritized, structured RAG context from retrieved health records.
 * Controls maximum token size deterministically.
 */
export function buildRAGHealthContext(
  records: UserHealthRecords,
  intents: string[],
  extractedNewDoc?: any
): {
  contextPrompt: string;
  selectedCount: number;
  discardedCount: number;
} {
  const { profile, cycles, symptoms, moods, pregnancy, postpartum, screenings, medicalRecords, activeAssessment } = records;
  const sections: string[] = [];
  let selectedCount = 0;
  let totalRetrieved = 0;

  const displayName = profile?.display_name || "Patient";
  const mode = profile?.reproductive_mode || "not-pregnant";

  // Pure Greeting: minimal context anchor
  if (intents.includes("greeting")) {
    return {
      contextPrompt: `[User Context]: Name: ${displayName}, Mode: ${mode}`,
      selectedCount: 1,
      discardedCount: 0,
    };
  }

  // Profile Header Anchor
  sections.push(`=== SITA PERSONAL HEALTH MEMORY ===`);
  sections.push(`Profile: Name: ${displayName} | Mode: ${mode}${profile?.typical_cycle_length ? ` | Typical Cycle: ${profile.typical_cycle_length}d` : ""}${profile?.last_period_date ? ` | Last Period: ${profile.last_period_date}` : ""}`);
  if (profile?.health_notes) {
    sections.push(`Notes: ${profile.health_notes.slice(0, 120)}`);
  }
  selectedCount += 1;

  // 1. Menstrual Cycle Context (Priority for cycle inquiries or longitudinal summaries)
  if (intents.includes("cycles") || intents.includes("longitudinal_summary") || (intents.includes("general_overview") && mode === "not-pregnant")) {
    totalRetrieved += cycles.length;
    if (cycles.length > 0) {
      const topCycles = cycles.slice(0, 3);
      selectedCount += topCycles.length;
      const cycleLines = topCycles.map((c, idx) => {
        const symptomsStr = Array.isArray(c.symptoms) && c.symptoms.length > 0 ? `, Symptoms: ${c.symptoms.join(", ")}` : "";
        const crampsStr = c.cramps !== undefined && c.cramps !== null ? `, Pain: ${c.cramps}/10` : "";
        const flowStr = c.flow ? `, Flow: ${c.flow}` : "";
        return `  ${idx + 1}. Start: ${c.period_date}${flowStr}${crampsStr}${symptomsStr}`;
      });
      sections.push(`\n[Recent Menstrual Cycles]:\n${cycleLines.join("\n")}`);
    } else if (intents.includes("cycles")) {
      sections.push(`\n[Recent Menstrual Cycles]: No cycle logs recorded in database.`);
    }
  }

  // 2. Pregnancy Context
  if (intents.includes("pregnancy") && pregnancy) {
    totalRetrieved += 1;
    selectedCount += 1;
    const pregLines = [`\n[Active Pregnancy Record]:`];
    if (pregnancy.due_date) pregLines.push(`- Due Date (EDD): ${pregnancy.due_date}`);
    if (pregnancy.pregnancy_start_date) pregLines.push(`- LMP: ${pregnancy.pregnancy_start_date}`);
    if (pregnancy.kick_count !== undefined) pregLines.push(`- Fetal Kicks Today: ${pregnancy.kick_count}`);
    if (Array.isArray(pregnancy.symptoms) && pregnancy.symptoms.length > 0) {
      pregLines.push(`- Symptoms: ${pregnancy.symptoms.join(", ")}`);
    }
    sections.push(pregLines.join("\n"));
  }

  // 3. Postpartum Context
  if (intents.includes("postpartum") && postpartum) {
    totalRetrieved += 1;
    selectedCount += 1;
    const postLines = [`\n[Postpartum Recovery Record]:`];
    if (postpartum.birth_date) postLines.push(`- Delivery Date: ${postpartum.birth_date}`);
    if (postpartum.bleeding_level) postLines.push(`- Bleeding Level: ${postpartum.bleeding_level}`);
    if (postpartum.recovery_stage) postLines.push(`- Recovery Stage: ${postpartum.recovery_stage}`);
    sections.push(postLines.join("\n"));
  }

  // 4. Symptoms & Mood Context
  if (intents.includes("symptoms") || intents.includes("moods") || intents.includes("longitudinal_summary")) {
    totalRetrieved += symptoms.length + moods.length;
    if (symptoms.length > 0) {
      const topSymptoms = symptoms.slice(0, 4);
      selectedCount += topSymptoms.length;
      const sympLines = topSymptoms.map((s) => `  * ${s.logged_at}: ${s.symptom} (${s.severity || "mild"})${s.notes ? ` - "${s.notes.slice(0, 50)}"` : ""}`);
      sections.push(`\n[Recent Symptoms]:\n${sympLines.join("\n")}`);
    }
    if (moods.length > 0 && (intents.includes("moods") || intents.includes("longitudinal_summary"))) {
      const topMoods = moods.slice(0, 2);
      selectedCount += topMoods.length;
      const moodLines = topMoods.map((m) => `  * ${m.logged_at}: Mood: ${m.mood}, Stress: ${m.stress}/10, Energy: ${m.energy}/10`);
      sections.push(`\n[Recent Mood & Energy]:\n${moodLines.join("\n")}`);
    }
  }

  // 5. Clinical Screenings & Assessments
  if (intents.includes("pcos_screening") || intents.includes("longitudinal_summary") || activeAssessment) {
    totalRetrieved += screenings.length + (activeAssessment ? 1 : 0);
    const screeningLines: string[] = [];
    if (activeAssessment) {
      selectedCount += 1;
      screeningLines.push(`  * [Active Assessment]: ${activeAssessment.screening_type} (Risk: ${activeAssessment.risk_level}) - ${activeAssessment.summary_explanation || "Completed"}`);
    }
    const otherScreenings = screenings.filter((s) => !activeAssessment || s.id !== activeAssessment.id).slice(0, 1);
    selectedCount += otherScreenings.length;
    otherScreenings.forEach((s) => {
      screeningLines.push(`  * ${s.created_at?.split("T")[0] || ""}: ${s.screening_type} (Risk: ${s.risk_level})`);
    });
    if (screeningLines.length > 0) {
      sections.push(`\n[Clinical Screenings]:\n${screeningLines.join("\n")}`);
    }
  }

  // 6. Medical Records (Prescriptions, Reports, Lab Biomarkers)
  if (
    intents.includes("prescriptions") ||
    intents.includes("lab_reports") ||
    intents.includes("medical_records") ||
    intents.includes("longitudinal_summary")
  ) {
    totalRetrieved += medicalRecords.length;
    if (medicalRecords.length > 0) {
      const topRecords = medicalRecords.slice(0, 2);
      selectedCount += topRecords.length;
      const recLines: string[] = [];

      topRecords.forEach((r, idx) => {
        const sData = r.structured_data || {};
        recLines.push(`  ${idx + 1}. "${r.title}" (${r.document_type || "Record"}, Date: ${r.document_date}${r.doctor_name ? `, Dr. ${r.doctor_name}` : ""}):`);

        if (sData.diagnoses && Array.isArray(sData.diagnoses) && sData.diagnoses.length > 0) {
          recLines.push(`     - Diagnoses: ${sData.diagnoses.slice(0, 3).join(", ")}`);
        }

        if (sData.medications && Array.isArray(sData.medications) && sData.medications.length > 0) {
          const meds = sData.medications.slice(0, 4).map((m: any) =>
            typeof m === "string"
              ? m
              : `${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? ` (${m.frequency})` : ""}`
          ).join("; ");
          recLines.push(`     - Medications: ${meds}`);
        } else if (sData.medicines && Array.isArray(sData.medicines) && sData.medicines.length > 0) {
          recLines.push(`     - Medications: ${sData.medicines.slice(0, 4).join(", ")}`);
        }

        if (sData.lab_results && Array.isArray(sData.lab_results) && sData.lab_results.length > 0) {
          const labs = sData.lab_results.slice(0, 5).map((l: any) =>
            `${l.test_name}: ${l.value}${l.unit ? ` ${l.unit}` : ""}${l.flag && l.flag !== "normal" ? ` [${l.flag}]` : ""}`
          ).join("; ");
          recLines.push(`     - Labs: ${labs}`);
        }

        if (sData.important_findings && Array.isArray(sData.important_findings) && sData.important_findings.length > 0) {
          recLines.push(`     - Findings: ${sData.important_findings.slice(0, 3).join("; ")}`);
        }

        if (sData.notes) {
          recLines.push(`     - Doctor Advice: ${sData.notes.slice(0, 100)}`);
        }
      });
      sections.push(`\n[Verified Medical Records]:\n${recLines.join("\n")}`);
    } else if (intents.includes("prescriptions") || intents.includes("lab_reports") || intents.includes("medical_records")) {
      sections.push(`\n[Verified Medical Records]: No saved prescriptions or lab reports found in database.`);
    }
  }

  // 7. Newly Attached Medical Document in this request
  if (extractedNewDoc) {
    selectedCount += 1;
    const s = extractedNewDoc.structured_data || {};
    const docLines = [`\n[NEWLY ATTACHED MEDICAL DOCUMENT]:`];
    docLines.push(`- Title: "${s.title || "Uploaded Document"}" (${s.document_type || "Medical Document"}, Date: ${s.document_date || "Today"})`);
    if (s.detected_language && s.detected_language !== "English") {
      docLines.push(`- Language: ${s.detected_language}`);
    }
    if (s.doctor_name) docLines.push(`- Doctor: ${s.doctor_name}`);
    if (s.medications && s.medications.length > 0) {
      docLines.push(`- Medications: ${JSON.stringify(s.medications.slice(0, 4))}`);
    }
    if (s.lab_results && s.lab_results.length > 0) {
      docLines.push(`- Lab Results: ${JSON.stringify(s.lab_results.slice(0, 5))}`);
    }
    if (s.important_findings && s.important_findings.length > 0) {
      docLines.push(`- Findings: ${s.important_findings.slice(0, 3).join("; ")}`);
    }
    if (s.notes) docLines.push(`- Doctor Notes: ${s.notes.slice(0, 120)}`);
    sections.push(docLines.join("\n"));
  }

  sections.push(`=== END PERSONAL HEALTH MEMORY ===`);

  const discardedCount = Math.max(0, totalRetrieved - selectedCount);

  return {
    contextPrompt: sections.join("\n"),
    selectedCount,
    discardedCount,
  };
}

/**
 * Main Entry Point for SITA Personal Health Memory RAG Pipeline
 * - Authenticated User Isolation
 * - Query-Aware Classification & Retrieval
 * - Relevance Filtering & Deterministic Compaction
 * - Safe Diagnostic Telemetry
 */
export async function retrievePersonalHealthMemoryRAG(
  token: string,
  userQuery: string,
  options: {
    assessmentId?: string;
    extractedDoc?: any;
  } = {}
): Promise<RAGRetrievalResult> {
  // 1. Query-Aware Intent Classification
  const intents = classifyQueryIntents(userQuery, !!options.assessmentId, !!options.extractedDoc);

  // 2. Scoped Supabase Retrieval (RLS isolated by token)
  const { records, counts } = await retrieveScopedHealthData(token, intents, options.assessmentId);

  // 3. Compact Context Construction
  const { contextPrompt, selectedCount, discardedCount } = buildRAGHealthContext(records, intents, options.extractedDoc);

  const estimatedTokens = estimateTokens(contextPrompt);
  const totalRetrievedCount =
    counts.profileCount +
    counts.cycleCount +
    counts.symptomCount +
    counts.moodCount +
    counts.medicalCount +
    counts.screeningCount +
    counts.pregnancyCount +
    counts.postpartumCount;

  // Safe Diagnostic Observability (Zero PII / Zero Private Data Logging)
  console.log(`[SITA RAG DEBUG]
User authenticated: true
Query category: ${intents.join(", ")}
Profile records retrieved: ${counts.profileCount}
Cycle records retrieved: ${counts.cycleCount}
Symptom records retrieved: ${counts.symptomCount}
Mood records retrieved: ${counts.moodCount}
Medical records retrieved: ${counts.medicalCount}
Medical documents retrieved: ${options.extractedDoc ? 1 : 0}
Records selected: ${selectedCount}
Records discarded: ${discardedCount}
Estimated context tokens: ${estimatedTokens}
Context reduction applied: ${discardedCount > 0 || estimatedTokens > 0}`);

  const relevanceSummary = `Retrieved ${selectedCount} relevant health record(s) across domains: [${intents.join(", ")}]`;

  return {
    intents,
    recordsRetrievedCount: totalRetrievedCount,
    recordsSelectedCount: selectedCount,
    recordsDiscardedCount: discardedCount,
    contextPrompt,
    relevanceSummary,
    estimatedTokens,
  };
}
