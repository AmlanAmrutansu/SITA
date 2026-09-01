import { Router, type Request } from "express";
import { generateSitaResponse, extractStructuredMedicalDocument, type StructuredMedicalRecord, type StructuredMedication, type StructuredLabResult } from "../lib/ai-service";
import { responseJson, supabaseRequest } from "../lib/supabase";

const router = Router();

const access = (req: Request) =>
  (req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : req.cookies?.sita_access_token) as string | undefined;

async function getAuthenticatedUser(token: string) {
  const userResponse = await supabaseRequest("/auth/v1/user", { method: "GET" }, token);
  if (!userResponse.ok) return null;
  return responseJson(userResponse);
}

export type { StructuredMedication, StructuredLabResult, StructuredMedicalRecord };

export interface MedicalRecordComparison {
  targetRecordTitle: string;
  targetRecordDate: string;
  previousRecordTitle?: string;
  previousRecordDate?: string;
  hasPreviousComparison: boolean;
  medicationChanges: {
    added: StructuredMedication[];
    removed: StructuredMedication[];
    dosageChanged: {
      name: string;
      previousDosage?: string;
      currentDosage?: string;
      previousFrequency?: string;
      currentFrequency?: string;
      note?: string;
    }[];
    unchanged: StructuredMedication[];
  };
  labChanges: {
    test_name: string;
    previous_value: string;
    current_value: string;
    previous_numeric?: number | null;
    current_numeric?: number | null;
    delta?: number | null;
    unit?: string;
    reference_range?: string;
    trend: "increased" | "decreased" | "stable" | "changed";
    clinical_note?: string;
  }[];
  newDiagnoses: string[];
  newFindings: string[];
  symptomUpdates: {
    newSymptoms: string[];
    resolvedSymptoms: string[];
  };
  neutralSummary: string;
  askSitaPrompt: string;
}

