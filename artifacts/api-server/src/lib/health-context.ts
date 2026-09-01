import { responseJson, supabaseRequest } from "./supabase";

export interface RetrievedHealthContext {
  intentCategories: string[];
  relevanceSummary: string;
  contextPrompt: string;
  recordCount: number;
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
 * Classifies user prompt into relevant health domains for smart contextual retrieval
 */
export function classifyQueryIntents(queryText: string, hasAssessment = false, hasExtractedDoc = false): string[] {
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

  // Pure Greeting Check
  if (
    q.match(/^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|greetings)[\s!.,?]*$/i) ||
    q.match(/^(hello|hi|hey)\s+sita[\s!.,?]*$/i) ||
    q.match(/^give me a (short )?greeting/i)
  ) {
    intents.add("greeting");
    return Array.from(intents);
  }

  // Menstrual & Cycle Intent
  if (
    q.match(/\b(cycle|period|flow|cramp|cramps|ovulat|bleed|luteal|follicular|menstrua|late period|delayed|spotting|pms|heavy flow|pad|tampon)\b/)
  ) {
    intents.add("cycles");
    intents.add("symptoms");
  }

  // Prescription & Medication Intent
  if (
    q.match(/\b(med|medication|medicine|prescription|prescribe|dose|dosage|tablet|pill|syrup|supplement|iron|folic|metformin|progesterone|calcium|drug|pharmacy|rx|take after food)\b/)
  ) {
    intents.add("prescriptions");
    intents.add("medical_records");
  }

  // Lab Results & Investigations & Reports Intent
  if (
    q.match(/\b(lab|report|reports|test|tests|investigation|blood|hemoglobin|haemoglobin|hb|tsh|thyroid|sugar|glucose|ferritin|ultrasound|scan|beta-hcg|hcg|cbc|platelet|wbc|rbc|urine|biomarker|value|result|results)\b/)
  ) {
    intents.add("lab_reports");
    intents.add("medical_records");
  }

  // PCOS & Hormonal Screening Intent
  if (
    q.match(/\b(pcos|pcod|polycystic|androgen|hirsutism|facial hair|acne|hair thin|hair fall|rotterdam|screening|ovary|ovaries|cyst|cysts)\b/)
  ) {
    intents.add("pcos_screening");
    intents.add("cycles");
    intents.add("symptoms");
    intents.add("lab_reports");
  }

  // Symptom Triage & Urgency Intent
  if (
    q.match(/\b(triage|urgent|emergency|doctor|hospital|severe pain|fever|dizziness|faint|unbearable|danger|warning sign|red flag|should i see|pain|nausea|vomit|headache|migraine|bloat)\b/)
  ) {
    intents.add("symptoms");
    intents.add("triage_screening");
    intents.add("moods");
  }

  // Pregnancy & Antenatal Intent
  if (
    q.match(/\b(pregnan|trimester|due date|baby|fetal|fetus|kick|kicks|movement|morning sickness|gestat|obgyn|antenatal|prenatal)\b/)
  ) {
    intents.add("pregnancy");
    intents.add("symptoms");
  }

  // Postpartum & Recovery Intent
  if (
    q.match(/\b(postpartum|after birth|childbirth|delivery|lochia|postnatal|kegel|pelvic floor|recovery|breastfeed|nursing|baby blues|fourth trimester)\b/)
  ) {
    intents.add("postpartum");
    intents.add("moods");
    intents.add("symptoms");
  }

  // Longitudinal Pattern, Trends, and Holistic Health History Intent
  if (
    q.match(/\b(pattern|patterns|trend|trends|history|summarize|summary|progress|track|record|recorded|noticed|my health|health history|over time|past|previous|overall|profile|log|logged|know about me|know about my)\b/)
  ) {
    intents.add("longitudinal_summary");
  }

  // Default fallback if no specific keywords matched: general overview
  if (intents.size === 0) {
    intents.add("general_overview");
  }

  return Array.from(intents);
}

/**
 * Fetches user data securely from Supabase using authenticated user token (RLS enforced)
 * Retrieves ONLY the data necessary for the classified intents with strict token bounds.
 */
