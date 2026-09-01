import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { type ChatMessage, type Mood, type MoodEntry, type ReproductiveMode } from './mock';
import { toast } from "@/hooks/use-toast";
import { api, type Profile, type PCOSScreeningInput, type PCOSScreeningResult, type SymptomTriageInput, type SymptomTriageResult } from '@/lib/api';
import { supabase } from "../lib/supabase";

export interface CycleLogItem {
  id?: string;
  period_date: string;
  end_date?: string;
  flow?: 'light' | 'medium' | 'heavy' | 'spotting';
  cramps?: number;
  symptoms?: string[];
  notes?: string;
}

export interface SymptomLogItem {
  id: string;
  symptom: string;
  category: string;
  severity?: 'mild' | 'moderate' | 'severe';
  logged_at: string;
  notes?: string;
}

export interface PregnancyData {
  id?: string;
  pregnancy_start_date?: string;
  due_date?: string;
  kick_count?: number;
  last_kick_time?: string;
  appointments?: Array<{ id: string; title: string; date: string; doctor?: string; notes?: string }>;
  symptoms?: string[];
  notes?: string;
}

export interface PostpartumData {
  id?: string;
  birth_date?: string;
  bleeding_level?: 'none' | 'light' | 'normal' | 'heavy';
  recovery_stage?: string;
  sleep_hours?: number;
  activity_level?: 'rest' | 'gentle-walking' | 'moderate' | 'active';
  kegel_count?: number;
  notes?: string;
}

export interface StructuredMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface StructuredLabResult {
  test_name: string;
  value: string;
  numeric_value?: number | null;
  unit?: string;
  reference_range?: string;
  flag?: 'normal' | 'low' | 'high' | 'abnormal' | 'borderline' | null;
  recorded_at?: string;
}

export interface StructuredMedicalRecord {
  title: string;
  document_type: string;
  document_date: string;
  doctor_name?: string | null;
  hospital_name?: string | null;
  diagnoses?: string[];
  symptoms?: string[];
  medications?: StructuredMedication[];
  medicines?: string[];
  investigations?: string[];
  lab_results?: StructuredLabResult[];
  important_findings?: string[];
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface MedicalRecord {
  id?: string;
  title: string;
  document_type: string;
  document_date?: string;
  doctor_name?: string;
  hospital_name?: string;
  extracted_text?: string;
  verification_status?: 'pending_verification' | 'verified' | 'edited';
  structured_data: StructuredMedicalRecord;
  tags?: string[];
  created_at?: string;
}

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
    trend: 'increased' | 'decreased' | 'stable' | 'changed';
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

interface SitaStore {
  profile: Profile | null;
  mode: ReproductiveMode;
  setMode: (mode: ReproductiveMode) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  periodDateStrings: string[];
  cycleLogs: CycleLogItem[];
  togglePeriodDayString: (dateStr: string, details?: Partial<CycleLogItem>) => Promise<void>;
  logPeriodDetails: (dateStr: string, details: Partial<CycleLogItem>) => Promise<void>;
  deletePeriodLog: (dateStr: string) => Promise<void>;
  moodEntries: MoodEntry[];
  addMood: (entry: Omit<MoodEntry, 'id' | 'date'> & { logged_at?: string }) => Promise<void>;
  deleteMood: (id: string) => Promise<void>;
  symptomLogs: SymptomLogItem[];
  addSymptom: (symptom: string, category?: string, severity?: 'mild' | 'moderate' | 'severe', notes?: string) => Promise<void>;
  pregnancyData: PregnancyData;
  updatePregnancyData: (patch: Partial<PregnancyData>) => Promise<void>;
  recordKick: () => Promise<void>;
  resetKicks: () => Promise<void>;
  addAppointment: (app: { title: string; date: string; doctor?: string; notes?: string }) => Promise<void>;

  medicalRecords: MedicalRecord[];
  addMedicalRecord: (record: Omit<MedicalRecord, 'id'>) => Promise<MedicalRecord>;
  updateMedicalRecord: (id: string, patch: Partial<MedicalRecord>) => Promise<void>;
  deleteMedicalRecord: (id: string) => Promise<void>;
  extractDocument: (imageBase64?: string, rawText?: string, docType?: string) => Promise<{ success: boolean; extracted_text: string; structured_data: StructuredMedicalRecord }>;
  getRecordComparison: (targetRecord?: MedicalRecord, compareWithRecord?: MedicalRecord) => Promise<MedicalRecordComparison>;
  getDoctorSummary: () => Promise<any>;

