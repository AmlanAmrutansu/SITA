import { Router, type Request, type Response } from "express";
import { responseJson, supabaseRequest } from "../lib/supabase";
import {
  generatePersonalizedRecommendations,
  type RecommendationInteraction,
  type RecommendationEngineResult,
} from "../lib/recommendations/recommendation-engine";

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

// Helper to safely parse interactions from a notes column
function parseStoredInteractions(notesField: unknown): RecommendationInteraction[] {
  if (typeof notesField !== "string" || !notesField.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(notesField);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && Array.isArray(parsed.recommendation_interactions)) {
      return parsed.recommendation_interactions;
    }
    if (parsed && Array.isArray(parsed.interactions)) {
      return parsed.interactions;
    }
  } catch {
    // If notes contains user text, look for our structured marker
    const markerIndex = notesField.indexOf("/*SITA_RECS_JSON*/");
    if (markerIndex !== -1) {
      try {
        const jsonStr = notesField.substring(markerIndex + "/*SITA_RECS_JSON*/".length);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore parse error
      }
    }
  }
  return [];
}

// Helper to serialize interactions safely into a notes column preserving any user text
function serializeStoredInteractions(originalNotes: unknown, interactions: RecommendationInteraction[]): string {
  let userText = "";
  if (typeof originalNotes === "string" && originalNotes.trim()) {
    try {
      const parsed = JSON.parse(originalNotes);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        userText = parsed.user_notes || "";
      }
    } catch {
      const markerIndex = originalNotes.indexOf("/*SITA_RECS_JSON*/");
      if (markerIndex !== -1) {
        userText = originalNotes.substring(0, markerIndex).trim();
      } else {
        userText = originalNotes.trim();
      }
    }
  }

  // Store in compact, valid JSON object format
  return JSON.stringify({
    user_notes: userText,
    recommendation_interactions: interactions,
    updated_at: new Date().toISOString(),
  });
}

/**
 * GET /api/recommendations/pregnancy
 * Returns personalized deterministic nutrition & activity recommendations for Pregnancy
 */
router.get("/recommendations/pregnancy", async (req: Request, res: Response) => {
  const token = access(req);
  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    return res.status(401).json({ error: "Invalid user session" });
  }

  try {
    // Fetch pregnancy data and medical records in parallel
    const [pregRes, recordsRes, docsRes] = await Promise.all([
      supabaseRequest("/rest/v1/pregnancy_data?select=*&order=id.desc&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/medical_records?select=*&order=document_date.desc&limit=25", { method: "GET" }, token),
      supabaseRequest("/rest/v1/medical_documents?select=*&order=document_date.desc&limit=25", { method: "GET" }, token),
    ]);

    const pregRows = pregRes.ok ? await responseJson(pregRes) : [];
    const pregData = Array.isArray(pregRows) && pregRows.length > 0 ? pregRows[0] : null;

    const medRecords = recordsRes.ok ? (await responseJson(recordsRes)) || [] : [];
    const medDocs = docsRes.ok ? (await responseJson(docsRes)) || [] : [];
    const allRecords = [...(Array.isArray(medRecords) ? medRecords : []), ...(Array.isArray(medDocs) ? medDocs : [])];

    // Calculate gestational week
    let stageWeek = 20; // Default reasonable mid-gestational week
    if (pregData?.due_date) {
      const due = new Date(pregData.due_date);
      const now = new Date();
      const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const remainingWeeks = Math.max(0, Math.floor(diffDays / 7));
      stageWeek = Math.max(1, Math.min(42, 40 - remainingWeeks));
    } else if (pregData?.pregnancy_start_date) {
      const start = new Date(pregData.pregnancy_start_date);
      const now = new Date();
      const diffDays = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      stageWeek = Math.max(1, Math.min(42, Math.floor(diffDays / 7) + 1));
    }

    const existingInteractions = parseStoredInteractions(pregData?.notes);

    const result = generatePersonalizedRecommendations({
      mode: "pregnancy",
      stageWeek,
      medicalRecords: allRecords,
      existingInteractions,
    });

    return res.json(result);
  } catch (error: any) {
    console.error("[Recommendations] Error generating pregnancy recommendations:", error);
    // Graceful fallback to avoid dashboard disruption
    const fallback = generatePersonalizedRecommendations({
      mode: "pregnancy",
      stageWeek: 20,
      medicalRecords: [],
      existingInteractions: [],
    });
    return res.json(fallback);
  }
});

/**
 * GET /api/recommendations/postpartum
 * Returns personalized deterministic nutrition & activity recommendations for Postpartum
 */