export async function retrieveUserHealthData(
  token: string,
  intents: string[],
  assessmentId?: string
): Promise<UserHealthRecords> {
  const isGreeting = intents.includes("greeting");
  const isLongitudinal = intents.includes("longitudinal_summary");
  const isGeneral = intents.includes("general_overview");

  // Domain flags
  const needCycles = !isGreeting && (intents.includes("cycles") || isLongitudinal || isGeneral);
  const needSymptoms = !isGreeting && (intents.includes("symptoms") || isLongitudinal || isGeneral);
  const needMoods = !isGreeting && (intents.includes("moods") || isLongitudinal);
  const needMedical = !isGreeting && (intents.includes("medical_records") || intents.includes("prescriptions") || intents.includes("lab_reports") || isLongitudinal || isGeneral);
  const needScreenings = !isGreeting && (intents.includes("pcos_screening") || intents.includes("triage_screening") || isLongitudinal || !!assessmentId);
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
    supabaseRequest("/rest/v1/profiles?select=display_name,reproductive_mode,typical_cycle_length,typical_period_length,last_period_date,health_notes&limit=1", { method: "GET" }, token),
    needCycles ? supabaseRequest("/rest/v1/cycle_logs?select=period_date,end_date,flow,cramps,symptoms,notes&order=period_date.desc&limit=4", { method: "GET" }, token) : Promise.resolve(null),
    needSymptoms ? supabaseRequest("/rest/v1/symptom_logs?select=symptom,category,severity,notes,logged_at&order=logged_at.desc&limit=6", { method: "GET" }, token) : Promise.resolve(null),
    needMoods ? supabaseRequest("/rest/v1/moods?select=mood,stress,energy,sleep,logged_at&order=logged_at.desc&limit=3", { method: "GET" }, token) : Promise.resolve(null),
    needPregnancy ? supabaseRequest("/rest/v1/pregnancy_data?select=pregnancy_start_date,due_date,kick_count,last_kick_time,symptoms,notes&order=id.desc&limit=1", { method: "GET" }, token) : Promise.resolve(null),
    needPostpartum ? supabaseRequest("/rest/v1/postpartum_data?select=birth_date,bleeding_level,recovery_stage,sleep_hours,activity_level,kegel_count,notes&order=id.desc&limit=1", { method: "GET" }, token) : Promise.resolve(null),
    needScreenings ? supabaseRequest("/rest/v1/screening_sessions?select=id,screening_type,risk_level,summary_explanation,created_at&order=created_at.desc&limit=2", { method: "GET" }, token) : Promise.resolve(null),
    needMedical ? supabaseRequest("/rest/v1/medical_records?select=id,title,document_type,document_date,doctor_name,hospital_name,structured_data&order=document_date.desc&limit=3", { method: "GET" }, token) : Promise.resolve(null),
    assessmentId ? supabaseRequest(`/rest/v1/screening_sessions?id=eq.${encodeURIComponent(assessmentId)}&select=*`, { method: "GET" }, token) : Promise.resolve(null),
  ]);

  const profile = profileRes.ok ? (await responseJson(profileRes))?.[0] : null;
  const cycles = cyclesRes && cyclesRes.ok ? await responseJson(cyclesRes) : [];
  const symptoms = symptomsRes && symptomsRes.ok ? await responseJson(symptomsRes) : [];
  const moods = moodsRes && moodsRes.ok ? await responseJson(moodsRes) : [];
  const pregnancy = pregRes && pregRes.ok ? (await responseJson(pregRes))?.[0] : null;
  const postpartum = postRes && postRes.ok ? (await responseJson(postRes))?.[0] : null;
  const screenings = screeningsRes && screeningsRes.ok ? await responseJson(screeningsRes) : [];
  const medicalRecords = recordsRes && recordsRes.ok ? await responseJson(recordsRes) : [];
  const activeAssessment = specificScreeningRes && specificScreeningRes.ok ? (await responseJson(specificScreeningRes))?.[0] : null;

  return {
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
}

/**
 * Builds compact, token-efficient, prioritized personal health context
 */