// Comparison Engine Utility
export function compareMedicalRecords(
  current: { id?: string; title: string; document_date: string; document_type: string; structured_data: StructuredMedicalRecord },
  history: Array<{ id?: string; title: string; document_date: string; document_type: string; structured_data: StructuredMedicalRecord }>
): MedicalRecordComparison {
  const currData = current.structured_data || ({} as StructuredMedicalRecord);
  const currMeds = currData.medications || [];
  const currLabs = currData.lab_results || [];
  const currDiagnoses = currData.diagnoses || [];
  const currFindings = currData.important_findings || [];
  const currSymptoms = currData.symptoms || [];

  // Filter history: records strictly earlier than current or other records
  const priorRecords = history.filter(
    (h) => (!current.id || h.id !== current.id) && new Date(h.document_date).getTime() <= new Date(current.document_date).getTime()
  );

  const prevRecord = priorRecords[0]; // Most recent previous record

  if (!prevRecord) {
    return {
      targetRecordTitle: current.title || "Latest Medical Record",
      targetRecordDate: current.document_date,
      hasPreviousComparison: false,
      medicationChanges: {
        added: currMeds,
        removed: [],
        dosageChanged: [],
        unchanged: [],
      },
      labChanges: currLabs.map((l) => ({
        test_name: l.test_name,
        previous_value: "N/A",
        current_value: l.value,
        previous_numeric: null,
        current_numeric: l.numeric_value ?? null,
        delta: null,
        unit: l.unit || "",
        reference_range: l.reference_range,
        trend: "changed",
        clinical_note: "Initial documented baseline value in SITA Health Memory.",
      })),
      newDiagnoses: currDiagnoses,
      newFindings: currFindings,
      symptomUpdates: {
        newSymptoms: currSymptoms,
        resolvedSymptoms: [],
      },
      neutralSummary: `This is your first documented record of this type in SITA Health Memory (${current.document_type} on ${current.document_date}). As you add future prescriptions and lab reports, SITA will automatically track and explain changes.`,
      askSitaPrompt: `Could you explain the findings and medications documented in my ${current.document_type} from ${current.document_date}?`,
    };
  }

  const prevData = prevRecord.structured_data || ({} as StructuredMedicalRecord);
  const prevMeds = prevData.medications || [];
  const prevLabs = prevData.lab_results || [];
  const prevDiagnoses = prevData.diagnoses || [];
  const prevFindings = prevData.important_findings || [];
  const prevSymptoms = prevData.symptoms || [];

  // 1. Medication Diffing
  const addedMeds: StructuredMedication[] = [];
  const dosageChangedMeds: MedicalRecordComparison["medicationChanges"]["dosageChanged"] = [];
  const unchangedMeds: StructuredMedication[] = [];

  for (const cMed of currMeds) {
    const pMed = prevMeds.find((p) => p.name.toLowerCase().trim() === cMed.name.toLowerCase().trim());
    if (!pMed) {
      addedMeds.push(cMed);
    } else {
      const dosageDiff = (pMed.dosage || "").trim() !== (cMed.dosage || "").trim();
      const freqDiff = (pMed.frequency || "").trim() !== (cMed.frequency || "").trim();
      if (dosageDiff || freqDiff) {
        dosageChangedMeds.push({
          name: cMed.name,
          previousDosage: pMed.dosage,
          currentDosage: cMed.dosage,
          previousFrequency: pMed.frequency,
          currentFrequency: cMed.frequency,
          note: dosageDiff && freqDiff ? "Dosage and frequency updated" : dosageDiff ? "Dosage changed" : "Frequency updated",
        });
      } else {
        unchangedMeds.push(cMed);
      }
    }
  }

  const removedMeds: StructuredMedication[] = prevMeds.filter(
    (pMed) => !currMeds.some((cMed) => cMed.name.toLowerCase().trim() === pMed.name.toLowerCase().trim())
  );

  // 2. Lab Results Diffing
  const labChanges: MedicalRecordComparison["labChanges"] = [];
  for (const cLab of currLabs) {
    const pLab = prevLabs.find(
      (p) => p.test_name.toLowerCase().trim() === cLab.test_name.toLowerCase().trim()
    );

    if (pLab) {
      const pNum = typeof pLab.numeric_value === "number" ? pLab.numeric_value : parseFloat(pLab.value.replace(/[^0-9.-]/g, ""));
      const cNum = typeof cLab.numeric_value === "number" ? cLab.numeric_value : parseFloat(cLab.value.replace(/[^0-9.-]/g, ""));
      const hasNumbers = !isNaN(pNum) && !isNaN(cNum);
      const delta = hasNumbers ? Math.round((cNum - pNum) * 100) / 100 : null;

      let trend: "increased" | "decreased" | "stable" | "changed" = "changed";
      if (hasNumbers) {
        if (delta! > 0) trend = "increased";
        else if (delta! < 0) trend = "decreased";
        else trend = "stable";
      }

      labChanges.push({
        test_name: cLab.test_name,
        previous_value: pLab.value,
        current_value: cLab.value,
        previous_numeric: hasNumbers ? pNum : null,
        current_numeric: hasNumbers ? cNum : null,
        delta,
        unit: cLab.unit || pLab.unit || "",
        reference_range: cLab.reference_range || pLab.reference_range,
        trend,
        clinical_note: delta !== null
          ? `${cLab.test_name} shifted from ${pLab.value} to ${cLab.value} (change: ${delta > 0 ? "+" : ""}${delta} ${cLab.unit || ""}).`
          : `${cLab.test_name} updated from "${pLab.value}" to "${cLab.value}".`,
      });
    } else {
      labChanges.push({
        test_name: cLab.test_name,
        previous_value: "Not measured in previous record",
        current_value: cLab.value,
        previous_numeric: null,
        current_numeric: typeof cLab.numeric_value === "number" ? cLab.numeric_value : null,
        delta: null,
        unit: cLab.unit || "",
        reference_range: cLab.reference_range,
        trend: "changed",
        clinical_note: `New test result documented on ${current.document_date}.`,
      });
    }
  }

  // 3. Diagnoses & Findings
  const newDiagnoses = currDiagnoses.filter(
    (cd) => !prevDiagnoses.some((pd) => pd.toLowerCase().trim() === cd.toLowerCase().trim())
  );
  const newFindings = currFindings.filter(
    (cf) => !prevFindings.some((pf) => pf.toLowerCase().trim() === cf.toLowerCase().trim())
  );

  // 4. Symptoms
  const newSymptoms = currSymptoms.filter(
    (cs) => !prevSymptoms.some((ps) => ps.toLowerCase().trim() === cs.toLowerCase().trim())
  );
  const resolvedSymptoms = prevSymptoms.filter(
    (ps) => !currSymptoms.some((cs) => cs.toLowerCase().trim() === ps.toLowerCase().trim())
  );

  // 5. Construct Neutral Reassuring Clinical Summary
  const summaryParts: string[] = [];
  summaryParts.push(`Comparison between ${prevRecord.title} (${prevRecord.document_date}) and ${current.title} (${current.document_date}):`);

  if (addedMeds.length > 0) {
    summaryParts.push(`• New medications started: ${addedMeds.map((m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ""}`).join(", ")}.`);
  }
  if (dosageChangedMeds.length > 0) {
    summaryParts.push(`• Medication adjustments: ${dosageChangedMeds.map((d) => `${d.name} (${d.previousDosage || "prior dose"} → ${d.currentDosage || "new dose"})`).join(", ")}.`);
  }
  if (removedMeds.length > 0) {
    summaryParts.push(`• Medications discontinued or completed: ${removedMeds.map((m) => m.name).join(", ")}.`);
  }
  if (labChanges.length > 0) {
    const notableLabs = labChanges.filter((l) => l.delta !== null && l.delta !== 0);
    if (notableLabs.length > 0) {
      summaryParts.push(`• Lab trends: ${notableLabs.map((l) => `${l.test_name} ${l.previous_value} → ${l.current_value} (${l.delta! > 0 ? "+" : ""}${l.delta} ${l.unit})`).join("; ")}.`);
    }
  }
  if (newFindings.length > 0) {
    summaryParts.push(`• Key clinical findings: ${newFindings.join("; ")}.`);
  }

  const neutralSummary = summaryParts.join("\n");

  // Construct Ask SITA Prompt
  const askSitaPrompt = `I noticed some changes in my latest medical record (${current.title} on ${current.document_date}) compared to my previous record (${prevRecord.document_date}). ${
    dosageChangedMeds.length > 0
      ? `My dosage for ${dosageChangedMeds[0].name} was updated. `
      : addedMeds.length > 0
      ? `A new medication ${addedMeds[0].name} was added. `
      : labChanges.length > 0 && labChanges[0].delta !== null
      ? `My ${labChanges[0].test_name} changed from ${labChanges[0].previous_value} to ${labChanges[0].current_value}. `
      : ""
  }Could you explain what these changes typically mean in the context of my women's health journey and what questions I might bring to my doctor?`;

  return {
    targetRecordTitle: current.title || "Latest Medical Record",
    targetRecordDate: current.document_date,
    previousRecordTitle: prevRecord.title,
    previousRecordDate: prevRecord.document_date,
    hasPreviousComparison: true,
    medicationChanges: {
      added: addedMeds,
      removed: removedMeds,
      dosageChanged: dosageChangedMeds,
      unchanged: unchangedMeds,
    },
    labChanges,
    newDiagnoses,
    newFindings,
    symptomUpdates: {
      newSymptoms,
      resolvedSymptoms,
    },
    neutralSummary,
    askSitaPrompt,
  };
}

