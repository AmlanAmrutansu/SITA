import React, { useState, useRef, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import {
  Send,
  Plus,
  Paperclip,
  Image as ImageIcon,
  Check,
  Copy,
  RotateCcw,
  Trash2,
  FileText,
  Activity,
  Calendar,
  Baby,
  Stethoscope,
  Sparkles,
  Edit3,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Pill,
  FileCheck2,
  Clock,
  HeartHandshake,
  Maximize2
} from 'lucide-react';
import { useSitaStore, type StructuredMedicalRecord, type StructuredMedication, type StructuredLabResult } from '@/data/store';
import { OriginalSitaMark } from './AppShell';
import { toast } from '@/hooks/use-toast';

export function SitaChatInterface({ initialPrompt, initialPcos, initialTriage }: { initialPrompt?: string; initialPcos?: boolean; initialTriage?: boolean }) {
  const {
    messages,
    sendMessage,
    clearMessages,
    runPCOSScreening,
    runSymptomTriage,
    addMedicalRecord,
    profile,
    medicalRecords
  } = useSitaStore();

  const [input, setInput] = useState(initialPrompt || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // Modals
  const [pcosOpen, setPcosOpen] = useState(initialPcos || false);
  const [triageOpen, setTriageOpen] = useState(initialTriage || false);
  const [editRecordOpen, setEditRecordOpen] = useState(false);
  const [editingRecordData, setEditingRecordData] = useState<any>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [confirmedRecords, setConfirmedRecords] = useState<Record<string, boolean>>({});

  // PCOS form state
  const [irregularCycles, setIrregularCycles] = useState(true);
  const [excessHair, setExcessHair] = useState(false);
  const [acne, setAcne] = useState(true);
  const [hairThinning, setHairThinning] = useState(false);
  const [weightChallenge, setWeightChallenge] = useState(false);
  const [familyHist, setFamilyHist] = useState(false);
  const [pelvicPain, setPelvicPain] = useState(true);
  const [screeningBusy, setScreeningBusy] = useState(false);

  // Triage form state
  const [triageSymptom, setTriageSymptom] = useState('Pelvic cramps');
  const [triageDuration, setTriageDuration] = useState(2);
  const [triageSeverity, setTriageSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [triageFever, setTriageFever] = useState(false);
  const [triageBleeding, setTriageBleeding] = useState(false);
  const [triagePain, setTriagePain] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast({
        title: 'Unsupported file type',
        description: 'Please upload an image (PNG, JPG, WebP) or document photo.',
        variant: 'destructive',
      });
      return;
    }

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSelectedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImageFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (textToSend?: string) => {
    const textValue = (textToSend !== undefined ? textToSend : input).trim();
    if (!textValue && !selectedImage) return;

    const img = selectedImage;
    setInput('');
    removeSelectedImage();
    setIsSending(true);

    try {
      await sendMessage(textValue, undefined, img || undefined);
    } catch (err: any) {
      toast({
        title: 'Could not send message',
        description: err?.message || 'Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = async (lastPrompt?: string, lastAssessmentId?: string, lastImageBase64?: string) => {
    setIsSending(true);
    try {
      await sendMessage(lastPrompt || 'Please retry', lastAssessmentId, lastImageBase64);
    } catch (err: any) {
      toast({
        title: 'Retry failed',
        description: err?.message || 'Please try again in a few moments.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Copied to clipboard', description: 'Message text copied.' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // PCOS Submit handler
  const handlePCOSSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setScreeningBusy(true);
    try {
      const { result, id } = await runPCOSScreening({
        irregularCycles,
        cycleLengthDays: profile?.typical_cycle_length || 28,
        excessHairGrowth: excessHair,
        persistentAcne: acne,
        hairThinning,
        weightChallenges: weightChallenge,
        familyHistory: familyHist,
        pelvicPain,
      });
      setPcosOpen(false);
      const safeId = id || `pcos-${Date.now()}`;
      await sendMessage(
        `I just completed a PCOS clinical screening (Assessment ID: ${safeId}). Could you explain my risk assessment and recommendations?`,
        safeId
      );
    } catch (err: any) {
      toast({ title: 'Screening error', description: err?.message || 'Could not complete screening.', variant: 'destructive' });
    } finally {
      setScreeningBusy(false);
    }
  };

  // Triage Submit handler
  const handleTriageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setScreeningBusy(true);
    try {
      const { result, id } = await runSymptomTriage({
        symptom: triageSymptom,
        durationDays: triageDuration,
        severity: triageSeverity,
        hasFever: triageFever,
        heavyBleeding: triageBleeding,
        severePain: triagePain,
        dizzinessOrFainting: false,
        reproductiveMode: profile?.reproductive_mode || 'not-pregnant',
      });
      setTriageOpen(false);
      const safeId = id || `triage-${Date.now()}`;
      await sendMessage(
        `I conducted a symptom triage for "${triageSymptom}" (Assessment ID: ${safeId}). Could you analyze these symptoms and let me know if I need in-person care?`,
        safeId
      );
    } catch (err: any) {
      toast({ title: 'Triage error', description: err?.message || 'Could not complete triage.', variant: 'destructive' });
    } finally {
      setScreeningBusy(false);
    }
  };

  // Confirm extracted document & save to Supabase
  const handleConfirmExtractedDoc = async (messageId: string, extractedDoc: any) => {
    try {
      const structured: StructuredMedicalRecord = extractedDoc.structured_data || {};
      const saved = await addMedicalRecord({
        title: structured.title || 'Medical Record',
        document_type: structured.document_type || 'Prescription',
        document_date: structured.document_date || new Date().toISOString().split('T')[0],
        doctor_name: structured.doctor_name || undefined,
        hospital_name: structured.hospital_name || undefined,
        extracted_text: extractedDoc.extracted_text,
        verification_status: 'verified',
        structured_data: structured,
      });

      setConfirmedRecords((prev) => ({ ...prev, [messageId]: true }));
      toast({
        title: 'Saved to Health Memory',
        description: `"${saved.title}" is now securely stored and part of your longitudinal health record.`,
      });
    } catch (e: any) {
      toast({
        title: 'Save failed',
        description: e?.message || 'Could not save record to database.',
        variant: 'destructive',
      });
    }
  };

  // Open edit modal for extracted record
  const handleOpenEditModal = (messageId: string, extractedDoc: any) => {
    setEditingMessageId(messageId);
    setEditingRecordData(JSON.parse(JSON.stringify(extractedDoc.structured_data || {})));
    setEditRecordOpen(true);
  };

  // Save edited record to Supabase
  const handleSaveEditedRecord = async () => {
    if (!editingRecordData) return;
    try {
      const saved = await addMedicalRecord({
        title: editingRecordData.title || 'Medical Record',
        document_type: editingRecordData.document_type || 'Prescription',
        document_date: editingRecordData.document_date || new Date().toISOString().split('T')[0],
        doctor_name: editingRecordData.doctor_name || undefined,
        hospital_name: editingRecordData.hospital_name || undefined,
        verification_status: 'edited',
        structured_data: editingRecordData,
      });

      if (editingMessageId) {
        setConfirmedRecords((prev) => ({ ...prev, [editingMessageId]: true }));
      }
      setEditRecordOpen(false);
      toast({
        title: 'Record Updated & Saved',
        description: `"${saved.title}" was saved to your Health Memory.`,
      });
    } catch (e: any) {
      toast({
        title: 'Save failed',
        description: e?.message || 'Could not save edited record.',
        variant: 'destructive',
      });
    }
  };

  // Formatted default suggestions matching prompt specifications
  const defaultSuggestions = [
    { label: 'Analyze my recent symptoms', icon: Activity, action: 'send' },
    { label: 'Review my cycle pattern', icon: Calendar, action: 'send' },
    { label: 'Help me understand this report', icon: FileText, action: 'upload' },
    { label: 'What changed in my health recently?', icon: Sparkles, action: 'send' },
  ];

  // Format markdown helper (bold, bullets, line breaks)
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Heading
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="mt-3.5 mb-1.5 text-[14px] font-bold text-[#4c3448]">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="mt-4 mb-2 text-[15px] font-bold text-[#42293e]">
            {line.replace('## ', '')}
          </h3>
        );
      }
      // Bullet list item
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const textPart = line.trim().substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-[13.5px] leading-relaxed text-[#563e52]">
            <span dangerouslySetInnerHTML={{ __html: formatInline(textPart) }} />
          </li>
        );
      }
      // Numbered list item
      if (/^\d+\.\s/.test(line.trim())) {
        const textPart = line.trim().replace(/^\d+\.\s/, '');
        return (
          <li key={idx} className="ml-4 list-decimal text-[13.5px] leading-relaxed text-[#563e52]">
            <span dangerouslySetInnerHTML={{ __html: formatInline(textPart) }} />
          </li>
        );
      }
      // Blank line
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      // Regular paragraph
      return (
        <p key={idx} className="text-[13.5px] leading-relaxed text-[#563e52]">
          <span dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        </p>
      );
    });
  };

  const formatInline = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#3c2438]">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="rounded bg-[#f4ebf2] px-1.5 py-0.5 text-xs text-[#744565] font-mono">$1</code>');
  };

  return (
    <div className="flex h-full w-full flex-col rounded-2xl md:rounded-[2rem] border border-white/70 bg-gradient-to-b from-[#fdfbfd]/90 to-[#f9f5f8]/90 shadow-[0_12px_40px_rgba(164,136,157,0.06)] backdrop-blur-2xl overflow-hidden min-h-0">
      {/* 1. Conversational Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#ebdce6]/70 bg-white/70 px-4 sm:px-8 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <OriginalSitaMark className="h-9 w-9 drop-shadow-sm" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#6db379] shadow-sm animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[1.2rem] font-bold tracking-tight text-[#4c3549]">SITA</span>
              <span className="rounded-full bg-[#f4e6ee] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9d557c]">
                Health Workspace
              </span>
            </div>
            <p className="text-[11px] text-[#9b8595]">
              {medicalRecords.length > 0
                ? `${medicalRecords.length} clinical record(s) active in longitudinal memory`
                : 'Understand your cycle, symptoms, and health history'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSend('Start a fresh check-in')}
            className="flex items-center gap-1.5 rounded-full border border-[#e8d7e3] bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-[#7c6377] shadow-sm transition hover:bg-white hover:text-[#52374c] hover:shadow"
            title="Start new conversation"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          <button
            onClick={() => {
              if (confirm('Clear conversation history?')) {
                clearMessages();
              }
            }}
            className="grid h-8 w-8 place-items-center rounded-full text-[#b29ea9] transition hover:bg-white hover:text-[#d35f85]"
            title="Clear Chat History"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Central Conversation Area (Spacious, 80-90% workspace width) */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-10 py-6 space-y-6 w-full">
        <div className="max-w-5xl xl:max-w-6xl mx-auto w-full space-y-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl text-center py-8 sm:py-14 animate-in fade-in duration-500">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#f8e7ef] to-[#ebdcf2] shadow-[inset_0_2px_6px_rgba(255,255,255,0.8)] mb-5">
                <OriginalSitaMark className="h-12 w-12" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#4c3548]">SITA</h2>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#b07897]">Your Personal Health Companion</p>
              
              <div className="mt-4 max-w-md mx-auto rounded-2xl bg-white/50 p-4 border border-white/80 shadow-sm backdrop-blur-sm">
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#7a6275] italic">
                  &ldquo;Understand your health history. Ask questions. Upload reports. Discover patterns over time.&rdquo;
                </p>
              </div>

              {/* 4 subtle suggestion cards */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {defaultSuggestions.map((sug, idx) => {
                  const IconComponent = sug.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (sug.action === 'upload') fileInputRef.current?.click();
                        else handleSend(sug.label);
                      }}
                      className="group flex items-center gap-3.5 rounded-2xl border border-white/90 bg-white/75 p-4 text-xs font-semibold text-[#5a4055] shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md hover:border-[#ebd5e3]"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f8eef4] text-[#a95780] group-hover:bg-[#f3e1ed] transition-colors">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <span className="leading-snug font-medium text-[13px] group-hover:text-[#422a3d] transition-colors">{sug.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Health Mode Badges */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setPcosOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#edd7e4] bg-white/60 px-3.5 py-1.5 text-[11px] font-semibold text-[#8a5d7c] transition hover:bg-white"
                >
                  <Activity className="h-3.5 w-3.5 text-[#bd5b85]" />
                  <span>🌸 PCOS Screening</span>
                </button>
                <button
                  onClick={() => setTriageOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#edd7e4] bg-white/60 px-3.5 py-1.5 text-[11px] font-semibold text-[#8a5d7c] transition hover:bg-white"
                >
                  <Stethoscope className="h-3.5 w-3.5 text-[#7b5ea3]" />
                  <span>🩺 Symptom Triage</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#edd7e4] bg-white/60 px-3.5 py-1.5 text-[11px] font-semibold text-[#8a5d7c] transition hover:bg-white"
                >
                  <Paperclip className="h-3.5 w-3.5 text-[#5e8b6b]" />
                  <span>📎 Upload Report/Prescription</span>
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === 'user';
            const isExtracted = message.extracted_document;
            const isConfirmed = confirmedRecords[message.id];

            return (
              <div
                key={message.id}
                className={`flex gap-3 sm:gap-4 w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-up duration-300`}
              >
                {!isUser && (
                  <div className="shrink-0 pt-0.5">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#f8e7ef] to-[#ebdcf2] shadow-sm border border-white/60">
                      <OriginalSitaMark className="h-5 w-5" />
                    </div>
                  </div>
                )}

                <div className={`space-y-3 ${isUser ? 'max-w-[85%] sm:max-w-[75%]' : 'max-w-[92%] sm:max-w-[85%] flex-1'}`}>
                  {/* Image attachment in message bubble */}
                  {message.image && (
                    <div className="relative group cursor-pointer overflow-hidden rounded-2xl border border-white/80 shadow-sm max-w-[300px]">
                      <img
                        src={message.image}
                        alt="Uploaded Medical Document"
                        className="max-h-60 w-full object-cover transition group-hover:scale-105"
                        onClick={() => setPreviewModalImage(message.image || null)}
                      />
                      <div
                        onClick={() => setPreviewModalImage(message.image || null)}
                        className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white backdrop-blur-[2px]"
                      >
                        <Maximize2 className="h-5 w-5 drop-shadow" />
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`relative px-5 py-4 text-[13.5px] leading-relaxed shadow-[0_2px_14px_rgba(152,126,145,0.05)] backdrop-blur-md ${
                      isUser
                        ? 'rounded-[1.4rem] rounded-br-xs border border-[#ebd2e1] bg-gradient-to-br from-[#6b4c64] to-[#4e3448] text-white shadow-md'
                        : message.isError
                        ? 'rounded-[1.4rem] rounded-bl-xs border border-[#fbd0d9] bg-[#fff0f3] text-[#8e384f]'
                        : 'rounded-[1.4rem] rounded-bl-xs border border-white/90 bg-white/85 text-[#4e3649]'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-line text-white/95">{message.text}</p>
                    ) : message.isError ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#b4324f]">
                          <AlertCircle className="h-4 w-4" />
                          <span>AI Assistant Notice</span>
                        </div>
                        <p className="text-xs text-[#7e394b]">{message.text}</p>
                        {message.canRetry && (
                          <button
                            onClick={() => handleRetry(message.lastUserPrompt, message.lastAssessmentId, message.lastImageBase64)}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#d35f85] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#ba4d70]"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Retry response</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">{renderMarkdown(message.text)}</div>
                    )}

                    {/* Bubble timestamp & copy action */}
                    <div
                      className={`mt-3 flex items-center justify-between text-[10px] ${
                        isUser ? 'text-white/60' : 'text-[#a28e9d]'
                      }`}
                    >
                      <span>{message.time}</span>
                      {!isUser && !message.isError && (
                        <button
                          onClick={() => handleCopy(message.text, message.id)}
                          className="flex items-center gap-1 opacity-70 hover:opacity-100 transition"
                          title="Copy message text"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="h-3 w-3 text-[#589c66]" />
                              <span className="text-[#589c66] font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3. Interactive "Information extracted from your image" Verification Card */}
                  {isExtracted && (
                    <div className="overflow-hidden rounded-2xl border border-[#ebd7e5] bg-white/95 p-4 sm:p-5 shadow-md backdrop-blur-xl space-y-3.5">
                      {/* Header Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1e4ee] pb-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#f6e9f1] text-[#a4537c]">
                            <FileCheck2 className="h-4 w-4" />
                          </div>
                          <span className="text-xs sm:text-[13px] font-bold text-[#553b50]">Information extracted from your image</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isExtracted.structured_data?.detected_language && isExtracted.structured_data.detected_language !== 'English' && (
                            <span className="rounded-full bg-[#fdf2e9] border border-[#fbd7be] px-2.5 py-0.5 text-[10px] font-bold text-[#a0522d]">
                              🇮🇳 {isExtracted.structured_data.detected_language} ({isExtracted.structured_data.detected_script || 'Native'} Script)
                            </span>
                          )}
                          <span className="rounded-full bg-[#f4eaf2] px-3 py-1 text-[10px] font-bold text-[#864c70]">
                            {isExtracted.structured_data?.document_type || 'Prescription / Report'}
                          </span>
                        </div>
                      </div>

                      {/* Handwriting & Translation Notice */}
                      {isExtracted.structured_data?.handwriting_notes && (
                        <div className="rounded-xl bg-[#fff9ea] p-2.5 border border-[#fae8b4] text-xs text-[#825d18] flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 text-[#b5811c]" />
                          <span>{isExtracted.structured_data.handwriting_notes}</span>
                        </div>
                      )}

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-[#fcf9fb] p-3 border border-[#f3e7ef]">
                          <span className="text-[10px] uppercase font-bold text-[#9d8697]">Document Title</span>
                          <p className="font-semibold text-[#483344] mt-0.5 truncate">
                            {isExtracted.structured_data?.title || 'Uploaded Document'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#fcf9fb] p-3 border border-[#f3e7ef]">
                          <span className="text-[10px] uppercase font-bold text-[#9d8697]">Document Date</span>
                          <p className="font-semibold text-[#483344] mt-0.5">
                            {isExtracted.structured_data?.document_date || new Date().toISOString().split('T')[0]}
                          </p>
                        </div>
                      </div>

                      {/* Doctor / Hospital info */}
                      {(isExtracted.structured_data?.doctor_name || isExtracted.structured_data?.hospital_name) && (
                        <div className="rounded-xl bg-[#fcf9fb] p-3 border border-[#f3e7ef] text-xs">
                          <span className="text-[10px] uppercase font-bold text-[#9d8697]">Doctor / Medical Facility</span>
                          <p className="font-medium text-[#4c3547] mt-0.5">
                            {isExtracted.structured_data?.doctor_name}
                            {isExtracted.structured_data?.hospital_name ? ` • ${isExtracted.structured_data?.hospital_name}` : ''}
                          </p>
                        </div>
                      )}

                      {/* Medications Section */}
                      {isExtracted.structured_data?.medications && isExtracted.structured_data.medications.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#907388]">Prescribed Medications</span>
                          <div className="space-y-1.5">
                            {isExtracted.structured_data.medications.map((m: any, mIdx: number) => {
                              const name = typeof m === 'string' ? m : m.name;
                              const dosage = typeof m === 'object' ? m.dosage : '';
                              const freq = typeof m === 'object' ? m.frequency : '';
                              const instructions = typeof m === 'object' ? m.instructions : '';
                              return (
                                <div key={mIdx} className="flex items-start gap-2.5 rounded-xl bg-[#fbf6f9] p-2.5 border border-[#f4e6ee] text-xs">
                                  <Pill className="h-4 w-4 text-[#b85a81] mt-0.5 shrink-0" />
                                  <div>
                                    <span className="font-bold text-[#4e3449]">{name}</span>
                                    {dosage && <span className="ml-1.5 font-semibold text-[#805e78]">({dosage})</span>}
                                    {freq && <span className="ml-1 text-[11px] text-[#977f91]">· {freq}</span>}
                                    {instructions && <p className="text-[11px] text-[#977f91] mt-0.5 italic">{instructions}</p>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Lab Results Section */}
                      {isExtracted.structured_data?.lab_results && isExtracted.structured_data.lab_results.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#907388]">Extracted Lab Values</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {isExtracted.structured_data.lab_results.map((l: any, lIdx: number) => (
                              <div key={lIdx} className="rounded-xl bg-[#fbf6f9] p-2.5 border border-[#f4e6ee] text-xs flex justify-between items-center">
                                <div>
                                  <span className="font-semibold text-[#4e3449] block truncate">{l.test_name}</span>
                                  {l.reference_range && <span className="text-[9px] text-[#a48e9f]">Ref: {l.reference_range}</span>}
                                </div>
                                <span className="font-bold text-[#79496b] bg-white px-2.5 py-1 rounded-lg border border-[#eddbe6] shrink-0 ml-2">
                                  {l.value} {l.unit || ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Findings & Diagnoses */}
                      {(isExtracted.structured_data?.diagnoses?.length > 0 || isExtracted.structured_data?.important_findings?.length > 0) && (
                        <div className="rounded-xl bg-[#fdf5f8] p-3 border border-[#fae2ec] text-xs space-y-1">
                          <span className="text-[10px] font-bold uppercase text-[#aa5c7e]">Findings & Notes</span>
                          <p className="text-[#59394e] font-medium leading-relaxed">
                            {[
                              ...(isExtracted.structured_data?.diagnoses || []),
                              ...(isExtracted.structured_data?.important_findings || []),
                            ].join(' • ')}
                          </p>
                        </div>
                      )}

                      {/* Confirmation Action State */}
                      {isConfirmed ? (
                        <div className="flex items-center gap-2 rounded-xl bg-[#eef8f1] px-3.5 py-2.5 text-xs font-bold text-[#357a46] border border-[#d2edd7]">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>✓ Verified & Saved to SITA Longitudinal Health Memory</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => handleConfirmExtractedDoc(message.id, isExtracted)}
                            className="flex-1 rounded-xl bg-gradient-to-r from-[#7a5472] to-[#5a3b53] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Confirm & Save to Health Memory</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(message.id, isExtracted)}
                            className="rounded-xl border border-[#ebd7e4] bg-white px-3.5 py-2.5 text-xs font-bold text-[#6d4d65] transition hover:bg-[#fbf7f9]"
                            title="Edit extracted details"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-3.5 max-w-md items-center animate-in fade-in">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f8e7ef] to-[#ebdcf2] border border-white/60">
                <OriginalSitaMark className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-xs border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#bd7c9e]" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#bd7c9e]" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#bd7c9e]" style={{ animationDelay: '300ms' }} />
                <span className="ml-2 text-xs font-medium text-[#8f7789]">SITA is reasoning...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 3. Fixed / Sticky Bottom Composer */}
      <div className="shrink-0 border-t border-[#eddfe8]/80 bg-white/80 p-3 sm:p-5 backdrop-blur-xl">
        <div className="max-w-5xl xl:max-w-6xl mx-auto w-full">
          {/* Image upload preview strip before sending */}
          {selectedImage && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[#edd4e2] bg-[#fff5f9]/95 p-2.5 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={selectedImage}
                  alt="Attachment Preview"
                  className="h-12 w-12 rounded-xl object-cover border border-[#ebd2e0] shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#553b4f] truncate">{imageFileName || 'Selected Document Image'}</p>
                  <p className="text-[11px] text-[#9c8496]">SITA will extract medicines, dosages & findings</p>
                </div>
              </div>
              <button
                onClick={removeSelectedImage}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#9f8597] shadow-sm hover:text-[#d35f85] hover:bg-[#fff0f4] transition"
                title="Remove attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Input & Action Bar */}
          <div className="relative flex items-end gap-2 rounded-2xl md:rounded-3xl border border-white bg-white/95 p-2 sm:p-2.5 shadow-[0_4px_24px_rgba(152,126,145,0.08)] backdrop-blur-md focus-within:border-[#e5cbdc] focus-within:ring-4 focus-within:ring-[#f9e9f1]/60 transition">
            {/* Health Actions Popover Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActionMenu(!showActionMenu)}
                className="grid h-10 w-10 place-items-center rounded-xl sm:rounded-2xl bg-[#fbf5f8] text-[#8e6e84] transition hover:bg-[#f6e9f0] hover:text-[#583951]"
                title="Health actions & assessments"
              >
                <Plus className={`h-4 w-4 transition-transform ${showActionMenu ? 'rotate-45' : ''}`} />
              </button>

              {/* Health Action Menu */}
              {showActionMenu && (
                <div className="absolute bottom-12 left-0 z-50 w-64 rounded-2xl border border-[#ebd7e4] bg-white p-2 shadow-2xl space-y-1 animate-in fade-in">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#a48e9e]">Quick Health Actions</p>
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      setPcosOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#5a3f54] hover:bg-[#fbf4f8] transition"
                  >
                    <Activity className="h-4 w-4 text-[#bf5c86]" />
                    <span>PCOS Screening</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      setTriageOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#5a3f54] hover:bg-[#fbf4f8] transition"
                  >
                    <Stethoscope className="h-4 w-4 text-[#8a68a2]" />
                    <span>Symptom Triage Check</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#5a3f54] hover:bg-[#fbf4f8] transition"
                  >
                    <ImageIcon className="h-4 w-4 text-[#d16a8d]" />
                    <span>Upload Medical Document</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowActionMenu(false);
                      handleSend('Analyze my logged cycle patterns and predict my next hormonal phase');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#5a3f54] hover:bg-[#fbf4f8] transition"
                  >
                    <Calendar className="h-4 w-4 text-[#6e8e75]" />
                    <span>Analyze Cycle Patterns</span>
                  </button>
                </div>
              )}
            </div>

            {/* Attachment Input (Hidden) */}
            <input
              type="file"
              accept="image/*,application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="grid h-10 w-10 place-items-center rounded-xl sm:rounded-2xl text-[#9b8396] hover:bg-[#fbf5f8] hover:text-[#5d4157] transition"
              title="Attach prescription, lab report, or image"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Multiline auto-expanding composer */}
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask SITA anything about your cycle, symptoms, or health history..."
              className="min-h-[40px] max-h-44 flex-1 resize-none bg-transparent py-2.5 text-[13.5px] text-[#4d374a] outline-none placeholder:text-[#b8a6b4]"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={(!input.trim() && !selectedImage) || isSending}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#77546f] to-[#53384c] text-white shadow-sm transition hover:shadow hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
              title="Send message"
            >
              <Send className="h-4 w-4 translate-x-px" />
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-[#a895a4]">
            SITA provides supportive health guidance and longitudinal memory, not medical diagnosis.
          </p>
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPreviewModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2">
            <button
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
            <img src={previewModalImage} alt="Document" className="max-h-[85vh] w-auto rounded-xl object-contain" />
          </div>
        </div>
      )}

      {/* Edit Extracted Record Modal */}
      {editRecordOpen && editingRecordData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/80 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f1e5ed] pb-3">
              <h3 className="font-display text-lg font-bold text-[#51394c]">Edit Extracted Medical Details</h3>
              <button onClick={() => setEditRecordOpen(false)} className="rounded-full p-1 text-[#9f8899] hover:bg-[#f6e9f1]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEditedRecord();
              }}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#887083]">Document Title</label>
                <input
                  type="text"
                  required
                  value={editingRecordData.title || ''}
                  onChange={(e) => setEditingRecordData({ ...editingRecordData, title: e.target.value })}
                  className="sita-input mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#887083]">Document Type</label>
                  <select
                    value={editingRecordData.document_type || 'Prescription'}
                    onChange={(e) => setEditingRecordData({ ...editingRecordData, document_type: e.target.value })}
                    className="sita-input mt-1"
                  >
                    <option value="Prescription">Prescription</option>
                    <option value="Lab Report">Lab Report</option>
                    <option value="Ultrasound Report">Ultrasound Report</option>
                    <option value="Doctor Note">Doctor Note</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                    <option value="Blood Report">Blood Report</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#887083]">Document Date</label>
                  <input
                    type="date"
                    value={editingRecordData.document_date || ''}
                    onChange={(e) => setEditingRecordData({ ...editingRecordData, document_date: e.target.value })}
                    className="sita-input mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#887083]">Doctor Name</label>
                  <input
                    type="text"
                    value={editingRecordData.doctor_name || ''}
                    onChange={(e) => setEditingRecordData({ ...editingRecordData, doctor_name: e.target.value })}
                    placeholder="e.g. Dr. Roy"
                    className="sita-input mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#887083]">Hospital / Clinic</label>
                  <input
                    type="text"
                    value={editingRecordData.hospital_name || ''}
                    onChange={(e) => setEditingRecordData({ ...editingRecordData, hospital_name: e.target.value })}
                    placeholder="e.g. Care Hospital"
                    className="sita-input mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#887083]">Doctor Notes & Guidance</label>
                <textarea
                  rows={2}
                  value={editingRecordData.notes || ''}
                  onChange={(e) => setEditingRecordData({ ...editingRecordData, notes: e.target.value })}
                  className="sita-input mt-1 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditRecordOpen(false)}
                  className="flex-1 rounded-full border border-[#ebd7e4] py-2.5 text-xs font-bold text-[#7a5f74]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-[#75506e] py-2.5 text-xs font-bold text-white shadow transition hover:bg-[#5b3d56]"
                >
                  Save to Health Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PCOS Screening Modal */}
      {pcosOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/80 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f1e5ed] pb-3">
              <h3 className="font-display text-lg font-bold text-[#51394c]">PCOS Awareness Screening</h3>
              <button onClick={() => setPcosOpen(false)} className="rounded-full p-1 text-[#9f8899] hover:bg-[#f6e9f1]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePCOSSubmit} className="mt-4 space-y-3.5">
              <p className="text-xs text-[#826b7d] leading-relaxed">
                This structured evaluation checks clinical indicators associated with Polycystic Ovary Syndrome.
              </p>
              <div className="space-y-2">
                {[
                  ['Irregular, skipped, or very long cycles (>35 days)', irregularCycles, setIrregularCycles],
                  ['Excess facial or body hair growth (hirsutism)', excessHair, setExcessHair],
                  ['Persistent cystic acne or oily skin', acne, setAcne],
                  ['Hair thinning or loss around the scalp', hairThinning, setHairThinning],
                  ['Difficulty managing weight / insulin resistance signs', weightChallenge, setWeightChallenge],
                  ['Family history of PCOS or diabetes', familyHist, setFamilyHist],
                  ['Chronic pelvic discomfort or intense cramps', pelvicPain, setPelvicPain],
                ].map(([label, val, setter]: any) => (
                  <label
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-[#f0e2e9] bg-[#fdfafb] p-3 text-xs text-[#5e4559] cursor-pointer hover:bg-white transition"
                  >
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => setter(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#cf5d85]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <button
                type="submit"
                disabled={screeningBusy}
                className="mt-4 w-full rounded-full bg-[#825c7b] py-3 text-xs font-bold text-white transition hover:bg-[#684662] disabled:opacity-50"
              >
                {screeningBusy ? 'Evaluating with SITA...' : 'Submit to SITA Chat'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Symptom Triage Modal */}
      {triageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/80 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f1e5ed] pb-3">
              <h3 className="font-display text-lg font-bold text-[#51394c]">Symptom Triage Assessment</h3>
              <button onClick={() => setTriageOpen(false)} className="rounded-full p-1 text-[#9f8899] hover:bg-[#f6e9f1]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleTriageSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#887083]">Symptom</label>
                <input
                  type="text"
                  required
                  value={triageSymptom}
                  onChange={(e) => setTriageSymptom(e.target.value)}
                  className="sita-input mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#887083]">Duration (days)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={triageDuration}
                    onChange={(e) => setTriageDuration(Number(e.target.value))}
                    className="sita-input mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#887083]">Severity</label>
                  <select
                    value={triageSeverity}
                    onChange={(e) => setTriageSeverity(e.target.value as any)}
                    className="sita-input mt-1"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ba466a]">Red Flag Warning Check</span>
                {[
                  ['Fever above 100.4°F / 38°C', triageFever, setTriageFever],
                  ['Extremely heavy bleeding (soaking >2 pads/hr)', triageBleeding, setTriageBleeding],
                  ['Severe sharp or escalating pain', triagePain, setTriagePain],
                ].map(([label, val, setter]: any) => (
                  <label
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-[#fce4eb] bg-[#fff8fa] p-3 text-xs text-[#734354] cursor-pointer hover:bg-white transition"
                  >
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => setter(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#cc4a73]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={screeningBusy}
                className="mt-4 w-full rounded-full bg-[#825c7b] py-3 text-xs font-bold text-white transition hover:bg-[#684662] disabled:opacity-50"
              >
                {screeningBusy ? 'Analyzing...' : 'Run Triage in SITA Chat'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