export function buildPersonalHealthContext(
  records: UserHealthRecords,
  intents: string[],
  extractedNewDoc?: any
): RetrievedHealthContext {
  const { profile, cycles, symptoms, moods, pregnancy, postpartum, screenings, medicalRecords, activeAssessment } = records;
  const lines: string[] = [];
  let recordCount = 0;

  const displayName = profile?.display_name || "Patient";
  const mode = profile?.reproductive_mode || "not-pregnant";

  // For pure greetings, only provide identity anchor
  if (intents.includes("greeting")) {
    lines.push(`[User Context]: Name: ${displayName}, Mode: ${mode}`);
    return {
      intentCategories: intents,
      relevanceSummary: `Greeting context for ${displayName}`,
      contextPrompt: lines.join("\n"),
      recordCount: 0,
    };
  }

  lines.push(`=== SITA PERSONAL HEALTH MEMORY ===`);
  lines.push(`Profile: Name: ${displayName} | Mode: ${mode}${profile?.typical_cycle_length ? ` | Cycle Baseline: ${profile.typical_cycle_length}d` : ""}${profile?.last_period_date ? ` | Last Period: ${profile.last_period_date}` : ""}`);
  if (profile?.health_notes) {
    lines.push(`Notes: ${profile.health_notes.slice(0, 150)}`);
  }

  // 1. Menstrual & Cycle Memory
  if (intents.includes("cycles") || intents.includes("longitudinal_summary") || (intents.includes("general_overview") && mode === "not-pregnant")) {
    if (cycles.length > 0) {
      recordCount += cycles.length;
      lines.push(`\n[Recent Cycles]:`);
      cycles.slice(0, 3).forEach((c, idx) => {
        const symptomsStr = Array.isArray(c.symptoms) && c.symptoms.length > 0 ? `, Symptoms: ${c.symptoms.join(", ")}` : "";
        const crampsStr = c.cramps !== undefined && c.cramps !== null ? `, Pain: ${c.cramps}/10` : "";
        const flowStr = c.flow ? `, Flow: ${c.flow}` : "";
        lines.push(`  ${idx + 1}. Start: ${c.period_date}${flowStr}${crampsStr}${symptomsStr}`);
      });
    } else if (intents.includes("cycles")) {
      lines.push(`\n[Recent Cycles]: No cycle logs recorded in database.`);
    }
  }

  // 2. Pregnancy Memory
  if (intents.includes("pregnancy") && pregnancy) {
    recordCount += 1;
    lines.push(`\n[Active Pregnancy]:`);
    if (pregnancy.due_date) lines.push(`- EDD: ${pregnancy.due_date}`);
    if (pregnancy.kick_count !== undefined) lines.push(`- Today's Kicks: ${pregnancy.kick_count}`);
    if (Array.isArray(pregnancy.symptoms) && pregnancy.symptoms.length > 0) {
      lines.push(`- Symptoms: ${pregnancy.symptoms.join(", ")}`);
    }
  }

  // 3. Postpartum Memory
  if (intents.includes("postpartum") && postpartum) {
    recordCount += 1;
    lines.push(`\n[Postpartum Recovery]:`);
    if (postpartum.birth_date) lines.push(`- Delivery Date: ${postpartum.birth_date}`);
    if (postpartum.bleeding_level) lines.push(`- Bleeding Level: ${postpartum.bleeding_level}`);
    if (postpartum.recovery_stage) lines.push(`- Stage: ${postpartum.recovery_stage}`);
  }

  // 4. Symptoms & Mood Logs
  if (intents.includes("symptoms") || intents.includes("moods") || intents.includes("longitudinal_summary")) {
    if (symptoms.length > 0) {
      recordCount += symptoms.length;
      lines.push(`\n[Recent Symptoms]:`);
      symptoms.slice(0, 4).forEach((s) => {
        lines.push(`  * ${s.logged_at}: ${s.symptom} (${s.severity || "mild"})${s.notes ? ` - "${s.notes.slice(0, 60)}"` : ""}`);
      });
    }
    if (moods.length > 0 && (intents.includes("moods") || intents.includes("longitudinal_summary"))) {
      recordCount += moods.length;
      lines.push(`\n[Recent Mood/Energy]:`);
      moods.slice(0, 2).forEach((m) => {
        lines.push(`  * ${m.logged_at}: Mood: ${m.mood}, Stress: ${m.stress}/10, Energy: ${m.energy}/10`);
      });
    }
  }

  // 5. Clinical Assessments & Screenings
  if (intents.includes("pcos_screening") || intents.includes("triage_screening") || intents.includes("longitudinal_summary") || activeAssessment) {
    if (screenings.length > 0 || activeAssessment) {
      lines.push(`\n[Assessments]:`);
      if (activeAssessment) {
        recordCount += 1;
        lines.push(`  * [Active]: ${activeAssessment.screening_type} (Risk: ${activeAssessment.risk_level}) - ${activeAssessment.summary_explanation || "Completed"}`);
      }
      screenings.filter((s) => !activeAssessment || s.id !== activeAssessment.id).slice(0, 1).forEach((s) => {
        recordCount += 1;
        lines.push(`  * ${s.created_at?.split("T")[0] || ""}: ${s.screening_type} (Risk: ${s.risk_level})`);
      });
    }
  }

  // 6. Longitudinal Medical Records (Prescriptions, Lab Reports, Ultrasound, Doctor Notes)
  if (
    intents.includes("prescriptions") ||
    intents.includes("lab_reports") ||
    intents.includes("medical_records") ||
    intents.includes("longitudinal_summary")
  ) {
    if (medicalRecords.length > 0) {
      recordCount += medicalRecords.length;
      lines.push(`\n[Verified Medical Records]:`);
      medicalRecords.slice(0, 2).forEach((r, idx) => {
        const sData = r.structured_data || {};
        lines.push(`  ${idx + 1}. "${r.title}" (${r.document_type || "Record"}, Date: ${r.document_date}${r.doctor_name ? `, Dr. ${r.doctor_name}` : ""}):`);

        if (sData.diagnoses && Array.isArray(sData.diagnoses) && sData.diagnoses.length > 0) {
          lines.push(`     - Diagnoses: ${sData.diagnoses.slice(0, 3).join(", ")}`);
        }

        if (sData.medications && Array.isArray(sData.medications) && sData.medications.length > 0) {
          const meds = sData.medications.slice(0, 4).map((m: any) =>
            typeof m === "string"
              ? m
              : `${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? ` (${m.frequency})` : ""}`
          ).join("; ");
          lines.push(`     - Medications: ${meds}`);
        } else if (sData.medicines && Array.isArray(sData.medicines) && sData.medicines.length > 0) {
          lines.push(`     - Medications: ${sData.medicines.slice(0, 4).join(", ")}`);
        }

        if (sData.lab_results && Array.isArray(sData.lab_results) && sData.lab_results.length > 0) {
          const labs = sData.lab_results.slice(0, 5).map((l: any) =>
            `${l.test_name}: ${l.value}${l.unit ? ` ${l.unit}` : ""}${l.flag && l.flag !== "normal" ? ` [${l.flag}]` : ""}`
          ).join("; ");
          lines.push(`     - Labs: ${labs}`);
        }

        if (sData.important_findings && Array.isArray(sData.important_findings) && sData.important_findings.length > 0) {
          lines.push(`     - Findings: ${sData.important_findings.slice(0, 3).join("; ")}`);
        }

        if (sData.notes) {
          lines.push(`     - Advice: ${sData.notes.slice(0, 120)}`);
        }
      });
    } else if (intents.includes("prescriptions") || intents.includes("lab_reports") || intents.includes("medical_records")) {
      lines.push(`\n[Verified Medical Records]: No saved prescriptions or lab reports found.`);
    }
  }

  // 7. Newly Attached Extracted Document (If currently being processed in this message)
  if (extractedNewDoc) {
    const s = extractedNewDoc.structured_data || {};
    lines.push(`\n[NEWLY ATTACHED MEDICAL DOCUMENT]:`);
    lines.push(`- Title: "${s.title || "Uploaded Document"}" (${s.document_type || "Medical Document"}, Date: ${s.document_date || "Today"})`);
    if (s.detected_language && s.detected_language !== "English") {
      lines.push(`- Language: ${s.detected_language}`);
    }
    if (s.doctor_name) lines.push(`- Doctor: ${s.doctor_name}`);
    if (s.medications && s.medications.length > 0) {
      lines.push(`- Medications: ${JSON.stringify(s.medications.slice(0, 5))}`);
    }
    if (s.lab_results && s.lab_results.length > 0) {
      lines.push(`- Lab Results: ${JSON.stringify(s.lab_results.slice(0, 5))}`);
    }
    if (s.important_findings && s.important_findings.length > 0) {
      lines.push(`- Findings: ${s.important_findings.slice(0, 3).join("; ")}`);
    }
    if (s.notes) lines.push(`- Doctor Notes: ${s.notes.slice(0, 150)}`);
  }

  lines.push(`=== END PERSONAL HEALTH MEMORY ===`);

  const relevanceSummary = `Retrieved ${recordCount} user record(s) across domains: ${intents.join(", ")}`;

  return {
    intentCategories: intents,
    relevanceSummary,
    contextPrompt: lines.join("\n"),
    recordCount,
  };
}