// 1. Multimodal / OCR + Groq Structured Medical Extraction Endpoint
router.post("/extract-medical-record", async (req: Request, res: any): Promise<void> => {
  try {
    const { imageBase64, rawText, documentTypeHint } = req.body;
    const text = rawText ? String(rawText).trim() : "";

    if (!text && !imageBase64) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Please provide a medical document image or document text to analyze.",
      });
    }

    const { extracted_text, structured_data } = await extractStructuredMedicalDocument(
      imageBase64,
      text,
      documentTypeHint
    );

    res.json({
      success: true,
      extracted_text,
      structured_data,
    });
  } catch (error: any) {
    console.error("[Extraction error]:", error);
    const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");
    const isModelUnavailable = error?.message?.includes("AI_MODEL_UNAVAILABLE");

    if (isConfigError) {
      res.status(503).json({
        success: false,
        code: "AI_PROVIDER_NOT_CONFIGURED",
        message: "GROQ_API_KEY is not configured.",
      });
    } else if (isModelUnavailable) {
      res.status(503).json({
        success: false,
        code: "AI_MODEL_UNAVAILABLE",
        message: "The AI model is currently unavailable. Please try again later.",
      });
    } else {
      res.status(500).json({
        success: false,
        code: "DOCUMENT_PROCESSING_ERROR",
        message: "An error occurred while analyzing the medical document.",
      });
    }
  }
});

