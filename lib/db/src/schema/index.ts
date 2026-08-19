import { pgTable, uuid, text, integer, boolean, date, timestamptz, jsonb, numeric } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull().default("Tanvi"),
  reproductiveMode: text("reproductive_mode").notNull().default("not-pregnant"),
  privacyEnabled: boolean("privacy_enabled").notNull().default(true),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  dateOfBirth: date("date_of_birth"),
  typicalCycleLength: integer("typical_cycle_length").default(28),
  typicalPeriodLength: integer("typical_period_length").default(5),
  lastPeriodDate: date("last_period_date"),
  healthNotes: text("health_notes"),
  notificationPreferences: jsonb("notification_preferences"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const cycleLogs = pgTable("cycle_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  periodDate: date("period_date").notNull(),
  endDate: date("end_date"),
  flow: text("flow"),
  cramps: integer("cramps"),
  symptoms: text("symptoms").array(),
  mood: text("mood"),
  notes: text("notes"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const moods = pgTable("moods", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  mood: text("mood").notNull(),
  stress: integer("stress").notNull().default(3),
  energy: integer("energy").notNull().default(7),
  sleep: text("sleep").default("7h 20m"),
  note: text("note"),
  loggedAt: date("logged_at").notNull().defaultNow(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const symptomLogs = pgTable("symptom_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  symptom: text("symptom").notNull(),
  category: text("category").notNull().default("general"),
  severity: text("severity"),
  loggedAt: date("logged_at").notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const pregnancyData = pgTable("pregnancy_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  pregnancyStartDate: date("pregnancy_start_date"),
  dueDate: date("due_date"),
  kickCount: integer("kick_count").default(0),
  lastKickTime: timestamptz("last_kick_time"),
  appointments: jsonb("appointments"),
  symptoms: text("symptoms").array(),
  notes: text("notes"),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const postpartumData = pgTable("postpartum_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  birthDate: date("birth_date"),
  bleedingLevel: text("bleeding_level"),
  recoveryStage: text("recovery_stage"),
  sleepHours: numeric("sleep_hours"),
  activityLevel: text("activity_level"),
  kegelCount: integer("kegel_count").default(0),
  notes: text("notes"),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const screeningSessions = pgTable("screening_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  screeningType: text("screening_type").notNull(),
  answers: jsonb("answers").notNull(),
  structuredResult: jsonb("structured_result").notNull(),
  riskLevel: text("risk_level"),
  summaryExplanation: text("summary_explanation"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const healthInsights = pgTable("health_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  insightText: text("insight_text").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull().default("Health Companion Chat"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id"),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});