  postpartumData: PostpartumData;
  updatePostpartumData: (patch: Partial<PostpartumData>) => Promise<void>;
  recordKegel: () => Promise<void>;
  messages: ChatMessage[];
  sendMessage: (text: string, assessmentId?: string, imageBase64?: string) => Promise<void>;
  clearMessages: () => Promise<void>;
  runPCOSScreening: (input: PCOSScreeningInput) => Promise<{ result: PCOSScreeningResult; explanation: string; id?: string }>;
  runSymptomTriage: (input: SymptomTriageInput) => Promise<{ result: SymptomTriageResult; explanation: string; id?: string }>;
  privacy: boolean;
  setPrivacy: (value: boolean) => void;
  notifications: boolean;
  setNotifications: (value: boolean) => void;
  signedIn: boolean;
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
  exportData: () => void;
  purgeAccountData: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const StoreContext = createContext<SitaStore | null>(null);

const defaultPregnancyData: PregnancyData = {
  due_date: '',
  kick_count: 0,
  appointments: [],
  symptoms: [],
  notes: '',
};

const defaultPostpartumData: PostpartumData = {
  birth_date: '',
  bleeding_level: 'light',
  recovery_stage: 'Fourth Trimester Healing',
  sleep_hours: 7,
  activity_level: 'rest',
  kegel_count: 0,
  notes: '',
};

const welcomeChat: ChatMessage[] = [
  {
    id: 'sita-welcome',
    role: 'sita',
    text: 'Hello! I am SITA, your personal reproductive, cycle, and hormonal wellness companion. How are you feeling today?',
    time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  },
];

// Seed initial verified clinical examples for rich Health Memory onboarding
const sampleMedicalRecords: MedicalRecord[] = [
  {
    id: 'sample-doc-2',
    title: 'Dr. Ananya Roy - Follow-up Lab & Prescription',
    document_type: 'Prescription',
    document_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    doctor_name: 'Dr. Ananya Roy, MD (OB/GYN)',
    hospital_name: 'Apollo Women Care',
    extracted_text: 'Rx: Ferrous Ascorbate 100mg BD (increased dose for ferritin optimization), Calcium+Vit D3 500mg BD, Omega-3 DHA 200mg OD. Lab: Hb 10.4 g/dL, Ferritin 24 ng/mL, TSH 1.85 mIU/L.',
    verification_status: 'verified',
    structured_data: {
      title: 'Dr. Ananya Roy - Follow-up Lab & Prescription',
      document_type: 'Prescription',
      document_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      doctor_name: 'Dr. Ananya Roy, MD (OB/GYN)',
      hospital_name: 'Apollo Women Care',
      diagnoses: ['Gestational Support', 'Improving Iron Stores'],
      symptoms: ['Mild fatigue on exertion', 'Leg cramps (mild)'],
      medications: [
        { name: 'Ferrous Ascorbate', dosage: '100mg', frequency: 'Twice daily after meals', duration: '30 days', instructions: 'Take with lemon water or orange juice; avoid taking with milk' },
        { name: 'Calcium + Vitamin D3', dosage: '500mg', frequency: 'Twice daily', duration: '60 days', instructions: 'Keep 2-hour gap from iron tablet' },
        { name: 'Omega-3 DHA', dosage: '200mg', frequency: 'Once daily with dinner', duration: '60 days' },
      ],
      investigations: ['Fetal Anatomy Ultrasound Scan at 20 weeks', 'Repeat CBC in 4 weeks'],
      lab_results: [
        { test_name: 'Hemoglobin', value: '10.4', numeric_value: 10.4, unit: 'g/dL', reference_range: '12.0 - 15.5 g/dL', flag: 'low' },
        { test_name: 'Serum Ferritin', value: '24', numeric_value: 24, unit: 'ng/mL', reference_range: '20 - 200 ng/mL', flag: 'normal' },
        { test_name: 'TSH', value: '1.85', numeric_value: 1.85, unit: 'mIU/L', reference_range: '0.4 - 4.0 mIU/L', flag: 'normal' },
      ],
      important_findings: [
        'Ferritin improved from baseline 18 ng/mL to 24 ng/mL with iron therapy',
        'TSH is optimal at 1.85 mIU/L for gestational metabolic health',
        'Fetal heart sounds clear and rhythmic at 144 bpm',
      ],
      notes: 'Continue adequate hydration (min 2.5L). Book anomaly ultrasound scan for 20th week.',
      confidence: 'high',
    },
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'sample-doc-1',
    title: 'Dr. Ananya Roy - Initial Prenatal Prescription & Baseline Labs',
    document_type: 'Prescription',
    document_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    doctor_name: 'Dr. Ananya Roy, MD (OB/GYN)',
    hospital_name: 'Apollo Women Care',
    extracted_text: 'Rx: Ferrous Ascorbate 100mg OD, Calcium+Vit D3 500mg BD, Folate 5mg OD. Lab: Hb 11.2 g/dL, Ferritin 18 ng/mL, Fasting Sugar 84 mg/dL.',
    verification_status: 'verified',
    structured_data: {
      title: 'Dr. Ananya Roy - Initial Prenatal Prescription & Baseline Labs',
      document_type: 'Prescription',
      document_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      doctor_name: 'Dr. Ananya Roy, MD (OB/GYN)',
      hospital_name: 'Apollo Women Care',
      diagnoses: ['Gestational Anemia (Mild)', 'Routine 1st Trimester Baseline'],
      symptoms: ['Morning nausea', 'Fatigue'],
      medications: [
        { name: 'Ferrous Ascorbate', dosage: '100mg', frequency: 'Once daily after lunch', duration: '30 days', instructions: 'Take after food' },
        { name: 'Calcium + Vitamin D3', dosage: '500mg', frequency: 'Twice daily', duration: '60 days' },
        { name: 'Folate / Methylfolate', dosage: '5mg', frequency: 'Once daily morning', duration: '30 days' },
      ],
      investigations: ['Baseline Blood Profile', 'Urine Routine'],
      lab_results: [
        { test_name: 'Hemoglobin', value: '11.2', numeric_value: 11.2, unit: 'g/dL', reference_range: '12.0 - 15.5 g/dL', flag: 'low' },
        { test_name: 'Serum Ferritin', value: '18', numeric_value: 18, unit: 'ng/mL', reference_range: '20 - 200 ng/mL', flag: 'low' },
        { test_name: 'Fasting Blood Sugar', value: '84', numeric_value: 84, unit: 'mg/dL', reference_range: '70 - 99 mg/dL', flag: 'normal' },
      ],
      important_findings: [
        'Baseline Ferritin 18 ng/mL indicates mild iron deficiency pattern',
        'Normal blood pressure at 116/74 mmHg',
      ],
      notes: 'Initial antenatal screening completed. Start mild iron supplementation.',
      confidence: 'high',
    },
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function SitaStoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setModeState] = useState<ReproductiveMode>('not-pregnant');
  const [periodDateStrings, setPeriodDateStrings] = useState<string[]>([]);
  const [cycleLogs, setCycleLogs] = useState<CycleLogItem[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLogItem[]>([]);
  const [pregnancyData, setPregnancyData] = useState<PregnancyData>(defaultPregnancyData);

  const [postpartumData, setPostpartumData] = useState<PostpartumData>(defaultPostpartumData);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>(welcomeChat);
  const [privacy, setPrivacyState] = useState(true);
  const [notifications, setNotificationsState] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setSignedIn(false);
        setUser(null);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      setUser(session.user);

      const [
        profileData,
        moodsData,
        cyclesData,
        symptomsData,
        pregData,
        postData,
        chatData,
        docData,
        recordsData,
      ] = await Promise.all([
        api.profile().catch(() => null),
        api.list<any>('moods', 'logged_at.desc', 50).catch(() => []),
        api.list<any>('cycle_logs', 'period_date.desc', 100).catch(() => []),
        api.list<any>('symptom_logs', 'logged_at.desc', 50).catch(() => []),
        api.list<any>('pregnancy_data', 'id.desc', 1).catch(() => []),
        api.list<any>('postpartum_data', 'id.desc', 1).catch(() => []),
        api.list<any>('chat_messages', 'created_at.asc', 50).catch(() => []),
        api.list<any>('medical_documents', 'document_date.desc', 50).catch(() => []),
        api.list<any>('medical_records', 'document_date.desc', 50).catch(() => []),
      ]);

      if (profileData) {
        const hasExistingHealthHistory =
          profileData.onboarding_complete ||
          Boolean(profileData.last_period_date) ||
          Boolean(profileData.typical_cycle_length) ||
          (cyclesData && cyclesData.length > 0) ||
          (moodsData && moodsData.length > 0) ||
          (symptomsData && symptomsData.length > 0) ||
          (pregData && pregData.length > 0) ||
          (postData && postData.length > 0);

        setProfile({
          ...profileData,
          onboarding_complete: Boolean(hasExistingHealthHistory),
        });
        if (profileData.reproductive_mode) setModeState(profileData.reproductive_mode);
        if (profileData.privacy_enabled !== undefined) setPrivacyState(profileData.privacy_enabled);
        if (profileData.notification_preferences?.daily !== undefined) {
          setNotificationsState(profileData.notification_preferences.daily);
        }
      }

      if (moodsData && moodsData.length > 0) {
        setMoodEntries(
          moodsData.map((item: any) => ({
            id: item.id,
            date: item.logged_at,
            mood: item.mood,
            stress: item.stress,
            energy: item.energy,
            sleep: item.sleep || '7h 20m',
            note: item.note,
          }))
        );
      }

      const pDates = new Set<string>();
      if (cyclesData && cyclesData.length > 0) {
        setCycleLogs(cyclesData);
        cyclesData.forEach((c: any) => pDates.add(c.period_date));
      }
      if (profileData?.last_period_date) {
        pDates.add(profileData.last_period_date);
      }
      if (pDates.size > 0) {
        setPeriodDateStrings(Array.from(pDates));
      }

      if (symptomsData && symptomsData.length > 0) {
        setSymptomLogs(symptomsData);
      }

      if (pregData && pregData.length > 0) {
        setPregnancyData({
          ...defaultPregnancyData,
          ...pregData[0],
        });
      }

      if (postData && postData.length > 0) {
        setPostpartumData({
          ...defaultPostpartumData,
          ...postData[0],
        });
      }

      if (chatData && chatData.length > 0) {
        setMessages(
          chatData.map((item: any) => ({
            id: item.id,
            role: item.role === 'assistant' ? 'sita' : 'user',
            text: item.content,
            time: new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            image: item.metadata?.image_preview,
            extracted_document: item.metadata?.extracted_document,
          }))
        );
      }

      const mergedDocs = (docData && docData.length > 0) ? docData : (recordsData && recordsData.length > 0 ? recordsData : []);
      setMedicalRecords(mergedDocs);
    } catch (err) {
      console.warn('[SITA Store] Load issue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Initial fetch of session directly from Supabase
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (session?.user) {
          setSignedIn(true);
          setUser(session.user);
          refreshAll();
        } else {
          setSignedIn(false);
          setUser(null);
          setLoading(false);
        }
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          setLoading(true);
        }
        setSignedIn(true);
        setUser(session.user);
        if (event === 'SIGNED_IN') {
          refreshAll();
        }
      } else {
        setSignedIn(false);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshAll]);