// 2. Compare Records Endpoint
router.post("/medical-records/compare", async (req: Request, res: any): Promise<void> => {
  try {
    const { currentRecord, previousRecords } = req.body;
    if (!currentRecord) {
      return res.status(400).json({ message: "currentRecord is required for comparison." });
    }

    const comparison = compareMedicalRecords(currentRecord, previousRecords || []);
    res.json({ success: true, comparison });
  } catch (err: any) {
    console.error("[Record Comparison Error]:", err);
    res.status(500).json({ success: false, message: "Could not compare medical records." });
  }
});

// 3. Generate Patient-Controlled Doctor Summary
router.post("/medical-records/doctor-summary", async (req: Request, res: any): Promise<void> => {
  try {
    const token = access(req);
    if (!token) {
      return res.status(401).json({ message: "Please sign in to generate a doctor summary." });
    }

    const user = await getAuthenticatedUser(token);
    if (!user?.id) {
      return res.status(401).json({ message: "Your session has expired." });
    }

    // Fetch all user longitudinal records from Supabase
    const [profileRes, recordsRes, cyclesRes, symptomsRes, pregRes, postRes, screeningRes] = await Promise.all([
      supabaseRequest("/rest/v1/profiles?select=*&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/medical_records?select=*&order=document_date.desc&limit=20", { method: "GET" }, token),
      supabaseRequest("/rest/v1/cycle_logs?select=period_date,flow,cramps,symptoms&order=period_date.desc&limit=10", { method: "GET" }, token),
      supabaseRequest("/rest/v1/symptom_logs?select=symptom,category,severity,logged_at&order=logged_at.desc&limit=20", { method: "GET" }, token),
      supabaseRequest("/rest/v1/pregnancy_data?select=*&order=id.desc&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/postpartum_data?select=*&order=id.desc&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/screening_sessions?select=screening_type,risk_level,summary_explanation,created_at&order=created_at.desc&limit=5", { method: "GET" }, token),
    ]);

    const profile = profileRes.ok ? (await responseJson(profileRes))?.[0] : null;
    const documents = recordsRes.ok ? await responseJson(recordsRes) : [];
    const cycles = cyclesRes.ok ? await responseJson(cyclesRes) : [];
    const symptoms = symptomsRes.ok ? await responseJson(symptomsRes) : [];
    const preg = pregRes.ok ? (await responseJson(pregRes))?.[0] : null;
    const post = postRes.ok ? (await responseJson(postRes))?.[0] : null;
    const screenings = screeningRes.ok ? await responseJson(screeningRes) : [];

    // Compile active medications from recent verified documents
    const activeMedicationsMap = new Map<string, StructuredMedication>();
    documents.forEach((doc: any) => {
      const meds: StructuredMedication[] = doc.structured_data?.medications || [];
      meds.forEach((m) => {
        if (m.name && !activeMedicationsMap.has(m.name.toLowerCase().trim())) {
          activeMedicationsMap.set(m.name.toLowerCase().trim(), m);
        }
      });
    });

    // Compile key lab trends
    const labTrendsMap = new Map<string, { latest: StructuredLabResult; previous?: StructuredLabResult }>();
    documents.forEach((doc: any) => {
      const labs: StructuredLabResult[] = doc.structured_data?.lab_results || [];
      labs.forEach((l) => {
        const key = l.test_name.toLowerCase().trim();
        if (!labTrendsMap.has(key)) {
          labTrendsMap.set(key, { latest: { ...l, recorded_at: doc.document_date } });
        } else if (!labTrendsMap.get(key)!.previous) {
          labTrendsMap.get(key)!.previous = { ...l, recorded_at: doc.document_date };
        }
      });
    });

    // Aggregate symptom frequency
    const symptomFrequency: Record<string, { count: number; lastLogged: string; severities: string[] }> = {};
    symptoms.forEach((s: any) => {
      if (!symptomFrequency[s.symptom]) {
        symptomFrequency[s.symptom] = { count: 1, lastLogged: s.logged_at, severities: [s.severity || "mild"] };
      } else {
        symptomFrequency[s.symptom].count++;
        symptomFrequency[s.symptom].severities.push(s.severity || "mild");
      }
    });

    const summaryReport = {
      generatedAt: new Date().toISOString(),
      patientName: profile?.display_name || "Patient",
      reproductiveMode: profile?.reproductive_mode || "not-pregnant",
      reproductiveSummary:
        profile?.reproductive_mode === "pregnant"
          ? `Pregnant (Due date: ${preg?.due_date || "Unspecified"}, Gestational logs active)`
          : profile?.reproductive_mode === "postpartum"
          ? `Postpartum (Childbirth date: ${post?.birth_date || "Unspecified"}, Recovery stage: ${post?.recovery_stage || "active"})`
          : `Not pregnant (Cycle length: ${profile?.typical_cycle_length || 28}d, Period length: ${profile?.typical_period_length || 5}d, Last period: ${profile?.last_period_date || "noted in logs"})`,
      activeMedications: Array.from(activeMedicationsMap.values()),
      recentDiagnoses: Array.from(
        new Set(
          documents.flatMap((d: any) => d.structured_data?.diagnoses || [])
        )
      ),
      recentUltrasoundAndFindings: documents
        .filter((d: any) => d.document_type?.includes("Ultrasound") || (d.structured_data?.important_findings || []).length > 0)
        .map((d: any) => ({
          documentTitle: d.title,
          documentDate: d.document_date,
          findings: d.structured_data?.important_findings || [],
        })),
      labTrends: Array.from(labTrendsMap.entries()).map(([testName, trend]) => ({
        testName,
        latestValue: trend.latest.value,
        latestUnit: trend.latest.unit,
        latestDate: trend.latest.recorded_at,
        previousValue: trend.previous?.value,
        previousDate: trend.previous?.recorded_at,
        referenceRange: trend.latest.reference_range,
      })),
      topSymptomsPast90Days: Object.entries(symptomFrequency)
        .map(([name, data]) => ({
          symptom: name,
          loggedCount: data.count,
          lastLogged: data.lastLogged,
          predominantSeverity: data.severities[0],
        }))
        .sort((a, b) => b.loggedCount - a.loggedCount)
        .slice(0, 8),
      recentAssessments: screenings.map((s: any) => ({
        type: s.screening_type,
        riskLevel: s.risk_level,
        summary: s.summary_explanation,
        date: s.created_at,
      })),
      totalDocumentsInHealthMemory: documents.length,
      disclaimer: "This patient-generated clinical brief was synthesized from patient-verified medical records, cycle logs, and symptom tracking in SITA Health for informed discussion with a licensed healthcare provider.",
    };

    res.json({ success: true, summaryReport });
  } catch (err: any) {
    console.error("[Doctor Summary Error]:", err);
    res.status(500).json({ success: false, message: "Could not generate doctor summary." });
  }
});

export default router;
