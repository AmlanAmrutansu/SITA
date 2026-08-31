import { useState, useRef, useMemo, useEffect, useCallback, type FormEvent, type ReactNode } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Baby,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Droplets,
  Edit3,
  FileCheck,
  FileText,
  Flame,
  Flower2,
  HeartPulse,
  Info,
  MessageCircle,
  Minus,
  Pill,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  Sun,
  Thermometer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  UserRound,
  X,
} from 'lucide-react';
import { useSitaStore, type MedicalRecord, type StructuredMedicalRecord, type StructuredMedication } from '@/data/store';
import { AppShell } from '@/components/AppShell';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export interface AssessmentRecord {
  id?: string;
  type?: 'pcos' | 'triage' | 'symptom' | string;
  title?: string;
  result?: string;
  risk_level?: string;
  explanation?: string;
  created_at?: string;
  metadata?: any;
}

export function MedicalRecordsPage() {
  const [, setLocation] = useLocation();
  const {
    profile,
    mode,
    periodDateStrings,
    cycleLogs,
    moodEntries,
    symptomLogs,
    pregnancyData,
    postpartumData,
    medicalRecords,
    loading,
    refreshAll,
    addMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    extractDocument,
    getRecordComparison,
    getDoctorSummary,
  } = useSitaStore();

  // Section Switcher
  const [activeSection, setActiveSection] = useState<'all' | 'documents' | 'cycle' | 'mood' | 'assessments' | 'maternal'>('all');

  // Search & Filter within Documents
  const [docFilter, setDocFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assessments state
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState<boolean>(false);

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [doctorSummaryOpen, setDoctorSummaryOpen] = useState(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<MedicalRecord | null>(null);

  // Upload/Extraction states
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [documentTypeHint, setDocumentTypeHint] = useState<string>('Prescription');
  const [extracting, setExtracting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verification editor state
  const [editableRecord, setEditableRecord] = useState<{
    title: string;
    document_type: string;
    document_date: string;
    doctor_name?: string;
    hospital_name?: string;
    diagnoses: string[];
    medications: StructuredMedication[];
    lab_results: any[];
    important_findings: string[];
    notes: string;
    extracted_text: string;
  } | null>(null);

  // Comparison & Doctor Summary results
  const [activeComparison, setActiveComparison] = useState<any | null>(null);
  const [doctorSummaryData, setDoctorSummaryData] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Error state for manual retry banner
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load assessments if table exists
  const loadAssessments = useCallback(async () => {
    setLoadingAssessments(true);
    try {
      const data = await api.list<any>('assessments', 'created_at.desc', 20).catch(() => []);
      if (Array.isArray(data)) {
        setAssessments(data);
      }
    } catch {
      // Gracefully silent fallback
      setAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  }, []);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await Promise.all([refreshAll(), loadAssessments()]);
      toast({ title: 'Records Updated', description: 'Your health workspace is up to date.' });
    } catch (err: any) {
      setRefreshError("We couldn't refresh your records right now. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered medical records
  const filteredRecords = useMemo(() => {
    if (!medicalRecords) return [];
    return medicalRecords.filter((rec) => {
      // Document type filter
      if (docFilter === 'prescriptions' && rec.document_type !== 'Prescription') return false;
      if (docFilter === 'labs' && rec.document_type !== 'Lab Report') return false;
      if (docFilter === 'imaging' && !rec.document_type?.toLowerCase().includes('ultrasound') && !rec.document_type?.toLowerCase().includes('imaging') && !rec.document_type?.toLowerCase().includes('scan')) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = rec.title?.toLowerCase().includes(q);
        const matchesDoctor = rec.doctor_name?.toLowerCase().includes(q);
        const matchesHospital = rec.hospital_name?.toLowerCase().includes(q);
        const matchesMeds = rec.structured_data?.medications?.some(m => m.name.toLowerCase().includes(q));
        const matchesLabs = rec.structured_data?.lab_results?.some(l => l.test_name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDoctor && !matchesHospital && !matchesMeds && !matchesLabs) {
          return false;
        }
      }
      return true;
    });
  }, [medicalRecords, docFilter, searchQuery]);

  // Aggregate stats across all medical records
  const totalMedicationsCount = useMemo(() => {
    if (!medicalRecords) return 0;
    const medNames = new Set<string>();
    medicalRecords.forEach((rec) => {
      rec.structured_data?.medications?.forEach((m) => {
        if (m?.name) medNames.add(m.name.trim().toLowerCase());
      });
    });
    return medNames.size;
  }, [medicalRecords]);

  const totalLabTestsCount = useMemo(() => {
    if (!medicalRecords) return 0;
    const tests = new Set<string>();
    medicalRecords.forEach((rec) => {
      rec.structured_data?.lab_results?.forEach((l) => {
        if (l?.test_name) tests.add(l.test_name.trim().toLowerCase());
      });
    });
    return tests.size;
  }, [medicalRecords]);

  // Handle image upload input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Start OCR Extraction via SITA AI
  const handleStartExtraction = async (e: FormEvent) => {
    e.preventDefault();
    if (!previewImage && !rawText.trim()) {
      toast({ title: 'Missing input', description: 'Please provide a document image or paste text.', variant: 'destructive' });
      return;
    }

    setExtracting(true);
    try {
      const result = await extractDocument(previewImage || undefined, rawText.trim() || undefined, documentTypeHint);
      const structured = result.structured_data || {};

      setEditableRecord({
        title: structured.title || `${documentTypeHint} - ${new Date().toLocaleDateString()}`,
        document_type: structured.document_type || documentTypeHint,
        document_date: structured.document_date || new Date().toISOString().split('T')[0],
        doctor_name: structured.doctor_name || '',
        hospital_name: structured.hospital_name || '',
        diagnoses: structured.diagnoses || [],
        medications: structured.medications || [],
        lab_results: structured.lab_results || [],
        important_findings: structured.important_findings || [],
        notes: structured.notes || '',
        extracted_text: result.extracted_text || '',
      });

      setUploadModalOpen(false);
      setVerificationModalOpen(true);
      toast({ title: 'Extraction Completed', description: 'Please review and verify clinical details before saving.' });
    } catch (err: any) {
      toast({ title: 'Extraction Failed', description: err?.message || 'Could not parse document. Please try again.', variant: 'destructive' });
    } finally {
      setExtracting(false);
    }
  };

  // Save verified record to Health Memory
  const handleSaveVerifiedRecord = async () => {
    if (!editableRecord) return;
    try {
      const structured: StructuredMedicalRecord = {
        title: editableRecord.title,
        document_type: editableRecord.document_type,
        document_date: editableRecord.document_date,
        doctor_name: editableRecord.doctor_name,
        hospital_name: editableRecord.hospital_name,
        diagnoses: editableRecord.diagnoses,
        medications: editableRecord.medications,
        lab_results: editableRecord.lab_results,
        important_findings: editableRecord.important_findings,
        notes: editableRecord.notes,
        confidence: 'high',
      };

      await addMedicalRecord({
        title: editableRecord.title,
        document_type: editableRecord.document_type,
        document_date: editableRecord.document_date,
        doctor_name: editableRecord.doctor_name,
        hospital_name: editableRecord.hospital_name,
        extracted_text: editableRecord.extracted_text,
        verification_status: 'verified',
        structured_data: structured,
      });

      setVerificationModalOpen(false);
      setEditableRecord(null);
      setPreviewImage(null);
      setRawText('');
      toast({ title: 'Record Added', description: 'Saved to your personal SITA Health Memory.' });
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err?.message || 'Could not save record.', variant: 'destructive' });
    }
  };

  // Open "What Changed?" comparison modal
  const handleCompareSpecificRecord = async (targetRec: MedicalRecord) => {
    try {
      const comparison = await getRecordComparison(targetRec);
      setActiveComparison(comparison);
      setComparisonModalOpen(true);
    } catch (err: any) {
      toast({ title: 'Comparison Error', description: 'Could not generate comparison.', variant: 'destructive' });
    }
  };

  // Open Doctor Summary Modal
  const handleOpenDoctorSummary = async () => {
    setDoctorSummaryOpen(true);
    setLoadingSummary(true);
    try {
      const report = await getDoctorSummary();
      setDoctorSummaryData(report);
    } catch (err: any) {
      toast({ title: 'Summary Error', description: 'Could not compile doctor summary.', variant: 'destructive' });
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAskSitaFromComparison = (prompt: string) => {
    setComparisonModalOpen(false);
    setLocation(`/sita?prompt=${encodeURIComponent(prompt)}`);
  };

  // Patient display details
  const displayName = profile?.name?.trim() || profile?.display_name?.trim() || 'Health Member';
  const reproductiveModeLabel = mode === 'pregnant' ? 'Pregnant' : mode === 'postpartum' ? 'Postpartum Recovery' : 'Cycle & General Wellness';

  return (
    <AppShell>
      {/* Top Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#fceef4] px-3.5 py-1 text-[11px] font-bold text-[#b85779]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Private Health Workspace</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#4c3850] sm:text-4xl" data-testid="heading-records">
            Personal Health Records
          </h1>
          <p className="mt-1 text-xs text-[#8c7487]">
            Your comprehensive clinical memory, cycle logs, check-ins, assessments, and medical documents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#eadbe4] bg-white/80 px-4 py-2.5 text-xs font-bold text-[#7d657a] shadow-xs backdrop-blur-sm transition hover:bg-white disabled:opacity-60"
            title="Refresh All Records"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#a8597a] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            onClick={handleOpenDoctorSummary}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#f0dce6] bg-white px-4 py-2.5 text-xs font-bold text-[#6f566c] shadow-xs hover:bg-[#faf2f6] transition"
            data-testid="button-doctor-summary"
          >
            <Stethoscope className="h-4 w-4 text-[#8a5d93]" />
            <span>Doctor Brief</span>
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d65f8a] to-[#be4c74] px-5 py-2.5 text-xs font-bold text-white shadow-[0_6px_20px_rgba(214,95,138,0.28)] transition hover:-translate-y-0.5 hover:shadow-md"
            data-testid="button-upload-record"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Error retry banner */}
      {refreshError && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#f8d7da] bg-[#fff5f5] p-4 text-xs text-[#b02a37]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{refreshError}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#b02a37] shadow-xs hover:bg-[#fde8e8]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Section Navigation Tabs */}
      <div className="mb-6 flex overflow-x-auto pb-1">
        <div className="inline-flex rounded-full border border-white/60 bg-white/40 p-1 shadow-xs backdrop-blur-md">
          {[
            { id: 'all', label: 'All Records', icon: Activity, count: null },
            { id: 'documents', label: 'Medical Documents', icon: FileText, count: medicalRecords.length },
            { id: 'cycle', label: 'Cycle History', icon: CalendarDays, count: periodDateStrings.length },
            { id: 'mood', label: 'Mood & Symptoms', icon: Smile, count: moodEntries.length + symptomLogs.length },
            { id: 'assessments', label: 'Assessments', icon: Sparkles, count: assessments.length },
            { id: 'maternal', label: 'Maternal Care', icon: Baby, count: mode !== 'not-pregnant' ? 1 : 0 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                  active
                    ? 'bg-white text-[#b05276] shadow-sm'
                    : 'text-[#887083] hover:text-[#523d51] hover:bg-white/40'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${active ? 'bg-[#fae6ef] text-[#b05276]' : 'bg-black/5 text-[#887083]'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-32 rounded-[2rem] bg-white/60 border border-white/70" />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-64 rounded-[1.8rem] bg-white/50 border border-white/60" />
            <div className="h-64 rounded-[1.8rem] bg-white/50 border border-white/60" />
            <div className="h-64 rounded-[1.8rem] bg-white/50 border border-white/60" />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ========================================================================= */}
          {/* 1. HEALTH PROFILE SUMMARY CARD (Shown in 'all') */}
          {/* ========================================================================= */}
          {(activeSection === 'all') && (
            <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-[#fff6fa]/90 via-[#fefafd]/90 to-[#f6f0f9]/90 p-6 shadow-[0_8px_32px_rgba(152,126,145,0.06)] backdrop-blur-xl">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#eecad8] to-[#db9db7] text-2xl font-bold text-white shadow-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-bold text-[#4e384e]">{displayName}</h2>
                      <span className="rounded-full bg-[#f7e4ed] px-3 py-0.5 text-[10px] font-bold text-[#b25375]">
                        {reproductiveModeLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#8c7488]">
                      {profile?.email || 'Authenticated SITA Account'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#7a6476]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-[#b27590]" />
                        Typical Cycle: <strong>{profile?.typical_cycle_length || 28} days</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[#b27590]" />
                        Typical Period: <strong>{profile?.typical_period_length || 5} days</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#eedde6] bg-white/80 px-4 py-2 text-xs font-bold text-[#7d657a] shadow-xs hover:bg-white"
                  >
                    <UserRound className="h-3.5 w-3.5 text-[#b25375]" />
                    <span>Edit Profile</span>
                  </Link>
                  <Link
                    href="/mode"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#fdeef4] px-4 py-2 text-xs font-bold text-[#b55276] hover:bg-[#fadce7]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Change Mode</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. MEDICAL DOCUMENTS SECTION (Shown in 'all' or 'documents') */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'documents') && (
            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#4f3850] flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#b25275]" />
                    Medical Documents &amp; Prescriptions
                  </h3>
                  <p className="text-xs text-[#8c7487]">
                    Prescriptions, lab values, ultrasound scans, and clinician notes with automated memory extraction.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#a890a2]" />
                    <input
                      type="text"
                      placeholder="Search medications, tests, doctors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-full border border-white/80 bg-white/70 pl-8 pr-3 py-1.5 text-xs text-[#4f394f] shadow-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#e8a3bc]"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex rounded-full border border-white/60 bg-white/40 p-0.5 shadow-xs backdrop-blur-md text-[11px]">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'prescriptions', label: 'Prescriptions' },
                      { id: 'labs', label: 'Labs' },
                      { id: 'imaging', label: 'Imaging' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDocFilter(tab.id)}
                        className={`rounded-full px-3 py-1 font-bold transition ${
                          docFilter === tab.id
                            ? 'bg-white text-[#994767] shadow-xs'
                            : 'text-[#877083] hover:text-[#533d52]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Continuity Overview Strip */}
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/70 bg-white/50 p-4 shadow-xs backdrop-blur-md">
                <div className="text-center border-r border-[#f2e2eb] pr-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9f859a]">Documents</p>
                  <p className="font-display text-2xl text-[#5b4258]">{medicalRecords.length}</p>
                  <p className="text-[10px] text-[#937b8f]">Stored securely</p>
                </div>
                <div className="text-center border-r border-[#f2e2eb] px-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9f859a]">Active Meds</p>
                  <p className="font-display text-2xl text-[#a44c6e]">{totalMedicationsCount}</p>
                  <p className="text-[10px] text-[#937b8f]">Extracted dosage</p>
                </div>
                <div className="text-center pl-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9f859a]">Lab Markers</p>
                  <p className="font-display text-2xl text-[#7e629b]">{totalLabTestsCount}</p>
                  <p className="text-[10px] text-[#937b8f]">Longitudinal trends</p>
                </div>
              </div>

              {/* Document Cards Grid */}
              {filteredRecords.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-[#ecdde6] bg-white/40 p-10 text-center backdrop-blur-sm">
                  <FileText className="mx-auto h-12 w-12 text-[#ccaebf]" />
                  <h4 className="mt-3 font-display text-lg font-bold text-[#5a4257]">
                    {medicalRecords.length === 0 ? 'No medical documents yet' : 'No documents match your filter'}
                  </h4>
                  <p className="mx-auto mt-1 max-w-md text-xs text-[#8d7589]">
                    {medicalRecords.length === 0
                      ? 'Upload doctor prescriptions, lab results, or scans to extract medications, view trend deltas, and empower SITA AI answers.'
                      : 'Try clearing your search query or switching document filter tabs.'}
                  </p>
                  {medicalRecords.length === 0 && (
                    <button
                      onClick={() => setUploadModalOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#d65f8a] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#bd4e75]"
                    >
                      <Plus className="h-4 w-4" /> Upload Document
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {filteredRecords.map((record) => {
                    const data = record.structured_data || {};
                    const meds = data.medications || [];
                    const labs = data.lab_results || [];
                    const diagnoses = data.diagnoses || [];
                    const findings = data.important_findings || [];

                    return (
                      <div
                        key={record.id || record.title}
                        className="group relative flex flex-col justify-between rounded-[1.8rem] border border-white/70 bg-white/60 p-6 shadow-[0_4px_24px_rgba(152,126,145,0.05)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-[0_8px_32px_rgba(152,126,145,0.1)]"
                        data-testid={`card-medical-record-${record.id}`}
                      >
                        <div>
                          {/* Top Badges & Date */}
                          <div className="flex items-center justify-between gap-2 border-b border-[#f3e6ee] pb-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fae8f0] px-3 py-1 text-[10px] font-bold text-[#b25275]">
                              <FileCheck className="h-3 w-3" />
                              {record.document_type || 'Prescription'}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#9b8396]">
                              <Calendar className="h-3.5 w-3.5" />
                              {record.document_date || 'Undated'}
                            </span>
                          </div>

                          {/* Title & Clinician */}
                          <div className="mt-3">
                            <h4 className="font-display text-[1.3rem] leading-snug font-bold text-[#4f384d]">{record.title}</h4>
                            {(record.doctor_name || record.hospital_name) && (
                              <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#7e657b]">
                                {record.doctor_name && (
                                  <span className="inline-flex items-center gap-1">
                                    <User className="h-3 w-3 text-[#9f859a]" /> {record.doctor_name}
                                  </span>
                                )}
                                {record.hospital_name && (
                                  <span className="inline-flex items-center gap-1">
                                    <Building2 className="h-3 w-3 text-[#9f859a]" /> {record.hospital_name}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* Diagnoses Pills */}
                          {diagnoses.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {diagnoses.map((d, i) => (
                                <span key={i} className="rounded-full bg-[#f4e8f8] px-2.5 py-0.5 text-[10px] font-semibold text-[#805e94]">
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Medications Preview */}
                          {meds.length > 0 && (
                            <div className="mt-3.5 rounded-2xl bg-[#faf5f8] p-3">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9d7d93]">
                                <Pill className="h-3.5 w-3.5 text-[#bf5f83]" /> Medications ({meds.length})
                              </p>
                              <div className="mt-1.5 space-y-1">
                                {meds.slice(0, 3).map((m, idx) => (
                                  <div key={idx} className="flex items-baseline justify-between text-xs">
                                    <span className="font-semibold text-[#573e54]">{m.name}</span>
                                    <span className="text-[11px] text-[#8e768a]">
                                      {m.dosage} {m.frequency ? `• ${m.frequency}` : ''}
                                    </span>
                                  </div>
                                ))}
                                {meds.length > 3 && (
                                  <p className="text-[10px] font-medium text-[#b0708f]">+ {meds.length - 3} more medications</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Lab Results Preview */}
                          {labs.length > 0 && (
                            <div className="mt-3 rounded-2xl bg-[#f5f8fa] p-3">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7990a4]">
                                <Activity className="h-3.5 w-3.5 text-[#5484ab]" /> Lab Values ({labs.length})
                              </p>
                              <div className="mt-1.5 grid grid-cols-2 gap-2">
                                {labs.slice(0, 4).map((l: any, idx: number) => (
                                  <div key={idx} className="rounded-xl bg-white/80 p-2 text-xs shadow-xs">
                                    <p className="truncate text-[10px] font-medium text-[#84929e]">{l.test_name}</p>
                                    <p className="mt-0.5 font-bold text-[#455a64]">
                                      {l.value} <span className="text-[10px] font-normal text-[#84929e]">{l.unit}</span>
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Findings */}
                          {findings.length > 0 && (
                            <div className="mt-3 rounded-2xl bg-[#fcf8ee] p-3 text-xs text-[#7d6741]">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9e8354]">Key Finding</p>
                              <p className="mt-1 leading-relaxed">{findings[0]}</p>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="mt-5 flex items-center justify-between border-t border-[#f4e7ef] pt-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCompareSpecificRecord(record)}
                              className="inline-flex items-center gap-1 rounded-full bg-[#fdeef3] px-3 py-1.5 text-[11px] font-bold text-[#ba567a] hover:bg-[#fadce6]"
                            >
                              <Sparkles className="h-3 w-3" /> Compare
                            </button>
                            <button
                              onClick={() =>
                                setLocation(
                                  `/sita?prompt=${encodeURIComponent(
                                    `Could you review and explain the clinical findings in my ${record.title} (${record.document_type} on ${record.document_date})?`
                                  )}`
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-bold text-[#7a647b] shadow-xs hover:bg-white"
                            >
                              <MessageCircle className="h-3 w-3 text-[#9b73a3]" /> Ask SITA
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedRecordForDetail(record)}
                              className="rounded-full bg-white/60 p-2 text-[#91788c] hover:bg-white hover:text-[#533d52]"
                              title="View Full Record"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (record.id && confirm(`Delete "${record.title}" from Health Memory?`)) {
                                  await deleteMedicalRecord(record.id);
                                  toast({ title: 'Record removed', description: 'The document was deleted.' });
                                }
                              }}
                              className="rounded-full bg-white/60 p-2 text-[#b88094] hover:bg-[#fff0f4] hover:text-[#c4496b]"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ========================================================================= */}
          {/* 3. CYCLE & MENSTRUAL HISTORY SECTION (Shown in 'all' or 'cycle') */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'cycle') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#4f3850] flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-[#d66b8d]" />
                    Cycle &amp; Period History
                  </h3>
                  <p className="text-xs text-[#8c7487]">
                    Logged bleeding dates, flow intensities, cramp levels, and associated symptoms.
                  </p>
                </div>
                <Link
                  href="/cycle"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#b55276] hover:underline"
                >
                  Open Cycle Tracker <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {periodDateStrings.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-[#ecdde6] bg-white/40 p-8 text-center backdrop-blur-sm">
                  <Flower2 className="mx-auto h-10 w-10 text-[#cdaec0]" />
                  <h4 className="mt-3 font-display text-base font-bold text-[#5b4258]">No cycle records yet</h4>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-[#8e768b]">
                    Start logging your cycle to build your personal health history and predictive rhythm.
                  </p>
                  <Link
                    href="/cycle"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#d65f8a] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#bd4e75]"
                  >
                    <Plus className="h-4 w-4" /> Log Period Day
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {periodDateStrings.slice(0, 6).map((dStr, idx) => {
                    const matchedLog = cycleLogs.find((c) => c.period_date === dStr);
                    const d = new Date(dStr);
                    const formatted = isNaN(d.getTime()) ? dStr : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-white/70 bg-white/60 p-4 shadow-xs backdrop-blur-md"
                      >
                        <div className="flex items-center justify-between border-b border-[#f4e6ef] pb-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-[#553e53]">
                            <Droplets className="h-3.5 w-3.5 text-[#e981a1]" />
                            {formatted}
                          </span>
                          {matchedLog?.flow && (
                            <span className="rounded-full bg-[#fdeaf1] px-2 py-0.5 text-[10px] font-bold text-[#b55276] capitalize">
                              {matchedLog.flow}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 space-y-1 text-xs text-[#7e667b]">
                          {matchedLog?.cramps !== undefined && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span>Cramp Intensity:</span>
                              <span className="font-bold text-[#a84c6e]">{matchedLog.cramps}/10</span>
                            </div>
                          )}
                          {matchedLog?.symptoms && matchedLog.symptoms.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {matchedLog.symptoms.map((s, i) => (
                                <span key={i} className="rounded-md bg-[#f6eef8] px-2 py-0.5 text-[10px] font-medium text-[#7d5d93]">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                          {matchedLog?.notes && (
                            <p className="pt-1 text-[11px] italic text-[#957e92]">"{matchedLog.notes}"</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ========================================================================= */}
          {/* 4. SYMPTOMS & MOOD HISTORY SECTION (Shown in 'all' or 'mood') */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'mood') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#4f3850] flex items-center gap-2">
                    <Smile className="h-5 w-5 text-[#8870ae]" />
                    Symptoms &amp; Mood Check-ins
                  </h3>
                  <p className="text-xs text-[#8c7487]">
                    Longitudinal daily check-ins, stress patterns, energy states, and physical symptoms.
                  </p>
                </div>
                <Link
                  href="/mood"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#8870ae] hover:underline"
                >
                  Log Mood <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Mood Check-ins */}
                <div className="rounded-[1.8rem] border border-white/70 bg-white/60 p-5 shadow-xs backdrop-blur-md">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#9b8398] flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5 text-[#dca64e]" /> Recent Mood Entries ({moodEntries.length})
                  </h4>

                  {moodEntries.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#9c8699]">
                      <Smile className="mx-auto h-8 w-8 text-[#d4bed0] mb-2" />
                      <p className="font-semibold">No mood entries yet</p>
                      <p className="mt-0.5 text-[11px]">Take a gentle moment to record how you feel.</p>
                      <Link
                        href="/mood"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#f4eaf7] px-4 py-1.5 text-[11px] font-bold text-[#886aa8] hover:bg-[#ebd9f1]"
                      >
                        <Plus className="h-3 w-3" /> Check In
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2.5">
                      {moodEntries.slice(0, 5).map((m) => {
                        const d = new Date(m.date);
                        const formatted = isNaN(d.getTime()) ? m.date : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        return (
                          <div key={m.id} className="flex items-center justify-between rounded-xl bg-white/80 p-2.5 text-xs shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <span className="font-semibold text-[#543d52]">{m.mood}</span>
                              <span className="text-[10px] text-[#9c8599]">• {formatted}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-[#866e83]">
                              <span>Stress: <strong>{m.stress}/10</strong></span>
                              <span>Energy: <strong>{m.energy}/10</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Symptom Logs */}
                <div className="rounded-[1.8rem] border border-white/70 bg-white/60 p-5 shadow-xs backdrop-blur-md">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#9b8398] flex items-center gap-1.5">
                    <Thermometer className="h-3.5 w-3.5 text-[#b2577c]" /> Logged Symptoms ({symptomLogs.length})
                  </h4>

                  {symptomLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#9c8699]">
                      <Thermometer className="mx-auto h-8 w-8 text-[#d4bed0] mb-2" />
                      <p className="font-semibold">No symptoms logged yet</p>
                      <p className="mt-0.5 text-[11px]">Track cramps, headaches, spotting, or changes as they happen.</p>
                      <Link
                        href="/"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fae8f0] px-4 py-1.5 text-[11px] font-bold text-[#b55276] hover:bg-[#f6d7e4]"
                      >
                        <Plus className="h-3 w-3" /> Log Symptom
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {symptomLogs.slice(0, 5).map((s) => {
                        const d = new Date(s.logged_at);
                        const formatted = isNaN(d.getTime()) ? s.logged_at : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        return (
                          <div key={s.id} className="flex items-center justify-between rounded-xl bg-white/80 p-2.5 text-xs shadow-2xs">
                            <div>
                              <p className="font-semibold text-[#543d52]">{s.symptom}</p>
                              <p className="text-[10px] text-[#9c8599]">{s.category || 'General'} • {formatted}</p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                                s.severity === 'severe'
                                  ? 'bg-[#ffebee] text-[#c62828]'
                                  : s.severity === 'moderate'
                                  ? 'bg-[#fff3e0] text-[#e65100]'
                                  : 'bg-[#f1f8e9] text-[#33691e]'
                              }`}
                            >
                              {s.severity || 'mild'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 5. CLINICAL ASSESSMENTS SECTION (Shown in 'all' or 'assessments') */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'assessments') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#4f3850] flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#865da1]" />
                    Clinical Assessments &amp; Screenings
                  </h3>
                  <p className="text-xs text-[#8c7487]">
                    PCOS risk assessments, symptom triage reports, and clinical questionnaire summaries.
                  </p>
                </div>
                <Link
                  href="/sita"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#865da1] hover:underline"
                >
                  Consult SITA <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {assessments.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-[#ecdde6] bg-white/40 p-8 text-center backdrop-blur-sm">
                  <Sparkles className="mx-auto h-10 w-10 text-[#ccaec0]" />
                  <h4 className="mt-3 font-display text-base font-bold text-[#5b4258]">No formal assessments completed yet</h4>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-[#8e768b]">
                    You can run a gentle PCOS risk screening or symptom triage session anytime with SITA.
                  </p>
                  <Link
                    href="/sita?prompt=I would like to complete a gentle health assessment with you."
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#8e68ab] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#7a5596]"
                  >
                    <Sparkles className="h-4 w-4" /> Start Assessment with SITA
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {assessments.map((a, idx) => (
                    <div key={a.id || idx} className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-xs backdrop-blur-md">
                      <div className="flex items-center justify-between border-b border-[#f2e4ed] pb-2.5">
                        <span className="font-display font-bold text-[#50394f]">{a.title || 'Health Assessment'}</span>
                        <span className="rounded-full bg-[#f4e8f8] px-2.5 py-0.5 text-[10px] font-bold text-[#805e94]">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Recorded'}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-[#6e586c]">
                        {a.result && (
                          <p>
                            <strong>Result:</strong> <span className="font-semibold text-[#8b4f74]">{a.result}</span>
                          </p>
                        )}
                        {a.explanation && (
                          <p className="leading-relaxed text-[11px] text-[#7d677a]">{a.explanation}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ========================================================================= */}
          {/* 6. PREGNANCY / POSTPARTUM SECTION (Shown in 'all' or 'maternal') */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'maternal') && (
            <section className="space-y-4">
              <div>
                <h3 className="font-display text-xl font-bold text-[#4f3850] flex items-center gap-2">
                  <Baby className="h-5 w-5 text-[#7ea086]" />
                  Maternal &amp; Postpartum Care Records
                </h3>
                <p className="text-xs text-[#8c7487]">
                  Trimester logs, fetal kick sessions, clinical recovery notes, and postpartum milestones.
                </p>
              </div>

              {mode === 'pregnant' ? (
                <div className="rounded-[1.8rem] border border-white/70 bg-gradient-to-br from-[#f8f5fc]/90 to-[#fff8fb]/90 p-6 shadow-xs backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-[#f1e4ee] pb-3">
                    <span className="font-display text-lg font-bold text-[#563e55]">Active Pregnancy Record</span>
                    <Link href="/pregnancy" className="text-xs font-bold text-[#8f6cae] hover:underline">
                      View Pregnancy Dashboard &gt;
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs">
                    <div className="rounded-xl bg-white/70 p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase text-[#9e8396]">Due Date</p>
                      <p className="mt-1 font-bold text-[#523c52]">{pregnancyData.due_date || 'Not set'}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase text-[#9e8396]">Kick Counts</p>
                      <p className="mt-1 font-bold text-[#523c52]">{pregnancyData.kick_count || 0} recorded</p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase text-[#9e8396]">Upcoming Appointments</p>
                      <p className="mt-1 font-bold text-[#523c52]">{pregnancyData.appointments?.length || 0} scheduled</p>
                    </div>
                  </div>
                </div>
              ) : mode === 'postpartum' ? (
                <div className="rounded-[1.8rem] border border-white/70 bg-gradient-to-br from-[#edf6ef]/90 to-[#fbfdfb]/90 p-6 shadow-xs backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-[#e2ede4] pb-3">
                    <span className="font-display text-lg font-bold text-[#446549]">Postpartum Healing Record</span>
                    <Link href="/postpartum" className="text-xs font-bold text-[#55865b] hover:underline">
                      View Postpartum Dashboard &gt;
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs">
                    <div className="rounded-xl bg-white/70 p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase text-[#73967a]">Baby Birth Date</p>
                      <p className="mt-1 font-bold text-[#3c5940]">{postpartumData.birth_date || 'Not recorded'}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase text-[#73967a]">Bleeding Stage</p>
                      <p className="mt-1 font-bold text-[#3c5940] capitalize">{postpartumData.bleeding_level || 'Light'}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase text-[#73967a]">Kegel Exercises</p>
                      <p className="mt-1 font-bold text-[#3c5940]">{postpartumData.kegel_count || 0} sessions</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.8rem] border border-white/60 bg-white/40 p-6 text-center backdrop-blur-sm">
                  <Baby className="mx-auto h-9 w-9 text-[#ccaebf]" />
                  <h4 className="mt-2 font-display text-sm font-bold text-[#5a4257]">Currently in Cycle &amp; General Wellness Mode</h4>
                  <p className="mt-1 text-xs text-[#8d7589]">
                    Pregnancy tracking, gestational milestones, and postpartum recovery become active when you switch modes.
                  </p>
                  <Link
                    href="/mode"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-[#ecdde6] px-4 py-1.5 text-xs font-bold text-[#7d657a] hover:bg-white"
                  >
                    Switch Reproductive Mode &gt;
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. UPLOAD & OCR / SITA EXTRACTION MODAL */}
      {/* ========================================================================= */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c2a3b]/40 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setUploadModalOpen(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2.2rem] border border-[#f0e2e8] bg-[#fffafb] p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between border-b border-[#f1e6ec] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b3748c]">SITA Health Memory</p>
                <h2 className="font-display text-2xl text-[#523c52]">Upload Medical Record</h2>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="rounded-full bg-[#f6ebf1] p-2 text-[#8c7083] hover:bg-[#edd8e4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleStartExtraction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6f576a]">Document Type</label>
                <select
                  value={documentTypeHint}
                  onChange={(e) => setDocumentTypeHint(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-xs text-[#4d394e] shadow-xs outline-none focus:ring-2 focus:ring-[#e8a3bc]"
                >
                  <option value="Prescription">Doctor Prescription (Rx)</option>
                  <option value="Lab Report">Lab / Blood Report</option>
                  <option value="Ultrasound Report">Ultrasound / Imaging Scan</option>
                  <option value="Doctor Note">Clinical Progress Note / OPD Slip</option>
                  <option value="Discharge Summary">Discharge Summary / Hospital Record</option>
                  <option value="Other">Other Medical Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6f576a]">Document Photograph / Scan</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-[1.6rem] border-2 border-dashed border-[#e6d0dc] bg-[#fff3f7]/50 p-6 text-center transition hover:border-[#d65f8a] hover:bg-[#fff0f5]"
                >
                  {previewImage ? (
                    <div className="relative">
                      <img src={previewImage} alt="Uploaded Document" className="max-h-48 rounded-xl object-contain shadow-sm" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(null);
                        }}
                        className="absolute -right-2 -top-2 rounded-full bg-[#c74c6e] p-1.5 text-white shadow-md hover:bg-[#a83b58]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#c06584] shadow-sm">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="mt-3 text-xs font-bold text-[#6a4f65]">Click or drag photo here</p>
                      <p className="mt-0.5 text-[11px] text-[#9c8496]">Supports clear JPG, PNG photos of prescriptions and reports</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6f576a]">Or paste text from e-prescription / portal</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="e.g. Tab Ferrous Ascorbate 100mg once daily after food x 30 days..."
                  rows={3}
                  className="mt-1.5 w-full rounded-2xl border border-white/80 bg-white/90 p-3.5 text-xs text-[#4d394e] shadow-xs outline-none focus:ring-2 focus:ring-[#e8a3bc]"
                />
              </div>

              <button
                type="submit"
                disabled={extracting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d65f8a] py-4 text-xs font-bold text-white shadow-[0_8px_20px_rgba(214,95,138,0.25)] transition hover:-translate-y-0.5 hover:bg-[#bd4e75] disabled:opacity-60"
              >
                {extracting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Extracting &amp; Structuring Clinical Data...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Extract &amp; Review Verification</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. USER VERIFICATION STEP */}
      {/* ========================================================================= */}
      {verificationModalOpen && editableRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c2a3b]/40 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setVerificationModalOpen(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2.2rem] border border-[#f0e2e8] bg-[#fffafb] p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-[#f1e6ec] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8656a1]">Clinical Verification</p>
                <h2 className="font-display text-2xl text-[#4f3851]">Review Extracted Record</h2>
              </div>
              <button
                onClick={() => setVerificationModalOpen(false)}
                className="rounded-full bg-[#f6ebf1] p-2 text-[#8c7083] hover:bg-[#edd8e4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-2xl bg-[#edf6ef] p-3.5 text-xs text-[#49704e]">
              <p className="font-semibold">Verify for safety:</p>
              <p className="mt-0.5">Please confirm that medication names, dosages, and lab numbers match your prescription accurately before saving.</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#6a5467]">Document Title</label>
                  <input
                    type="text"
                    value={editableRecord.title}
                    onChange={(e) => setEditableRecord({ ...editableRecord, title: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#ecdbe5] bg-white p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#6a5467]">Document Date</label>
                  <input
                    type="date"
                    value={editableRecord.document_date}
                    onChange={(e) => setEditableRecord({ ...editableRecord, document_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#ecdbe5] bg-white p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#6a5467]">Doctor Name</label>
                  <input
                    type="text"
                    value={editableRecord.doctor_name || ''}
                    placeholder="e.g. Dr. Ananya Roy"
                    onChange={(e) => setEditableRecord({ ...editableRecord, doctor_name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#ecdbe5] bg-white p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#6a5467]">Clinic / Hospital</label>
                  <input
                    type="text"
                    value={editableRecord.hospital_name || ''}
                    placeholder="e.g. Apollo Women Care"
                    onChange={(e) => setEditableRecord({ ...editableRecord, hospital_name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#ecdbe5] bg-white p-2.5 outline-none"
                  />
                </div>
              </div>

              {/* Medications Table / Editor */}
              <div className="rounded-2xl border border-[#f0e2e8] bg-white p-4">
                <div className="flex items-center justify-between border-b border-[#f4e8ef] pb-2">
                  <span className="font-bold text-[#5c4459]">Extracted Medications ({editableRecord.medications?.length || 0})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(editableRecord.medications || []), { name: 'New Medicine', dosage: '', frequency: '' }];
                      setEditableRecord({ ...editableRecord, medications: updated });
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#b55275] hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add Medication
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {(editableRecord.medications || []).map((med, idx) => (
                    <div key={idx} className="grid grid-cols-12 items-center gap-2 rounded-xl bg-[#faf5f8] p-2.5">
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Medicine name"
                          value={med.name}
                          onChange={(e) => {
                            const copy = [...(editableRecord.medications || [])];
                            copy[idx].name = e.target.value;
                            setEditableRecord({ ...editableRecord, medications: copy });
                          }}
                          className="w-full rounded-lg border border-[#eddfe7] bg-white p-1.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Dosage (500mg)"
                          value={med.dosage || ''}
                          onChange={(e) => {
                            const copy = [...(editableRecord.medications || [])];
                            copy[idx].dosage = e.target.value;
                            setEditableRecord({ ...editableRecord, medications: copy });
                          }}
                          className="w-full rounded-lg border border-[#eddfe7] bg-white p-1.5 text-xs"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Frequency / Instructions"
                          value={med.frequency || ''}
                          onChange={(e) => {
                            const copy = [...(editableRecord.medications || [])];
                            copy[idx].frequency = e.target.value;
                            setEditableRecord({ ...editableRecord, medications: copy });
                          }}
                          className="w-full rounded-lg border border-[#eddfe7] bg-white p-1.5 text-xs"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = (editableRecord.medications || []).filter((_, i) => i !== idx);
                            setEditableRecord({ ...editableRecord, medications: filtered });
                          }}
                          className="text-[#c07086] hover:text-[#a03050]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(editableRecord.medications || []).length === 0 && (
                    <p className="py-2 text-center text-xs text-[#9d8899]">No medications identified.</p>
                  )}
                </div>
              </div>

              {/* Lab Results Table */}
              <div className="rounded-2xl border border-[#f0e2e8] bg-white p-4">
                <div className="flex items-center justify-between border-b border-[#f4e8ef] pb-2">
                  <span className="font-bold text-[#5c4459]">Extracted Lab Results ({editableRecord.lab_results?.length || 0})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(editableRecord.lab_results || []), { test_name: 'Test Name', value: '', unit: '' }];
                      setEditableRecord({ ...editableRecord, lab_results: updated });
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#627ca6] hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add Lab Test
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {(editableRecord.lab_results || []).map((lab, idx) => (
                    <div key={idx} className="grid grid-cols-12 items-center gap-2 rounded-xl bg-[#f5f8fa] p-2">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Test name"
                          value={lab.test_name}
                          onChange={(e) => {
                            const copy = [...(editableRecord.lab_results || [])];
                            copy[idx].test_name = e.target.value;
                            setEditableRecord({ ...editableRecord, lab_results: copy });
                          }}
                          className="w-full rounded-lg border border-[#dde6ed] bg-white p-1.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Value"
                          value={lab.value}
                          onChange={(e) => {
                            const copy = [...(editableRecord.lab_results || [])];
                            copy[idx].value = e.target.value;
                            setEditableRecord({ ...editableRecord, lab_results: copy });
                          }}
                          className="w-full rounded-lg border border-[#dde6ed] bg-white p-1.5 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Unit / Ref"
                          value={lab.unit || ''}
                          onChange={(e) => {
                            const copy = [...(editableRecord.lab_results || [])];
                            copy[idx].unit = e.target.value;
                            setEditableRecord({ ...editableRecord, lab_results: copy });
                          }}
                          className="w-full rounded-lg border border-[#dde6ed] bg-white p-1.5 text-xs"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = (editableRecord.lab_results || []).filter((_, i) => i !== idx);
                            setEditableRecord({ ...editableRecord, lab_results: filtered });
                          }}
                          className="text-[#966b7a] hover:text-[#a03050]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(editableRecord.lab_results || []).length === 0 && (
                    <p className="py-2 text-center text-xs text-[#9d8899]">No lab values identified.</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVerificationModalOpen(false)}
                  className="flex-1 rounded-full border border-[#eedde6] py-3 text-xs font-bold text-[#846e7f]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveVerifiedRecord}
                  className="flex-2 flex items-center justify-center gap-2 rounded-full bg-[#d65f8a] py-3.5 text-xs font-bold text-white shadow-sm hover:bg-[#bd4e75]"
                >
                  <CheckCircle2 className="h-4 w-4" /> Save &amp; Add to SITA Health Memory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LONGITUDINAL COMPARISON / "WHAT CHANGED?" MODAL */}
      {/* ========================================================================= */}
      {comparisonModalOpen && activeComparison && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c2a3b]/40 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setComparisonModalOpen(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2.2rem] border border-[#f0e2e8] bg-[#fffafb] p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-[#f1e6ec] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b35a7d]">Longitudinal Health Continuity</p>
                <h2 className="font-display text-2xl text-[#4f3851]">What Changed?</h2>
              </div>
              <button
                onClick={() => setComparisonModalOpen(false)}
                className="rounded-full bg-[#f6ebf1] p-2 text-[#8c7083] hover:bg-[#edd8e4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Compared Headers */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-[#9e8396]">Previous Baseline</p>
                <p className="font-semibold text-[#5a4256]">{activeComparison.previousRecordTitle || 'Baseline'}</p>
                <p className="text-[10px] text-[#9e8396]">{activeComparison.previousRecordDate || 'Initial'}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#d65f8a]" />
              <div>
                <p className="text-[10px] font-bold uppercase text-[#9e8396]">Latest Document</p>
                <p className="font-semibold text-[#5a4256]">{activeComparison.targetRecordTitle}</p>
                <p className="text-[10px] text-[#9e8396]">{activeComparison.targetRecordDate}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Neutral Clinical Narrative */}
              <div className="rounded-2xl border border-[#eedde6] bg-[#fbf5f8] p-4 text-xs leading-relaxed text-[#685265]">
                <p className="font-bold text-[#8c4664]">SITA Continuity Summary:</p>
                <p className="mt-1 whitespace-pre-line">{activeComparison.neutralSummary}</p>
              </div>

              {/* Medication Dosage Changes */}
              {activeComparison.medicationChanges?.dosageChanged?.length > 0 && (
                <div className="rounded-2xl border border-[#f5e3cd] bg-[#fffaf2] p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#9e6128]">
                    <TrendingUp className="h-4 w-4 text-[#d67f2a]" /> Medication Dosage Adjustments ({activeComparison.medicationChanges.dosageChanged.length})
                  </p>
                  <div className="mt-2.5 space-y-2">
                    {activeComparison.medicationChanges.dosageChanged.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-xs">
                        <span className="font-semibold text-[#503d4e]">{d.name}</span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-[#967d91] line-through">{d.previousDosage || 'prior dose'}</span>
                          <ArrowRight className="h-3 w-3 text-[#d67f2a]" />
                          <span className="font-bold text-[#9e6128]">{d.currentDosage || 'new dose'}</span>
                          {d.currentFrequency && <span className="text-[#887082]">({d.currentFrequency})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Newly Added Medications */}
              {activeComparison.medicationChanges?.added?.length > 0 && (
                <div className="rounded-2xl border border-[#d6ebd9] bg-[#f2faf3] p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#45794d]">
                    <Plus className="h-4 w-4 text-[#4fa35b]" /> New Medications Started ({activeComparison.medicationChanges.added.length})
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {activeComparison.medicationChanges.added.map((m: any, i: number) => (
                      <div key={i} className="flex justify-between rounded-xl bg-white p-2.5 text-xs shadow-xs">
                        <span className="font-semibold text-[#45794d]">{m.name}</span>
                        <span className="text-[11px] text-[#718f76]">{m.dosage} {m.frequency ? `• ${m.frequency}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lab Result Deltas */}
              {activeComparison.labChanges?.length > 0 && (
                <div className="rounded-2xl border border-[#d8e6f2] bg-[#f5f9fc] p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#416987]">
                    <Activity className="h-4 w-4 text-[#4f85ab]" /> Lab Result Trends ({activeComparison.labChanges.length})
                  </p>
                  <div className="mt-2.5 space-y-2">
                    {activeComparison.labChanges.map((lab: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-xs">
                        <div>
                          <p className="font-semibold text-[#445b6b]">{lab.test_name}</p>
                          <p className="text-[10px] text-[#8699a6]">{lab.clinical_note}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#355368]">
                            {lab.previous_value} → {lab.current_value} {lab.unit}
                          </p>
                          {lab.delta !== null && lab.delta !== undefined && (
                            <span
                              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                lab.delta > 0
                                  ? 'bg-[#edf7ee] text-[#4f8a57]'
                                  : lab.delta < 0
                                  ? 'bg-[#fff0f0] text-[#b84b4b]'
                                  : 'bg-[#f0f0f0] text-[#777]'
                              }`}
                            >
                              {lab.delta > 0 ? <TrendingUp className="h-3 w-3" /> : lab.delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                              {lab.delta > 0 ? `+${lab.delta}` : lab.delta} {lab.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ask SITA Tailored Button */}
              <div className="rounded-2xl bg-gradient-to-br from-[#f8eaf1] to-[#f4eff9] p-4 text-center">
                <p className="text-xs font-bold text-[#6a4763]">Have questions about these updates?</p>
                <button
                  onClick={() => handleAskSitaFromComparison(activeComparison.askSitaPrompt)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#d65f8a] px-6 py-3 text-xs font-bold text-white shadow-[0_6px_20px_rgba(214,95,138,0.25)] transition hover:-translate-y-0.5 hover:bg-[#bd4e75]"
                >
                  <Sparkles className="h-4 w-4" /> Ask SITA About These Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PATIENT DOCTOR SUMMARY MODAL */}
      {/* ========================================================================= */}
      {doctorSummaryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c2a3b]/40 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setDoctorSummaryOpen(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2.2rem] border border-[#f0e2e8] bg-[#fffafb] p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-[#f1e6ec] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#865d7c]">Clinical Brief</p>
                <h2 className="font-display text-2xl text-[#4f3851]">Doctor Summary</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (doctorSummaryData) {
                      navigator.clipboard.writeText(JSON.stringify(doctorSummaryData, null, 2));
                      toast({ title: 'Copied', description: 'Clinical summary copied to clipboard.' });
                    }
                  }}
                  className="rounded-full bg-white p-2 text-[#8c7083] shadow-xs hover:bg-[#f6ebf1]"
                  title="Copy JSON"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-full bg-white p-2 text-[#8c7083] shadow-xs hover:bg-[#f6ebf1]"
                  title="Print Summary"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDoctorSummaryOpen(false)}
                  className="rounded-full bg-[#f6ebf1] p-2 text-[#8c7083] hover:bg-[#edd8e4]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {loadingSummary || !doctorSummaryData ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d65f8a] border-t-transparent" />
                <p className="mt-3 text-xs text-[#8d7589]">Compiling longitudinal clinical brief from your records...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Patient Overview */}
                <div className="rounded-2xl border border-[#ecdfe6] bg-white p-4 shadow-xs">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-base font-bold text-[#553c53]">{doctorSummaryData.patientName}</p>
                      <p className="text-[11px] text-[#8e758c]">Generated on {new Date(doctorSummaryData.generatedAt).toLocaleDateString()}</p>
                    </div>
                    <span className="rounded-full bg-[#fae8f0] px-3 py-1 text-[11px] font-bold text-[#b85478]">
                      {doctorSummaryData.reproductiveMode}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#7a6477]">{doctorSummaryData.reproductiveSummary}</p>
                </div>

                {/* Active Prescriptions */}
                <div className="rounded-2xl border border-[#ecdfe6] bg-white p-4 shadow-xs">
                  <h4 className="font-bold text-[#553c53]">Active Documented Medications ({doctorSummaryData.activeMedications?.length || 0})</h4>
                  <div className="mt-2 space-y-1.5">
                    {doctorSummaryData.activeMedications?.map((m: StructuredMedication, idx: number) => (
                      <div key={idx} className="flex justify-between rounded-lg bg-[#faf6f8] p-2">
                        <span className="font-semibold text-[#5a4057]">{m.name}</span>
                        <span className="text-[#846b80]">{m.dosage} {m.frequency ? `(${m.frequency})` : ''} {m.instructions ? `• ${m.instructions}` : ''}</span>
                      </div>
                    ))}
                    {(!doctorSummaryData.activeMedications || doctorSummaryData.activeMedications.length === 0) && (
                      <p className="text-xs text-[#9d869a]">No active prescriptions recorded.</p>
                    )}
                  </div>
                </div>

                {/* Lab Trends */}
                {doctorSummaryData.labTrends?.length > 0 && (
                  <div className="rounded-2xl border border-[#ecdfe6] bg-white p-4 shadow-xs">
                    <h4 className="font-bold text-[#553c53]">Key Laboratory Markers &amp; Trends</h4>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {doctorSummaryData.labTrends.map((lab: any, idx: number) => (
                        <div key={idx} className="rounded-xl bg-[#f5f8fa] p-2.5">
                          <p className="text-[10px] font-semibold text-[#738899]">{lab.testName}</p>
                          <p className="text-xs font-bold text-[#3d576a]">
                            {lab.latestValue} {lab.latestUnit} {lab.previousValue ? `(was ${lab.previousValue})` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Symptoms Logged (Past 90 Days) */}
                {doctorSummaryData.topSymptomsPast90Days?.length > 0 && (
                  <div className="rounded-2xl border border-[#ecdfe6] bg-white p-4 shadow-xs">
                    <h4 className="font-bold text-[#553c53]">Symptom Frequency (Past 90 Days)</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {doctorSummaryData.topSymptomsPast90Days.map((s: any, idx: number) => (
                        <span key={idx} className="rounded-full bg-[#f4eaf6] px-3 py-1 text-[11px] font-semibold text-[#7e5c91]">
                          {s.symptom} ({s.loggedCount}x • {s.predominantSeverity})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-[10px] italic text-[#a38c9e]">{doctorSummaryData.disclaimer}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. RECORD DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedRecordForDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c2a3b]/40 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedRecordForDetail(null)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2.2rem] border border-[#f0e2e8] bg-[#fffafb] p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-[#f1e6ec] pb-3">
              <div>
                <span className="rounded-full bg-[#fae8f0] px-2.5 py-0.5 text-[10px] font-bold text-[#b45679]">
                  {selectedRecordForDetail.document_type}
                </span>
                <h2 className="mt-1 font-display text-2xl text-[#4f3851]">{selectedRecordForDetail.title}</h2>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="rounded-full bg-[#f6ebf1] p-2 text-[#8c7083] hover:bg-[#edd8e4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#6e586c]">
              <div className="flex justify-between rounded-xl bg-white p-3 shadow-xs">
                <span>Date: {selectedRecordForDetail.document_date || 'Undated'}</span>
                <span>Clinician: {selectedRecordForDetail.doctor_name || 'N/A'}</span>
              </div>

              {selectedRecordForDetail.extracted_text && (
                <div className="rounded-2xl border border-[#ecdfe6] bg-white p-4">
                  <p className="font-bold text-[#584156]">Raw OCR / Extracted Text:</p>
                  <p className="mt-1.5 whitespace-pre-wrap font-mono text-[11px] text-[#7a6578]">{selectedRecordForDetail.extracted_text}</p>
                </div>
              )}

              {selectedRecordForDetail.structured_data?.notes && (
                <div className="rounded-2xl bg-[#fff6f8] p-3 text-[#92546e]">
                  <strong className="block">Doctor Advice &amp; Notes:</strong>
                  <p className="mt-1">{selectedRecordForDetail.structured_data.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