  const addMedicalRecord = async (record: Omit<MedicalRecord, 'id'>): Promise<MedicalRecord> => {
    let savedRecord: MedicalRecord = {
      ...record,
      id: `doc-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    if (signedIn) {
      try {
        // Try saving to medical_documents first, fallback to medical_records
        const res = await api.insert<any>('medical_documents', {
          title: record.title,
          document_type: record.document_type,
          document_date: record.document_date || new Date().toISOString().split('T')[0],
          doctor_name: record.doctor_name || record.structured_data?.doctor_name,
          hospital_name: record.hospital_name || record.structured_data?.hospital_name,
          extracted_text: record.extracted_text,
          verification_status: record.verification_status || 'verified',
          structured_data: record.structured_data,
        }).catch(async () => {
          return api.insert<any>('medical_records', {
            title: record.title,
            document_type: record.document_type,
            document_date: record.document_date || new Date().toISOString().split('T')[0],
            extracted_text: record.extracted_text,
            structured_data: record.structured_data,
          });
        });

        if (res && res.length > 0) {
          savedRecord = res[0];
        }
      } catch (e) {
        console.error('Failed to persist medical record to database', e);
      }
    }

    setMedicalRecords((prev) => [savedRecord, ...prev]);
    return savedRecord;
  };

  const updateMedicalRecord = async (id: string, patch: Partial<MedicalRecord>) => {
    if (signedIn && !id.startsWith('doc-') && !id.startsWith('sample-')) {
      try {
        await api.update('medical_documents', id, patch as any).catch(async () => {
          await api.update('medical_records', id, patch as any);
        });
      } catch (e) {
        console.error('Failed to update medical record', e);
      }
    }
    setMedicalRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  const deleteMedicalRecord = async (id: string) => {
    if (signedIn && !id.startsWith('doc-') && !id.startsWith('sample-')) {
      try {
        await api.remove('medical_documents', id).catch(async () => {
          await api.remove('medical_records', id);
        });
      } catch (e) {
        console.error('Failed to delete medical record', e);
      }
    }
    setMedicalRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const extractDocument = async (imageBase64?: string, rawText?: string, docType?: string) => {
    return api.extractMedicalRecord(imageBase64, rawText, docType);
  };

  const getRecordComparison = async (targetRecord?: MedicalRecord, compareWithRecord?: MedicalRecord): Promise<MedicalRecordComparison> => {
    const target = targetRecord || medicalRecords[0];
    if (!target) {
      throw new Error("No record available to compare.");
    }

    const history = compareWithRecord
      ? [compareWithRecord]
      : medicalRecords.filter((r) => r.id !== target.id);

    try {
      const res = await api.compareMedicalRecords(target, history);
      if (res.success && res.comparison) {
        return res.comparison;
      }
    } catch (e) {
      console.warn("[Local Comparison Fallback]:", e);
    }

    // Client-side comparison fallback
    const targetData = target.structured_data || ({} as StructuredMedicalRecord);
    const targetMeds = targetData.medications || [];
    const targetLabs = targetData.lab_results || [];
    const prev = history[0];

    if (!prev) {
      return {
        targetRecordTitle: target.title,
        targetRecordDate: target.document_date || new Date().toISOString().split('T')[0],
        hasPreviousComparison: false,
        medicationChanges: { added: targetMeds, removed: [], dosageChanged: [], unchanged: [] },
        labChanges: targetLabs.map((l) => ({
          test_name: l.test_name,
          previous_value: 'N/A',
          current_value: l.value,
          trend: 'changed' as const,
          clinical_note: 'Initial documented baseline.',
        })),
        newDiagnoses: targetData.diagnoses || [],
        newFindings: targetData.important_findings || [],
        symptomUpdates: { newSymptoms: targetData.symptoms || [], resolvedSymptoms: [] },
        neutralSummary: `Baseline record saved to SITA Health Memory (${target.document_type} on ${target.document_date}).`,
        askSitaPrompt: `Could you explain the medications and findings in my ${target.document_type} from ${target.document_date}?`,
      };
    }

    const prevData = prev.structured_data || ({} as StructuredMedicalRecord);
    const prevMeds = prevData.medications || [];
    const prevLabs = prevData.lab_results || [];

    const addedMeds = targetMeds.filter((tm) => !prevMeds.some((pm) => pm.name.toLowerCase().trim() === tm.name.toLowerCase().trim()));
    const removedMeds = prevMeds.filter((pm) => !targetMeds.some((tm) => tm.name.toLowerCase().trim() === pm.name.toLowerCase().trim()));
    const dosageChanged = targetMeds.filter((tm) => {
      const match = prevMeds.find((pm) => pm.name.toLowerCase().trim() === tm.name.toLowerCase().trim());
      return match && ((match.dosage || '').trim() !== (tm.dosage || '').trim() || (match.frequency || '').trim() !== (tm.frequency || '').trim());
    }).map((tm) => {
      const match = prevMeds.find((pm) => pm.name.toLowerCase().trim() === tm.name.toLowerCase().trim())!;
      return {
        name: tm.name,
        previousDosage: match.dosage,
        currentDosage: tm.dosage,
        previousFrequency: match.frequency,
        currentFrequency: tm.frequency,
        note: 'Dosage or schedule adjusted',
      };
    });

    const labChanges = targetLabs.map((tl) => {
      const match = prevLabs.find((pl) => pl.test_name.toLowerCase().trim() === tl.test_name.toLowerCase().trim());
      const pNum = match ? (typeof match.numeric_value === 'number' ? match.numeric_value : parseFloat(match.value.replace(/[^0-9.-]/g, ''))) : null;
      const cNum = typeof tl.numeric_value === 'number' ? tl.numeric_value : parseFloat(tl.value.replace(/[^0-9.-]/g, ''));
      const delta = (match && pNum !== null && !isNaN(pNum) && !isNaN(cNum)) ? Math.round((cNum - pNum) * 100) / 100 : null;

      return {
        test_name: tl.test_name,
        previous_value: match ? match.value : 'Not in prior report',
        current_value: tl.value,
        delta,
        unit: tl.unit || '',
        reference_range: tl.reference_range,
        trend: (delta && delta > 0 ? 'increased' : delta && delta < 0 ? 'decreased' : 'changed') as any,
        clinical_note: delta !== null ? `${tl.test_name} shifted by ${delta > 0 ? '+' : ''}${delta} ${tl.unit || ''}` : `${tl.test_name}: ${tl.value}`,
      };
    });

    return {
      targetRecordTitle: target.title,
      targetRecordDate: target.document_date || '',
      previousRecordTitle: prev.title,
      previousRecordDate: prev.document_date,
      hasPreviousComparison: true,
      medicationChanges: {
        added: addedMeds,
        removed: removedMeds,
        dosageChanged,
        unchanged: targetMeds.filter((tm) => !addedMeds.includes(tm) && !dosageChanged.some((d) => d.name === tm.name)),
      },
      labChanges,
      newDiagnoses: (targetData.diagnoses || []).filter((d) => !(prevData.diagnoses || []).includes(d)),
      newFindings: (targetData.important_findings || []).filter((f) => !(prevData.important_findings || []).includes(f)),
      symptomUpdates: {
        newSymptoms: (targetData.symptoms || []).filter((s) => !(prevData.symptoms || []).includes(s)),
        resolvedSymptoms: (prevData.symptoms || []).filter((s) => !(targetData.symptoms || []).includes(s)),
      },
      neutralSummary: `Comparison: ${dosageChanged.length} dosage adjustment(s), ${addedMeds.length} new medication(s), and ${labChanges.length} lab marker(s) tracked.`,
      askSitaPrompt: `Could you explain the updates between my ${prev.title} and ${target.title}?`,
    };
  };

  const getDoctorSummary = async () => {
    try {
      const res = await api.generateDoctorSummary();
      if (res.success && res.summaryReport) {
        return res.summaryReport;
      }
    } catch (e) {
      console.warn("[Doctor Summary Fallback]:", e);
    }

    // Client-side fallback report
    return {
      generatedAt: new Date().toISOString(),
      patientName: profile?.display_name || 'Patient',
      reproductiveMode: mode,
      reproductiveSummary: `${mode.toUpperCase()} (Cycle: ${profile?.typical_cycle_length || 28}d, Period: ${profile?.typical_period_length || 5}d)`,
      activeMedications: medicalRecords.flatMap((r) => r.structured_data?.medications || []),
      recentDiagnoses: Array.from(new Set(medicalRecords.flatMap((r) => r.structured_data?.diagnoses || []))),
      recentUltrasoundAndFindings: medicalRecords.map((r) => ({
        documentTitle: r.title,
        documentDate: r.document_date || '',
        findings: r.structured_data?.important_findings || [],
      })),
      labTrends: medicalRecords[0]?.structured_data?.lab_results?.map((l) => ({
        testName: l.test_name,
        latestValue: l.value,
        latestUnit: l.unit,
        latestDate: medicalRecords[0]?.document_date,
        referenceRange: l.reference_range,
      })) || [],
      topSymptomsPast90Days: symptomLogs.slice(0, 5).map((s) => ({
        symptom: s.symptom,
        loggedCount: 1,
        lastLogged: s.logged_at,
        predominantSeverity: s.severity || 'mild',
      })),
      recentAssessments: [],
      totalDocumentsInHealthMemory: medicalRecords.length,
      disclaimer: 'This patient-generated clinical brief was synthesized from patient-verified medical records, cycle logs, and symptom tracking in SITA Health for discussion with your doctor.',
    };
  };

  const updateProfile = async (patch: Partial<Profile>) => {
    const prev = profile;
    setProfile((p) => (p ? { ...p, ...patch } : (patch as Profile)));
    if (patch.reproductive_mode) setModeState(patch.reproductive_mode);
    if (signedIn) {
      try {
        await api.updateProfile(patch);
      } catch (err: any) {
        setProfile(prev);
        if (prev?.reproductive_mode) setModeState(prev.reproductive_mode);
        toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
        throw err;
      }
    }
  };

  const setMode = async (next: ReproductiveMode) => {
    setModeState(next);
    await updateProfile({ reproductive_mode: next });
  };

  const setPrivacy = (val: boolean) => {
    setPrivacyState(val);
    void updateProfile({ privacy_enabled: val });
  };

  const setNotifications = (val: boolean) => {
    setNotificationsState(val);
    void updateProfile({ notification_preferences: { daily: val, cycle: val, hydration: val } });
  };

  const togglePeriodDayString = async (dateStr: string, details?: Partial<CycleLogItem>) => {
    const exists = periodDateStrings.includes(dateStr);
    const prevDates = periodDateStrings;
    const prevLogs = cycleLogs;

    const updatedDates = exists
      ? periodDateStrings.filter((d) => d !== dateStr)
      : [...periodDateStrings, dateStr].sort();
    setPeriodDateStrings(updatedDates);

    if (exists) {
      setCycleLogs((prev) => prev.filter((c) => c.period_date !== dateStr));
      if (signedIn) {
        try {
          await api.removeByDate('cycle_logs', dateStr);
        } catch (err) {
          setPeriodDateStrings(prevDates);
          setCycleLogs(prevLogs);
          toast({ title: 'Error', description: 'Failed to delete period log.', variant: 'destructive' });
          throw err;
        }
      }
    } else {
      const newEntry: CycleLogItem = {
        period_date: dateStr,
        flow: details?.flow || 'medium',
        cramps: details?.cramps ?? 3,
        symptoms: details?.symptoms || [],
        notes: details?.notes || '',
      };
      setCycleLogs((prev) => [newEntry, ...prev]);
      if (signedIn) {
        try {
          await api.insert('cycle_logs', newEntry as any);
        } catch (err) {
          setPeriodDateStrings(prevDates);
          setCycleLogs(prevLogs);
          toast({ title: 'Error', description: 'Failed to save period log.', variant: 'destructive' });
          throw err;
        }
      }
    }
  };

  const logPeriodDetails = async (dateStr: string, details: Partial<CycleLogItem>) => {
    if (signedIn) {
      try {
        await api.insert('cycle_logs', { period_date: dateStr, ...details } as any);
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to update period details.', variant: 'destructive' });
        throw err;
      }
    }
    setCycleLogs((prev) => {
      const idx = prev.findIndex((c) => c.period_date === dateStr);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...details };
        return copy;
      }
      return [{ period_date: dateStr, flow: 'medium', cramps: 3, symptoms: [], notes: '', ...details } as CycleLogItem, ...prev];
    });
    if (!periodDateStrings.includes(dateStr)) {
      setPeriodDateStrings((prev) => [...prev, dateStr].sort());
    }
  };

  const deletePeriodLog = async (dateStr: string) => {
    if (signedIn) {
      try {
        await api.removeByDate('cycle_logs', dateStr);
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to delete period log.', variant: 'destructive' });
        throw err;
      }
    }
    setPeriodDateStrings((prev) => prev.filter((d) => d !== dateStr));
    setCycleLogs((prev) => prev.filter((c) => c.period_date !== dateStr));
  };

  const addMood = async (entry: Omit<MoodEntry, 'id' | 'date'> & { logged_at?: string }) => {
    const todayStr = entry.logged_at || new Date().toISOString().slice(0, 10);
    if (signedIn) {
      try {
        await api.insert('moods', {
          mood: entry.mood,
          stress: entry.stress,
          energy: entry.energy,
          sleep: entry.sleep || '7h 20m',
          note: entry.note,
          logged_at: todayStr,
        });
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to save mood.', variant: 'destructive' });
        throw err;
      }
    }
    const newMood: MoodEntry = {
      id: `m-${Date.now()}`,
      date: todayStr,
      mood: entry.mood,
      stress: entry.stress,
      energy: entry.energy,
      sleep: entry.sleep || '7h 20m',
      note: entry.note,
    };
    setMoodEntries((prev) => [newMood, ...prev]);
  };

  const deleteMood = async (id: string) => {
    if (signedIn && !id.startsWith('m-')) {
      try {
        await api.remove('moods', id);
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to delete mood.', variant: 'destructive' });
        throw err;
      }
    }
    setMoodEntries((prev) => prev.filter((m) => m.id !== id));
  };

  const addSymptom = async (symptom: string, category = 'general', severity: 'mild' | 'moderate' | 'severe' = 'mild', notes?: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (signedIn) {
      try {
        await api.insert('symptom_logs', {
          symptom,
          category,
          severity,
          notes,
          logged_at: todayStr,
        });
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to save symptom.', variant: 'destructive' });
        throw err;
      }
    }
    const newSym: SymptomLogItem = {
      id: `sym-${Date.now()}`,
      symptom,
      category,
      severity,
      logged_at: todayStr,
      notes,
    };
    setSymptomLogs((prev) => [newSym, ...prev]);
  };

  const updatePregnancyData = async (patch: Partial<PregnancyData>) => {
    if (signedIn) {
      try {
        if (pregnancyData?.id) {
          await api.update('pregnancy_data', pregnancyData.id, patch);
        } else {
          const res = await api.insert<any>('pregnancy_data', patch as any);
          if (res && res[0]?.id) patch.id = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to update pregnancy data.', variant: 'destructive' });
        throw err;
      }
    }
    setPregnancyData((prev) => ({ ...prev, ...patch }));
  };

  const recordKick = async () => {
    const current = (pregnancyData.kick_count || 0) + 1;
    const now = new Date().toISOString();
    let newId = undefined;
    if (signedIn) {
      try {
        if (pregnancyData?.id) {
          await api.update('pregnancy_data', pregnancyData.id, { kick_count: current, last_kick_time: now });
        } else {
          const res = await api.insert<any>('pregnancy_data', { kick_count: current, last_kick_time: now } as any);
          if (res && res[0]?.id) newId = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to record kick.', variant: 'destructive' });
        throw err;
      }
    }
    setPregnancyData((prev) => ({ ...prev, kick_count: current, last_kick_time: now, ...(newId && { id: newId }) }));
  };

  const resetKicks = async () => {
    let newId = undefined;
    if (signedIn) {
      try {
        if (pregnancyData?.id) {
          await api.update('pregnancy_data', pregnancyData.id, { kick_count: 0 });
        } else {
          const res = await api.insert<any>('pregnancy_data', { kick_count: 0 } as any);
          if (res && res[0]?.id) newId = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to reset kicks.', variant: 'destructive' });
        throw err;
      }
    }
    setPregnancyData((prev) => ({ ...prev, kick_count: 0, ...(newId && { id: newId }) }));
  };

  const addAppointment = async (app: { title: string; date: string; doctor?: string; notes?: string }) => {
    const newApp = { id: `app-${Date.now()}`, ...app };
    const current = pregnancyData.appointments || [];
    const updated = [...current, newApp];
    let newId = undefined;
    if (signedIn) {
      try {
        if (pregnancyData?.id) {
          await api.update('pregnancy_data', pregnancyData.id, { appointments: updated });
        } else {
          const res = await api.insert<any>('pregnancy_data', { appointments: updated } as any);
          if (res && res[0]?.id) newId = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to add appointment.', variant: 'destructive' });
        throw err;
      }
    }
    setPregnancyData((prev) => ({ ...prev, appointments: updated, ...(newId && { id: newId }) }));
  };

  const updatePostpartumData = async (patch: Partial<PostpartumData>) => {
    if (signedIn) {
      try {
        if (postpartumData?.id) {
          await api.update('postpartum_data', postpartumData.id, patch);
        } else {
          const res = await api.insert<any>('postpartum_data', patch as any);
          if (res && res[0]?.id) patch.id = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to update postpartum data.', variant: 'destructive' });
        throw err;
      }
    }
    setPostpartumData((prev) => ({ ...prev, ...patch }));
  };

  const recordKegel = async () => {
    const count = (postpartumData.kegel_count || 0) + 5;
    let newId = undefined;
    if (signedIn) {
      try {
        if (postpartumData?.id) {
          await api.update('postpartum_data', postpartumData.id, { kegel_count: count });
        } else {
          const res = await api.insert<any>('postpartum_data', { kegel_count: count } as any);
          if (res && res[0]?.id) newId = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to record Kegels.', variant: 'destructive' });
        throw err;
      }
    }
    setPostpartumData((prev) => ({ ...prev, kegel_count: count, ...(newId && { id: newId }) }));
  };

  const sendMessage = async (text: string, assessmentId?: string, imageBase64?: string) => {
    const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const userMsgId = `u-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: text || (imageBase64 ? 'Uploaded medical document for review' : ''),
      time: now,
      image: imageBase64,
    };
    setMessages((prev) => [...prev, userMsg]);

    if (signedIn) {
      try {
        const { reply, extracted_document } = await api.chat(text, assessmentId, imageBase64);
        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            role: 'sita',
            text: reply,
            time: now,
            extracted_document,
          },
        ]);
        if (extracted_document) {
          refreshAll();
        }
      } catch (err: any) {
        let displayErrorText = err?.message || 'SITA could not reach the AI service right now. Please check your connection and try again.';
        if (err?.code === 'AI_RATE_LIMIT' || err?.status === 429) {
          displayErrorText = 'SITA is currently experiencing high demand. Please wait a moment and click retry.';
        } else if (err?.code === 'AUTH_EXPIRED' || err?.status === 401) {
          displayErrorText = 'Your session has expired. Please sign in again to continue chatting with SITA.';
        } else if (err?.code === 'AI_PROVIDER_NOT_CONFIGURED' || (err?.status === 503 && String(err?.message || '').includes('configured'))) {
          displayErrorText = 'The AI service is not yet configured (GROQ_API_KEY). Please configure your server environment.';
        } else if (err?.code === 'AI_UPSTREAM_BUSY' || err?.status === 503) {
          displayErrorText = 'The AI model is momentarily busy or updating. Please click retry in a few seconds.';
        } else if (err?.code === 'NETWORK_ERROR') {
          displayErrorText = 'Unable to reach the SITA server. Please check your network connection and try again.';
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            role: 'sita',
            text: displayErrorText,
            time: now,
            isError: true,
            canRetry: true,
            lastUserPrompt: text,
            lastAssessmentId: assessmentId,
            lastImageBase64: imageBase64,
          },
        ]);
      }
    } else {
      // Offline fallback
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            role: 'sita',
            text: `Thank you for reaching out, ${profile?.display_name || 'friend'} 🌸. I am here to walk beside you. Remember that symptoms like cramps, fatigue, and mood shifts are signals from your body. To enable full AI intelligence with SITA, please sign in or set up your account.`,
            time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          },
        ]);
      }, 400);
    }
  };

  const clearMessages = async () => {
    if (signedIn) {
      try {
        await api.clearChatHistory();
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to clear chat history.', variant: 'destructive' });
        throw err;
      }
    }
    setMessages([]);
  };

  const runPCOSScreening = async (input: PCOSScreeningInput) => {
    return api.pcosScreening(input);
  };

  const runSymptomTriage = async (input: SymptomTriageInput) => {
    return api.symptomTriage(input);
  };

  const signOut = async () => {
    await api.logout().catch(() => undefined);
    setSignedIn(false);
    setUser(null);
    setProfile(null);
    setPeriodDateStrings([]);
    setCycleLogs([]);
    setMoodEntries([]);
    setSymptomLogs([]);
    setPregnancyData(defaultPregnancyData);
    setPostpartumData(defaultPostpartumData);
    setMessages(welcomeChat);
  };

  const exportData = () => {
    window.open(api.exportDataUrl(), '_blank');
  };

  const purgeAccountData = async () => {
    await api.purgeAccountData();
    setSignedIn(false);
    setUser(null);
    setProfile(null);
    setPeriodDateStrings([]);
    setCycleLogs([]);
    setMoodEntries([]);
    setMessages([]);
  };

  const value = useMemo(
    () => ({
      profile,
      mode,
      setMode,
      updateProfile,
      periodDateStrings,
      cycleLogs,
      togglePeriodDayString,
      logPeriodDetails,
      deletePeriodLog,
      moodEntries,
      addMood,
      deleteMood,
      symptomLogs,
      addSymptom,
      pregnancyData,
      updatePregnancyData,
      recordKick,
      resetKicks,
      addAppointment,
      postpartumData,
      updatePostpartumData,
      recordKegel,
      messages,
      sendMessage,
      clearMessages,
      runPCOSScreening,
      runSymptomTriage,
      privacy,
      setPrivacy,
      notifications,
      setNotifications,
      signedIn,
      user,
      loading,
      signOut,
      exportData,
      medicalRecords,
      addMedicalRecord,
      updateMedicalRecord,
      deleteMedicalRecord,
      extractDocument,
      getRecordComparison,
      getDoctorSummary,
      purgeAccountData,
      refreshAll,
    }),
    [
      profile,
      mode,
      periodDateStrings,
      cycleLogs,
      moodEntries,
      symptomLogs,
      pregnancyData,
      postpartumData,
      messages,
      privacy,
      notifications,
      signedIn,
      user,
      loading,
      medicalRecords,
      refreshAll,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSitaStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useSitaStore must be used inside SitaStoreProvider');
  return context;
}

export type { Mood };