router.get("/recommendations/postpartum", async (req: Request, res: Response) => {
  const token = access(req);
  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    return res.status(401).json({ error: "Invalid user session" });
  }

  try {
    const [postRes, recordsRes, docsRes] = await Promise.all([
      supabaseRequest("/rest/v1/postpartum_data?select=*&order=id.desc&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/medical_records?select=*&order=document_date.desc&limit=25", { method: "GET" }, token),
      supabaseRequest("/rest/v1/medical_documents?select=*&order=document_date.desc&limit=25", { method: "GET" }, token),
    ]);

    const postRows = postRes.ok ? await responseJson(postRes) : [];
    const postData = Array.isArray(postRows) && postRows.length > 0 ? postRows[0] : null;

    const medRecords = recordsRes.ok ? (await responseJson(recordsRes)) || [] : [];
    const medDocs = docsRes.ok ? (await responseJson(docsRes)) || [] : [];
    const allRecords = [...(Array.isArray(medRecords) ? medRecords : []), ...(Array.isArray(medDocs) ? medDocs : [])];

    // Calculate postpartum week
    let stageWeek = 4;
    if (postData?.birth_date) {
      const birth = new Date(postData.birth_date);
      const now = new Date();
      const diffDays = Math.max(0, Math.round((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)));
      stageWeek = Math.max(1, Math.min(52, Math.floor(diffDays / 7) + 1));
    }

    const existingInteractions = parseStoredInteractions(postData?.notes);

    const result = generatePersonalizedRecommendations({
      mode: "postpartum",
      stageWeek,
      medicalRecords: allRecords,
      existingInteractions,
    });

    return res.json(result);
  } catch (error: any) {
    console.error("[Recommendations] Error generating postpartum recommendations:", error);
    const fallback = generatePersonalizedRecommendations({
      mode: "postpartum",
      stageWeek: 4,
      medicalRecords: [],
      existingInteractions: [],
    });
    return res.json(fallback);
  }
});

/**
 * POST /api/recommendations/interactions
 * Persists a user's action ('ate', 'completed', 'skipped', 'not_available')
 */
router.post("/recommendations/interactions", async (req: Request, res: Response) => {
  const token = access(req);
  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    return res.status(401).json({ error: "Invalid user session" });
  }

  const { recommendation_id, item_name, recommendation_date, mode, category, action } = req.body;

  if (!recommendation_id || !item_name || !action || !mode) {
    return res.status(400).json({ error: "Missing required interaction fields" });
  }

  const validActions = ["ate", "completed", "skipped", "not_available"];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: "Invalid action value" });
  }

  const recDate = recommendation_date || new Date().toISOString().split("T")[0];
  const table = mode === "postpartum" ? "postpartum_data" : "pregnancy_data";

  try {
    // 1. Fetch current row
    const fetchRes = await supabaseRequest(`/rest/v1/${table}?select=*&order=id.desc&limit=1`, { method: "GET" }, token);
    const rows = fetchRes.ok ? await responseJson(fetchRes) : [];
    let record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    let existingInteractions = parseStoredInteractions(record?.notes);

    // 2. Add or update interaction for this item and date
    const newInteraction: RecommendationInteraction = {
      id: `int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recommendationId: recommendation_id,
      itemName: item_name,
      recommendationDate: recDate,
      mode: mode as "pregnancy" | "postpartum",
      category: (category as "nutrition" | "activity") || "nutrition",
      action: action as "ate" | "completed" | "skipped" | "not_available",
      createdAt: new Date().toISOString(),
    };

    // Filter out prior interaction for the same recommendation_id, item_name, and date to avoid duplicates
    existingInteractions = existingInteractions.filter(
      (item) => !(item.recommendationId === recommendation_id && item.itemName === item_name && item.recommendationDate === recDate)
    );
    existingInteractions.push(newInteraction);

    // 3. Serialize and save
    const updatedNotes = serializeStoredInteractions(record?.notes, existingInteractions);

    if (record?.id) {
      // Update existing row
      await supabaseRequest(`/rest/v1/${table}?id=eq.${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: updatedNotes, updated_at: new Date().toISOString() }),
      }, token);
    } else {
      // Insert baseline row for user
      const insertPayload: any = {
        user_id: user.id,
        notes: updatedNotes,
      };
      if (mode === "pregnancy") {
        insertPayload.pregnancy_start_date = new Date().toISOString().split("T")[0];
      } else {
        insertPayload.birth_date = new Date().toISOString().split("T")[0];
      }
      await supabaseRequest(`/rest/v1/${table}`, {
        method: "POST",
        body: JSON.stringify(insertPayload),
      }, token);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const interactionsToday = existingInteractions.filter((i) => i.recommendationDate === todayStr);

    return res.json({
      success: true,
      interaction: newInteraction,
      interactionsToday,
    });
  } catch (error: any) {
    console.error("[Recommendations] Error saving interaction:", error);
    return res.status(500).json({ error: "Failed to save recommendation interaction" });
  }
});

/**
 * GET /api/recommendations/interactions
 * Returns the user's stored interactions for a date / mode
 */
router.get("/recommendations/interactions", async (req: Request, res: Response) => {
  const token = access(req);
  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    return res.status(401).json({ error: "Invalid user session" });
  }

  const mode = (req.query.mode as string) || "pregnancy";
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const table = mode === "postpartum" ? "postpartum_data" : "pregnancy_data";

  try {
    const fetchRes = await supabaseRequest(`/rest/v1/${table}?select=*&order=id.desc&limit=1`, { method: "GET" }, token);
    const rows = fetchRes.ok ? await responseJson(fetchRes) : [];
    const record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    const allInteractions = parseStoredInteractions(record?.notes);
    const interactionsForDate = allInteractions.filter((i) => i.recommendationDate === date);

    return res.json({
      date,
      mode,
      interactions: interactionsForDate,
      totalAllTime: allInteractions.length,
    });
  } catch (error: any) {
    console.error("[Recommendations] Error fetching interactions:", error);
    return res.json({ date, mode, interactions: [], totalAllTime: 0 });
  }
});

export default router;
