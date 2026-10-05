import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  FileText, 
  Copy, 
  Check, 
  Calendar, 
  ShieldCheck, 
  BookOpen, 
  RefreshCw,
  Clock,
  ArrowRight,
  Sun,
  Paperclip,
  Upload,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCheck,
  CheckSquare,
  Camera,
  Edit3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppState, UniversityHoliday, AcademicEvent, AcademicEventType, EventPriority, TimetableSlot, Subject } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { DocumentCameraScannerModal } from '../../components/scanner/DocumentCameraScannerModal';
import { ReviewExtractedTimetableModal } from '../../components/timetable/ReviewExtractedTimetableModal';
import { sendAIMessage } from '../../services/aiService';
import { api } from '../../services/api';
import { setBulkHolidays, addEvent, setBulkTimetableSlots, addNote } from '../../services/storage';
import { useToast } from '../../components/common/Toast';
import { readFileAsCleanBase64, parseExcelOrCsvLocally, normalizeTimeTo24Hour, parseDayOfWeek } from '../../utils/fileHelper';

interface AIAssistantPageProps {
  state: AppState;
}

interface ExtractedHolidayItem {
  date: string;
  name: string;
  type: 'national' | 'university' | 'exam_break' | 'special';
  isNonAttendanceDay: boolean;
  dayOfWeekName?: string;
  description?: string;
}

interface ExtractedSlotItem {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  room?: string;
  faculty?: string;
  type: 'lecture' | 'lab' | 'tutorial';
}

interface MessageAttachment {
  name: string;
  size: string;
  mimeType: string;
  isImage?: boolean;
  dataUrl?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachment?: MessageAttachment;
  extractedHolidaysData?: {
    fileName?: string;
    holidays: ExtractedHolidayItem[];
    semesterStartDate?: string;
    semesterEndDate?: string;
    applied?: boolean;
  };
  extractedTimetableData?: {
    fileName?: string;
    slots: ExtractedSlotItem[];
    subjects?: Array<{ code: string; name: string; faculty: string; room: string; credits: number }>;
    applied?: boolean;
  };
  extractedEventsData?: {
    events: Array<{
      title: string;
      date: string;
      type: string;
      priority: string;
      description?: string;
    }>;
    applied?: boolean;
  };
  extractedNotesData?: {
    notes: Array<{
      title: string;
      keyPoints: string[];
      formulas?: string[];
      summary: string;
    }>;
    applied?: boolean;
  };
}

const DAYS_NAMES_MAP: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
};

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({ state }) => {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Hello ${state.profile.name.split(' ')[0]}! I am your **Syncademic Academic Copilot**.\n\nI have complete awareness of your **${state.subjects.length} registered subjects**, attendance status, and semester calendar. I can extract, structure, and analyze details from **PDFs, JPEG/PNG photos, text circulars, and spreadsheets**:\n\n- 📎 **Multimodal Document Extraction**: Attach any university circular, timetable photo, syllabus PDF, or exam notice directly to chat.\n- 🗓️ **Holidays & Non-Attendance Days**: Target all gazetted/declared university holidays and flag them as official **Non-Attendance Days** (100% exempt from attendance penalties).\n- ⏰ **Timetable Schedule Extraction**: Convert timetable photos, PDFs, or tables into weekly recurring class periods.\n- 📝 **Milestones & Deadlines**: Isolate exam schedules, mid-terms, and assignment submission deadlines.\n- 📊 **Attendance Strategy**: Calculate safe bunks and recovery targets tailored to your attendance threshold (${state.profile.defaultAttendanceThreshold}%).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Chat bar active attachment
  const [chatAttachment, setChatAttachment] = useState<File | null>(null);
  const [chatAttachmentBase64, setChatAttachmentBase64] = useState<string | null>(null);
  const [chatAttachmentMime, setChatAttachmentMime] = useState<string | null>(null);

  // Calendar file analyzer modal state
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedCircularText, setPastedCircularText] = useState('');
  const [isAnalyzingCalendar, setIsAnalyzingCalendar] = useState(false);

  // Camera Document Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerInitialCategory, setScannerInitialCategory] = useState<'timetable' | 'calendar' | 'notes' | 'all'>('timetable');

  // Temporary Review Extracted Timetable modal state
  const [isReviewTimetableModalOpen, setIsReviewTimetableModalOpen] = useState(false);
  const [reviewTimetableSlots, setReviewTimetableSlots] = useState<any[]>([]);
  const [reviewTimetableSubjects, setReviewTimetableSubjects] = useState<any[]>([]);

  const handleOpenScanner = (category: 'timetable' | 'calendar' | 'notes' | 'all' = 'timetable') => {
    setScannerInitialCategory(category);
    setIsScannerOpen(true);
  };

  const handleCommitFromReviewModal = (verifiedSlots: TimetableSlot[], newSubjects: Subject[], mode: 'replace' | 'merge') => {
    setBulkTimetableSlots(verifiedSlots, newSubjects, mode);
    setMessages(prev => prev.map(m => m.extractedTimetableData ? {
      ...m,
      extractedTimetableData: { ...m.extractedTimetableData, applied: true }
    } : m));
  };

  const handleScanSuccess = (scanData: {
    photoBase64: string;
    mimeType: string;
    fileName: string;
    targetCategory: 'timetable' | 'calendar' | 'notes' | 'all';
    extractionResult: any;
  }) => {
    const { photoBase64, mimeType, fileName, targetCategory, extractionResult } = scanData;
    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${photoBase64}`;

    // 1. Post user message showing the captured photo
    const isTimetable = targetCategory === 'timetable' || (extractionResult?.slots && extractionResult.slots.length > 0);
    const isCalendar = targetCategory === 'calendar' || (extractionResult?.holidays && extractionResult.holidays.length > 0);

    const userMsg: Message = {
      id: `scan-${Date.now()}`,
      role: 'user',
      content: `📸 Scanned ${isTimetable ? 'Timetable Schedule' : isCalendar ? 'Academic Calendar' : 'Document'} via Camera (${fileName})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: {
        name: fileName,
        size: `${(photoBase64.length * 0.75 / 1024).toFixed(1)} KB`,
        mimeType: mimeType || 'image/jpeg',
        isImage: true,
        dataUrl
      }
    };

    // 2. Parse extraction result into application data structures
    const rawHolidays = extractionResult?.holidays || [];
    const rawSlots = extractionResult?.slots || [];
    const rawEvents = extractionResult?.events || [];
    const rawNotes = extractionResult?.notes || [];
    const rawSubjects = extractionResult?.subjects || [];

    const verifiedHolidays: ExtractedHolidayItem[] = rawHolidays.map((h: any) => ({
      date: h.date,
      name: h.name,
      type: h.type || 'university',
      isNonAttendanceDay: true,
      dayOfWeekName: h.dayOfWeekName,
      description: h.description
    }));

    const verifiedSlots: ExtractedSlotItem[] = rawSlots.map((s: any) => ({
      dayOfWeek: Number(s.dayOfWeek) >= 1 && Number(s.dayOfWeek) <= 7 ? Number(s.dayOfWeek) : 1,
      startTime: normalizeTimeTo24Hour(s.startTime, false),
      endTime: normalizeTimeTo24Hour(s.endTime, true),
      subjectCode: (s.subjectCode || 'SUB').toUpperCase().trim(),
      subjectName: (s.subjectName || s.subjectCode || 'Lecture Period').trim(),
      room: s.room || 'LH-101',
      faculty: s.faculty || 'Faculty Member',
      type: (['lecture', 'lab', 'tutorial'].includes(s.type) ? s.type : 'lecture') as 'lecture' | 'lab' | 'tutorial'
    })).sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

    // 3. Compose rich assistant response summary
    const summaryParts: string[] = [];
    summaryParts.push(`### 📸 Camera Document Scan Processed Successfully\n\nI analyzed your schedule photo using the **Gemini Vision API** and converted the visual timetable into structured academic records:`);

    if (verifiedSlots.length > 0) {
      summaryParts.push(`- ⏰ **Timetable Schedule**: Extracted **${verifiedSlots.length} weekly class periods** across ${new Set(verifiedSlots.map(s => s.dayOfWeek)).size} days.`);
    }
    if (verifiedHolidays.length > 0) {
      summaryParts.push(`- 🗓️ **Holidays & Calendar**: Identified **${verifiedHolidays.length} holiday entities** certified as non-attendance days.`);
    }
    if (rawEvents.length > 0) {
      summaryParts.push(`- 📅 **Academic Milestones**: Recognized **${rawEvents.length} key dates / exams**.`);
    }
    if (rawNotes.length > 0) {
      summaryParts.push(`- 📚 **Study Concepts**: Extracted **${rawNotes.length} conceptual topics**.`);
    }

    if (verifiedSlots.length === 0 && verifiedHolidays.length === 0 && rawEvents.length === 0 && rawNotes.length === 0) {
      summaryParts.push(`\n${extractionResult?.summary || 'The scan was analyzed, but no structured timetable grid or holiday dates were detected with high confidence. You can retake the photo with better lighting or crop closer to the schedule.'}`);
    } else {
      summaryParts.push(`\nReview the extracted cards below and click **Apply** to import them directly into your live timetable or semester planner!`);
    }

    const assistantMsg: Message = {
      id: `msg-ai-${Date.now() + 1}`,
      role: 'assistant',
      content: summaryParts.join('\n'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      extractedHolidaysData: verifiedHolidays.length > 0 ? {
        fileName,
        holidays: verifiedHolidays,
        semesterStartDate: extractionResult?.semesterStartDate,
        semesterEndDate: extractionResult?.semesterEndDate,
        applied: false
      } : undefined,
      extractedTimetableData: verifiedSlots.length > 0 ? {
        fileName,
        slots: verifiedSlots,
        subjects: rawSubjects,
        applied: false
      } : undefined,
      extractedEventsData: rawEvents.length > 0 ? {
        events: rawEvents,
        applied: false
      } : undefined,
      extractedNotesData: rawNotes.length > 0 ? {
        notes: rawNotes,
        applied: false
      } : undefined
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleChatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { base64, mimeType } = await readFileAsCleanBase64(file);
      setChatAttachment(file);
      setChatAttachmentBase64(base64);
      setChatAttachmentMime(mimeType);
      showToast(`Attached ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
    } catch (err: any) {
      console.error('File read error:', err);
      showToast('Could not load file: ' + err.message, 'error');
    }
    // Reset file input
    if (chatFileInputRef.current) chatFileInputRef.current.value = '';
  };

  const removeChatAttachment = () => {
    setChatAttachment(null);
    setChatAttachmentBase64(null);
    setChatAttachmentMime(null);
  };

  // Drag and drop file onto chat container
  const handleChatDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleChatDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    try {
      const { base64, mimeType } = await readFileAsCleanBase64(file);
      setChatAttachment(file);
      setChatAttachmentBase64(base64);
      setChatAttachmentMime(mimeType);
      showToast(`Attached ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
    } catch (err: any) {
      showToast('Could not load dropped file: ' + err.message, 'error');
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const promptText = customPrompt || input.trim();
    if ((!promptText && !chatAttachment) || isLoading) return;

    const attachmentCopy = chatAttachment;
    const attachmentBase64Copy = chatAttachmentBase64;
    const attachmentMimeCopy = chatAttachmentMime;

    // Reset input and attachment immediately for responsive UX
    if (!customPrompt) setInput('');
    setChatAttachment(null);
    setChatAttachmentBase64(null);
    setChatAttachmentMime(null);

    const isImage = attachmentMimeCopy?.startsWith('image/') || false;
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: promptText || (attachmentCopy ? `Please extract and analyze details from ${attachmentCopy.name}.` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: attachmentCopy ? {
        name: attachmentCopy.name,
        size: `${Math.round(attachmentCopy.size / 1024)} KB`,
        mimeType: attachmentMimeCopy || 'application/pdf',
        isImage
      } : undefined
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'init-1')
        .map(m => ({ role: m.role, content: m.content }));

      const effectivePrompt = promptText || (attachmentCopy ? `Please extract all academic details from this ${attachmentCopy.name} document: list any university holidays (certified non-attendance days), timetable class periods, exam milestones, or study concepts.` : '');

      // 1. Multimodal text generation with AI Copilot
      const attachmentPayload = attachmentBase64Copy ? {
        fileBase64: attachmentBase64Copy,
        mimeType: attachmentMimeCopy || undefined,
        fileName: attachmentCopy?.name
      } : undefined;

      const aiResponsePromise = sendAIMessage(effectivePrompt, state, history, attachmentPayload);

      // 2. Multimodal details extraction
      let extractPromise: Promise<any> = Promise.resolve(null);
      const shouldExtractStructured = attachmentBase64Copy || 
        /\b(extract|schedule|holiday|vacation|timetable|exam|deadline|syllabus|circular|date|class|period)\b/i.test(effectivePrompt);

      if (shouldExtractStructured) {
        extractPromise = api.ai.extractDetails({
          fileBase64: attachmentBase64Copy || undefined,
          mimeType: attachmentMimeCopy || undefined,
          rawText: !attachmentBase64Copy ? effectivePrompt : undefined,
          fileName: attachmentCopy?.name || 'Academic Inquiry',
          customKey: state.aiSettings?.apiKey || undefined
        }).catch(err => {
          console.warn('Extraction details notice:', err.message);
          return null;
        });
      }

      const [aiResponseText, extractionData] = await Promise.all([aiResponsePromise, extractPromise]);

      const holidaysList: ExtractedHolidayItem[] = extractionData?.holidays || [];
      const rawExtractedSlots = extractionData?.slots || [];
      const slotsList: ExtractedSlotItem[] = rawExtractedSlots.map((s: any) => ({
        dayOfWeek: Number(s.dayOfWeek) >= 1 && Number(s.dayOfWeek) <= 7 ? Number(s.dayOfWeek) : 1,
        startTime: normalizeTimeTo24Hour(s.startTime, false),
        endTime: normalizeTimeTo24Hour(s.endTime, true),
        subjectCode: (s.subjectCode || 'SUB').toUpperCase().trim(),
        subjectName: (s.subjectName || s.subjectCode || 'Lecture Period').trim(),
        room: s.room || 'LH-101',
        faculty: s.faculty || 'Faculty Member',
        type: (['lecture', 'lab', 'tutorial'].includes(s.type) ? s.type : 'lecture') as 'lecture' | 'lab' | 'tutorial'
      })).sort((a: any, b: any) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
      });
      const eventsList = extractionData?.events || [];
      const notesList = extractionData?.notes || [];

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        extractedHolidaysData: holidaysList.length > 0 ? {
          fileName: attachmentCopy?.name || 'Document / Circular',
          holidays: holidaysList.map(h => ({ ...h, isNonAttendanceDay: true })),
          semesterStartDate: extractionData?.semesterStartDate || undefined,
          semesterEndDate: extractionData?.semesterEndDate || undefined,
          applied: false
        } : undefined,
        extractedTimetableData: slotsList.length > 0 ? {
          fileName: attachmentCopy?.name || 'Timetable Schedule',
          slots: slotsList,
          subjects: extractionData?.subjects,
          applied: false
        } : undefined,
        extractedEventsData: eventsList.length > 0 ? {
          events: eventsList,
          applied: false
        } : undefined,
        extractedNotesData: notesList.length > 0 ? {
          notes: notesList,
          applied: false
        } : undefined
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (holidaysList.length > 0 || slotsList.length > 0 || eventsList.length > 0) {
        showToast(`Extracted ${holidaysList.length} holidays, ${slotsList.length} classes, and ${eventsList.length} milestones!`, 'success');
      }
    } catch (err: any) {
      console.error('AI message failure:', err);
      showToast('Could not reach AI Copilot. Please check your connection or key.', 'error');
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I encountered an unexpected issue processing your request: ${err.message || 'Server error'}. Please try again or paste the text directly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyHolidaysToPlanner = (msgId: string) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg?.extractedHolidaysData || targetMsg.extractedHolidaysData.applied) return;

    const { holidays, semesterStartDate, semesterEndDate } = targetMsg.extractedHolidaysData;

    try {
      // Bulk save to state.holidays with isNonAttendanceDay: true
      setBulkHolidays(
        holidays.map(h => ({
          id: 'hol-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          date: h.date,
          name: h.name,
          type: h.type,
          description: h.description || 'Official Holiday (Non-Attendance Day)',
          isNonAttendanceDay: true,
          dayOfWeekName: h.dayOfWeekName
        })),
        { startDate: semesterStartDate, endDate: semesterEndDate },
        'append'
      );

      // Mirror into events as holiday items with isNonAttendanceDay: true
      holidays.forEach(h => {
        addEvent({
          title: h.name,
          date: h.date,
          type: 'holiday',
          priority: h.type === 'national' ? 'high' : 'medium',
          description: h.description || `${h.type === 'national' ? 'National Public Holiday' : 'University Holiday'} (Non-Attendance Day)`,
          completed: new Date(h.date) < new Date(),
          isNonAttendanceDay: true
        });
      });

      // Mark message as applied
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId && m.extractedHolidaysData
            ? { ...m, extractedHolidaysData: { ...m.extractedHolidaysData, applied: true } }
            : m
        )
      );

      showToast(`Applied ${holidays.length} holiday entities to Semester Planner as non-attendance days! 🎉`, 'success');
    } catch (err: any) {
      console.error('Failed to apply holidays to planner:', err);
      showToast('Could not save holidays to planner', 'error');
    }
  };

  const handleApplyTimetable = (msgId: string) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg?.extractedTimetableData || targetMsg.extractedTimetableData.applied) return;

    const { slots, subjects } = targetMsg.extractedTimetableData;

    try {
      const currentSubjects = [...state.subjects];
      const subjectMap = new Map<string, string>();
      currentSubjects.forEach(s => {
        subjectMap.set(s.code.toUpperCase(), s.id);
      });

      const newSubjects: Subject[] = [];
      if (Array.isArray(subjects)) {
        subjects.forEach(s => {
          const codeUpper = s.code.toUpperCase();
          if (!subjectMap.has(codeUpper)) {
            const subId = 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
            newSubjects.push({
              id: subId,
              name: s.name || `${codeUpper} Course`,
              code: codeUpper,
              faculty: s.faculty || 'Faculty Instructor',
              room: s.room || 'LH-101',
              credits: s.credits || 4,
              color: '#007FFF',
              totalClasses: 0,
              attendedClasses: 0,
              targetAttendance: state.profile.defaultAttendanceThreshold || 75
            });
            subjectMap.set(codeUpper, subId);
          }
        });
      }

      const formattedSlots: TimetableSlot[] = slots.map(s => {
        const codeUpper = s.subjectCode.toUpperCase();
        const subjectId = subjectMap.get(codeUpper) || state.subjects[0]?.id || 'sub-gen';
        return {
          id: 'slot-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          dayOfWeek: (s.dayOfWeek >= 1 && s.dayOfWeek <= 6 ? s.dayOfWeek : 1) as any,
          subjectId,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room || 'LH-101',
          faculty: s.faculty || 'Faculty Instructor',
          type: s.type
        };
      });

      setBulkTimetableSlots(formattedSlots, newSubjects, 'append');

      setMessages(prev =>
        prev.map(m =>
          m.id === msgId && m.extractedTimetableData
            ? { ...m, extractedTimetableData: { ...m.extractedTimetableData, applied: true } }
            : m
        )
      );

      showToast(`Applied ${formattedSlots.length} classes to your Timetable! ⏰`, 'success');
    } catch (err: any) {
      console.error('Failed to apply timetable:', err);
      showToast('Could not save timetable slots', 'error');
    }
  };

  const handleApplyEvents = (msgId: string) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg?.extractedEventsData || targetMsg.extractedEventsData.applied) return;

    const { events } = targetMsg.extractedEventsData;

    try {
      events.forEach(ev => {
        addEvent({
          title: ev.title,
          date: ev.date,
          type: (['exam', 'assignment', 'project'].includes(ev.type) ? ev.type : 'exam') as AcademicEventType,
          priority: (ev.priority || 'high') as EventPriority,
          description: ev.description || 'Extracted Academic Milestone',
          completed: false
        });
      });

      setMessages(prev =>
        prev.map(m =>
          m.id === msgId && m.extractedEventsData
            ? { ...m, extractedEventsData: { ...m.extractedEventsData, applied: true } }
            : m
        )
      );

      showToast(`Added ${events.length} academic milestones to Planner! 📅`, 'success');
    } catch (err: any) {
      console.error('Failed to add events:', err);
      showToast('Could not save events', 'error');
    }
  };

  const handleApplyNotes = (msgId: string) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg?.extractedNotesData || targetMsg.extractedNotesData.applied) return;

    const { notes } = targetMsg.extractedNotesData;

    try {
      notes.forEach(n => {
        const mdContent = `# ${n.title}\n\n${n.summary}\n\n### Key Concepts\n${n.keyPoints.map(p => `- ${p}`).join('\n')}${n.formulas && n.formulas.length > 0 ? `\n\n### Formulas & References\n${n.formulas.map(f => `- \`${f}\``).join('\n')}` : ''}`;

        addNote({
          title: n.title,
          subjectId: state.subjects[0]?.id || 'sub-general',
          semester: state.profile.semester || 1,
          category: 'notes',
          fileType: 'text',
          description: n.summary.slice(0, 150),
          contentText: mdContent,
          tags: ['ai-extracted', 'lecture-summary'],
          fileName: `${n.title.replace(/\s+/g, '_')}.md`,
          fileSize: '3 KB',
          isWrittenNote: true
        });
      });

      setMessages(prev =>
        prev.map(m =>
          m.id === msgId && m.extractedNotesData
            ? { ...m, extractedNotesData: { ...m.extractedNotesData, applied: true } }
            : m
        )
      );

      showToast(`Saved ${notes.length} note summaries to Study Vault! 📚`, 'success');
    } catch (err: any) {
      console.error('Failed to save notes:', err);
      showToast('Could not save notes', 'error');
    }
  };

  const handleExecuteCalendarAnalysis = async () => {
    if (!selectedFile && !pastedCircularText.trim()) {
      showToast('Please provide an academic calendar file or paste circular text', 'warning');
      return;
    }

    setIsAnalyzingCalendar(true);
    const fileName = selectedFile ? selectedFile.name : 'Pasted Academic Circular';

    // Post user message
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: selectedFile 
        ? `📎 [Attached Academic Document: ${selectedFile.name}]\nPlease analyze this document granularly to specifically extract all 'Holiday' entities into the semester planner, ensuring they are correctly flagged as certified non-attendance days.`
        : `📋 [Academic Circular Text Provided]\nPlease analyze this circular text granularly to specifically extract all 'Holiday' entities into the semester planner, ensuring they are correctly flagged as certified non-attendance days:\n\n${pastedCircularText.slice(0, 300)}...`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: selectedFile ? {
        name: selectedFile.name,
        size: `${Math.round(selectedFile.size / 1024)} KB`,
        mimeType: selectedFile.type || 'application/pdf',
        isImage: selectedFile.type.startsWith('image/')
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setIsCalendarModalOpen(false);
    setIsLoading(true);

    try {
      let fileBase64: string | undefined;
      let rawText: string | undefined;
      let mimeType: string | undefined;

      if (selectedFile) {
        const lowerName = selectedFile.name.toLowerCase();
        if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
          rawText = await parseExcelOrCsvLocally(selectedFile);
        } else {
          const fileData = await readFileAsCleanBase64(selectedFile);
          fileBase64 = fileData.base64;
          mimeType = fileData.mimeType;
        }
      } else {
        rawText = pastedCircularText.trim();
      }

      const res = await api.ai.extractDetails({
        fileBase64,
        mimeType,
        rawText,
        fileName,
        customKey: state.aiSettings?.apiKey || undefined,
        targetCategory: 'calendar'
      });

      if (res?.success) {
        const verifiedHolidays: ExtractedHolidayItem[] = (res.holidays || []).map(h => ({
          date: h.date,
          name: h.name || 'University Holiday',
          type: h.type || 'university',
          isNonAttendanceDay: true,
          dayOfWeekName: h.dayOfWeekName,
          description: h.description || 'Official University Holiday (Non-Attendance Day)'
        }));

        let aiNarrative = `I have completed a **granular extraction** of your academic document (**${fileName}**).\n\n`;
        aiNarrative += `### 🎯 Targeted 'Holiday' Entities (${verifiedHolidays.length} Extracted)\n`;
        aiNarrative += `All extracted holiday entities below are **strictly flagged as Non-Attendance Days**. Under university regulations, classes are suspended on these dates. They are completely exempt from attendance recording and will **never** negatively affect your subject attendance requirements.\n\n`;

        if (res.semesterStartDate && res.semesterEndDate) {
          aiNarrative += `📅 **Semester Span**: \`${res.semesterStartDate}\` to \`${res.semesterEndDate}\`\n\n`;
        }

        if (verifiedHolidays.length > 0) {
          aiNarrative += `Here is the granular breakdown of non-attendance days identified:\n`;
          verifiedHolidays.slice(0, 10).forEach(h => {
            const dayStr = h.dayOfWeekName ? ` (${h.dayOfWeekName})` : '';
            aiNarrative += `- **${h.date}${dayStr}**: ${h.name} — *${h.type.toUpperCase()}* [Non-Attendance Day]\n`;
          });
          if (verifiedHolidays.length > 10) {
            aiNarrative += `- *...plus ${verifiedHolidays.length - 10} more holiday entities in the interactive card below.*\n`;
          }
        } else {
          aiNarrative += `No explicit holiday dates were found in the uploaded notice. You can verify and add them manually.\n`;
        }

        if (res.events && res.events.length > 0) {
          aiNarrative += `\nIn addition, I separated **${res.events.length} academic milestones** (exams and deadlines) so they do not collide with holiday non-attendance records.\n`;
        }

        aiNarrative += `\n👉 You can review the granular entries and click **"Apply to Semester Planner"** below to sync these non-attendance days into your live planner and attendance tracker!`;

        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: aiNarrative,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          extractedHolidaysData: {
            fileName,
            holidays: verifiedHolidays,
            semesterStartDate: res.semesterStartDate || undefined,
            semesterEndDate: res.semesterEndDate || undefined,
            applied: false
          },
          extractedEventsData: res.events && res.events.length > 0 ? {
            events: res.events,
            applied: false
          } : undefined
        };

        setMessages(prev => [...prev, assistantMsg]);
        showToast(`Targeted and extracted ${verifiedHolidays.length} holiday entities as non-attendance days!`, 'success');
      } else {
        const errorMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: `I analyzed the document, but could not detect distinct holiday tables or date lines. Please ensure the document is clear, or paste the text directly into the chat.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err: any) {
      console.error('Calendar analysis failed:', err);
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I encountered an issue processing the document: ${err.message || 'Unknown error'}. Please try uploading a different file or paste the text.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
      showToast('Document analysis failed', 'error');
    } finally {
      setIsAnalyzingCalendar(false);
      setIsLoading(false);
      setSelectedFile(null);
      setPastedCircularText('');
    }
  };

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const PRESET_PROMPTS = [
    {
      label: '📸 Scan Timetable / Schedule (Camera)',
      icon: <Camera className="w-3.5 h-3.5 text-[#007FFF]" />,
      action: () => handleOpenScanner('timetable')
    },
    {
      label: '🗓️ Extract Holidays & Non-Attendance Days',
      icon: <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />,
      action: () => setIsCalendarModalOpen(true)
    },
    {
      label: '⏰ Extract Timetable from Photo / PDF',
      icon: <Clock className="w-3.5 h-3.5 text-[#007FFF]" />,
      action: () => chatFileInputRef.current?.click()
    },
    {
      label: '📊 Analyze Attendance Health',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />,
      prompt: 'Please give me a complete diagnostic review of my current attendance across all subjects. Point out which subjects have safe bunks, which are in danger, and give me a clear recovery action plan.'
    },
    {
      label: '📝 Draft Faculty Leave Application',
      icon: <FileText className="w-3.5 h-3.5 text-[#E82A89]" />,
      prompt: `Please draft a formal academic leave application letter for my faculty (${state.subjects[0]?.faculty || 'Course Instructor'}) requesting 2 days of leave for an upcoming technical hackathon. Include proper formal salutations and placeholders.`
    },
    {
      label: '📚 Create 7-Day Midterm Study Plan',
      icon: <Calendar className="w-3.5 h-3.5 text-[#F4C430]" />,
      prompt: 'Create a structured 7-day revision schedule for my registered semester courses. Balance high-credit technical subjects with theory revision.'
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E7E2]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2022]">
              Academic AI Copilot
            </h1>
            <Badge variant="yellow">Multimodal Active</Badge>
          </div>
          <p className="text-xs text-[#5A5E65] mt-1">
            Universal academic document analyzer: extract holidays, timetable slots, exam schedules & notes from PDF, JPEG, PNG or text.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenScanner('timetable')}
            leftIcon={<Camera className="w-3.5 h-3.5" />}
            className="bg-[#007FFF] hover:bg-[#0066CC] font-semibold text-xs shadow-xs"
          >
            Document Scan
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCalendarModalOpen(true)}
            leftIcon={<Sun className="w-3.5 h-3.5 text-[#F59E0B]" />}
          >
            Extract Calendar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMessages([messages[0]]);
              showToast('Chat session reset', 'info');
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Preset Action Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {PRESET_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (p.action) p.action();
              else if (p.prompt) handleSend(p.prompt);
            }}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#E8E7E2] hover:border-[#007FFF] hover:text-[#007FFF] transition-all shrink-0 flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {p.icon}
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Box */}
      <div 
        onDragOver={handleChatDragOver}
        onDrop={handleChatDrop}
        className="bg-white rounded-xl border border-[#E8E7E2] overflow-hidden flex flex-col h-[580px] shadow-xs relative"
      >
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-[#FCFBF8]">
          {messages.map((msg) => {
            const isAI = msg.role === 'assistant';

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  isAI ? 'justify-start' : 'justify-end'
                }`}
              >
                {isAI && (
                  <div className="w-7 h-7 rounded-lg bg-[#1E2022] text-[#F4C430] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed shadow-xs space-y-2.5 ${
                    isAI
                      ? 'bg-white border border-[#E8E7E2] text-[#1E2022]'
                      : 'bg-[#007FFF] text-white'
                  }`}
                >
                  {/* Attached file pill if present in user message */}
                  {msg.attachment && (
                    <div className="space-y-1.5 mb-1">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/15 border border-white/25 text-[11px] font-medium">
                        {msg.attachment.isImage ? (
                          <ImageIcon className="w-3.5 h-3.5 text-white shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-white shrink-0" />
                        )}
                        <span className="truncate max-w-[200px]">{msg.attachment.name}</span>
                        <span className="opacity-80 text-[10px]">({msg.attachment.size})</span>
                      </div>

                      {/* Live Thumbnail Preview for Scanned Photo */}
                      {msg.attachment.dataUrl && msg.attachment.isImage && (
                        <div className="rounded-lg overflow-hidden border border-white/25 max-w-[260px] shadow-sm bg-black/40">
                          <img
                            src={msg.attachment.dataUrl}
                            alt={msg.attachment.name}
                            className="w-full h-auto object-cover max-h-44 rounded-md"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>

                  {/* Interactive Holiday Extraction Card */}
                  {msg.extractedHolidaysData && msg.extractedHolidaysData.holidays.length > 0 && (
                    <div className="mt-3 p-4 rounded-xl bg-[#F8FAF9] border border-[#D1F2D9] space-y-3 text-[#1E2022]">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#E8E7E2]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#EBF7EE] text-[#16A34A] flex items-center justify-center">
                            <Sun className="w-4 h-4 text-[#F59E0B]" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-[#1E2022] block">
                              Extracted Holiday Entities ({msg.extractedHolidaysData.holidays.length})
                            </span>
                            <span className="text-[10px] text-[#5A5E65]">
                              Flagged as 100% Non-Attendance Days (Attendance Exempt)
                            </span>
                          </div>
                        </div>

                        <Badge variant="green">
                          NON-ATTENDANCE DAYS
                        </Badge>
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                        {msg.extractedHolidaysData.holidays.map((h, hIdx) => (
                          <div
                            key={hIdx}
                            className="p-2 rounded-lg bg-white border border-[#E8E7E2] flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] font-semibold text-[#1E2022] shrink-0">
                                {h.date}
                              </span>
                              {h.dayOfWeekName && (
                                <span className="text-[10px] text-[#848A94] font-medium shrink-0">
                                  ({h.dayOfWeekName})
                                </span>
                              )}
                              <span className="font-medium text-[#1E2022] truncate">
                                {h.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#16A34A] bg-[#EBF7EE] border border-[#D1F2D9]">
                                <ShieldCheck className="w-3 h-3 text-[#16A34A]" />
                                Non-Attendance
                              </span>
                              <Badge variant={h.type === 'national' ? 'red' : h.type === 'special' ? 'yellow' : 'neutral'}>
                                {h.type.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#E8E7E2] flex-wrap gap-2">
                        <span className="text-[11px] text-[#5A5E65]">
                          {msg.extractedHolidaysData.applied 
                            ? '✅ Holidays are active in Semester Planner & attendance engine.'
                            : 'Click apply to integrate these non-attendance days into your live planner.'}
                        </span>

                        <Button
                          variant={msg.extractedHolidaysData.applied ? 'outline' : 'primary'}
                          size="xs"
                          disabled={msg.extractedHolidaysData.applied}
                          onClick={() => handleApplyHolidaysToPlanner(msg.id)}
                          leftIcon={msg.extractedHolidaysData.applied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> : <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />}
                        >
                          {msg.extractedHolidaysData.applied 
                            ? 'Applied to Semester Planner' 
                            : `Apply to Semester Planner (${msg.extractedHolidaysData.holidays.length} Days)`}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Interactive Timetable Schedule Extraction Card */}
                  {msg.extractedTimetableData && msg.extractedTimetableData.slots.length > 0 && (
                    <div className="mt-3 p-4 rounded-xl bg-[#F0F7FF] border border-[#BAE6FD] space-y-3 text-[#1E2022]">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#E8E7E2]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#E0F2FE] text-[#007FFF] flex items-center justify-center">
                            <Clock className="w-4 h-4 text-[#007FFF]" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-[#1E2022] block">
                              Extracted Timetable Periods ({msg.extractedTimetableData.slots.length} Classes)
                            </span>
                            <span className="text-[10px] text-[#5A5E65]">
                              Weekly recurring class periods recognized from document
                            </span>
                          </div>
                        </div>

                        <Badge variant="blue">
                          TIMETABLE SCHEDULE
                        </Badge>
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                        {msg.extractedTimetableData.slots.map((s, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-2 rounded-lg bg-white border border-[#E8E7E2] flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F4F3EE] text-[#1E2022] shrink-0">
                                {DAYS_NAMES_MAP[s.dayOfWeek] || 'Day ' + s.dayOfWeek}
                              </span>
                              <span className="font-mono text-[11px] text-[#5A5E65] shrink-0">
                                {s.startTime} - {s.endTime}
                              </span>
                              <span className="font-semibold text-[#1E2022] truncate">
                                {s.subjectCode}: {s.subjectName}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-[#848A94]">
                                {s.room}
                              </span>
                              <Badge variant={s.type === 'lab' ? 'purple' : s.type === 'tutorial' ? 'yellow' : 'neutral'}>
                                {s.type.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#E8E7E2] flex-wrap gap-2">
                        <span className="text-[11px] text-[#5A5E65]">
                          {msg.extractedTimetableData.applied
                            ? '✅ Classes synced to your weekly Timetable.'
                            : 'Click apply to add these classes into your weekly timetable.'}
                        </span>

                        <Button
                          variant={msg.extractedTimetableData.applied ? 'outline' : 'primary'}
                          size="xs"
                          disabled={msg.extractedTimetableData.applied}
                          onClick={() => handleApplyTimetable(msg.id)}
                          leftIcon={msg.extractedTimetableData.applied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> : <Clock className="w-3.5 h-3.5 text-[#007FFF]" />}
                        >
                          {msg.extractedTimetableData.applied 
                            ? 'Applied to Timetable' 
                            : `Apply to Timetable (${msg.extractedTimetableData.slots.length} Classes)`}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Interactive Academic Milestones Card */}
                  {msg.extractedEventsData && msg.extractedEventsData.events.length > 0 && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2.5 text-[#1E2022]">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-[#FDE68A]/60">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#F59E0B]" />
                          Academic Milestones & Exams ({msg.extractedEventsData.events.length})
                        </span>
                        <Button
                          variant={msg.extractedEventsData.applied ? 'outline' : 'primary'}
                          size="xs"
                          disabled={msg.extractedEventsData.applied}
                          onClick={() => handleApplyEvents(msg.id)}
                          leftIcon={msg.extractedEventsData.applied ? <CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> : <Calendar className="w-3 h-3" />}
                        >
                          {msg.extractedEventsData.applied ? 'Added to Planner' : 'Add to Planner'}
                        </Button>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                        {msg.extractedEventsData.events.map((ev, eIdx) => (
                          <div key={eIdx} className="p-1.5 rounded bg-white border border-[#E8E7E2] flex items-center justify-between text-xs gap-2">
                            <span className="font-mono text-[11px] font-semibold text-[#1E2022] shrink-0">{ev.date}</span>
                            <span className="font-medium text-[#1E2022] truncate">{ev.title}</span>
                            <Badge variant={ev.type === 'exam' ? 'red' : 'yellow'}>{ev.type.toUpperCase()}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Study Notes Card */}
                  {msg.extractedNotesData && msg.extractedNotesData.notes.length > 0 && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#FAF5FF] border border-[#E9D5FF] space-y-2.5 text-[#1E2022]">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-[#E9D5FF]/60">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#9333EA]" />
                          Extracted Study Concepts & Notes ({msg.extractedNotesData.notes.length})
                        </span>
                        <Button
                          variant={msg.extractedNotesData.applied ? 'outline' : 'primary'}
                          size="xs"
                          disabled={msg.extractedNotesData.applied}
                          onClick={() => handleApplyNotes(msg.id)}
                          leftIcon={msg.extractedNotesData.applied ? <CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> : <BookOpen className="w-3 h-3" />}
                        >
                          {msg.extractedNotesData.applied ? 'Saved to Notes Vault' : 'Save to Study Vault'}
                        </Button>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                        {msg.extractedNotesData.notes.map((n, nIdx) => (
                          <div key={nIdx} className="p-2 rounded bg-white border border-[#E8E7E2] text-xs space-y-1">
                            <span className="font-bold text-[#1E2022] block">{n.title}</span>
                            <p className="text-[11px] text-[#5A5E65] line-clamp-2">{n.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-current/10 text-[10px] opacity-70">
                    <span>{msg.timestamp}</span>

                    {isAI && (
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="hover:opacity-100 flex items-center gap-1 p-0.5 rounded text-[10px] cursor-pointer"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-[#1E7E34]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {!isAI && (
                  <div className="w-7 h-7 rounded-lg bg-[#007FFF] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#1E2022] text-[#F4C430] flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="bg-white border border-[#E8E7E2] rounded-xl p-4 text-xs text-[#5A5E65] shadow-xs flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#007FFF] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#007FFF] animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-[#007FFF] animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px]">Syncademic Copilot is analyzing multimodal document and extracting structured details...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-white border-t border-[#E8E7E2] space-y-2">
          {/* Active File Attachment Preview Pill */}
          {chatAttachment && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#F0F7FF] border border-[#BAE6FD] text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {chatAttachment.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-[#007FFF] shrink-0" />
                ) : chatAttachment.name.endsWith('.csv') || chatAttachment.name.endsWith('.xlsx') ? (
                  <FileSpreadsheet className="w-4 h-4 text-[#16A34A] shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-[#007FFF] shrink-0" />
                )}
                <span className="font-semibold text-[#1E2022] truncate max-w-xs">{chatAttachment.name}</span>
                <span className="text-[11px] text-[#5A5E65]">({(chatAttachment.size / 1024).toFixed(1)} KB)</span>
                <Badge variant="blue">Ready to Analyze</Badge>
              </div>

              <button
                type="button"
                onClick={removeChatAttachment}
                className="p-1 text-[#848A94] hover:text-[#DC2626] rounded transition-colors"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden Chat File Input */}
            <input
              ref={chatFileInputRef}
              type="file"
              onChange={handleChatFileSelect}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls,.txt,.md"
              className="hidden"
            />

            {/* Attach Any File Button */}
            <button
              type="button"
              onClick={() => chatFileInputRef.current?.click()}
              className="p-2.5 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#5A5E65] hover:text-[#007FFF] hover:border-[#007FFF] hover:bg-white transition-all flex items-center gap-1.5 text-xs cursor-pointer shrink-0"
              title="Attach PDF, JPEG, PNG, Excel, CSV or Text document"
            >
              <Paperclip className="w-4 h-4 text-[#007FFF]" />
              <span className="hidden sm:inline font-medium">Attach File</span>
            </button>

            {/* Document Camera Scan Button */}
            <button
              type="button"
              onClick={() => handleOpenScanner('timetable')}
              className="p-2.5 rounded-lg border border-[#007FFF]/40 bg-[#F0F7FF] text-[#007FFF] hover:bg-[#E0F2FE] hover:border-[#007FFF] transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 shadow-xs"
              title="Scan timetable, schedule or document using device camera"
            >
              <Camera className="w-4 h-4 text-[#007FFF]" />
              <span className="hidden sm:inline font-semibold">Document Scan</span>
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything, extract details from document, or paste schedule/circular..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={(!input.trim() && !chatAttachment) || isLoading}
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send
            </Button>
          </form>
        </div>
      </div>

      {/* In-Assistant Academic Calendar & Holiday Analyzer Modal */}
      <Modal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        title="AI Assistant: Granular Academic Calendar & Holiday Extraction"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#5A5E65] leading-relaxed">
            Upload your university circular, PDF calendar, image scan, Excel table, or paste announcement text. The AI Copilot will specifically isolate all <strong>Holiday entities</strong>, expand date ranges into individual daily items, and flag them as certified <strong>Non-Attendance Days</strong> for your Semester Planner.
          </p>

          <div
            onClick={() => chatFileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E8E7E2] hover:border-[#16A34A] hover:bg-[#F4FBF6] transition-all rounded-xl p-6 text-center cursor-pointer space-y-2.5"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EBF7EE] text-[#16A34A] flex items-center justify-center mx-auto shadow-xs">
              <Sun className="w-5 h-5 text-[#F59E0B]" />
            </div>

            <div>
              <p className="text-xs font-semibold text-[#1E2022]">
                {selectedFile ? selectedFile.name : 'Select or drop academic calendar circular file'}
              </p>
              <p className="text-[11px] text-[#848A94] mt-0.5">
                PDF circulars, calendar scans/photos (JPEG/PNG), Excel/CSV holiday gazettes
              </p>
            </div>

            {selectedFile && (
              <span className="inline-block text-[11px] font-mono text-[#16A34A] bg-[#EBF7EE] px-2 py-0.5 rounded">
                {(selectedFile.size / 1024).toFixed(1)} KB selected
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">
              Or Paste Circular / Holiday Notice Text Directly:
            </label>
            <textarea
              rows={4}
              value={pastedCircularText}
              onChange={(e) => setPastedCircularText(e.target.value)}
              placeholder="e.g. List of Gazetted Holidays 2025-2026:
15-08-2025: Independence Day
02-10-2025: Mahatma Gandhi Jayanti
20-10-2025 to 24-10-2025: Diwali Vacation..."
              className="w-full p-2.5 text-xs font-mono rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#E8E7E2]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCalendarModalOpen(false);
                setSelectedFile(null);
                setPastedCircularText('');
              }}
              disabled={isAnalyzingCalendar}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExecuteCalendarAnalysis}
              isLoading={isAnalyzingCalendar}
              disabled={!selectedFile && !pastedCircularText.trim()}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Analyze with AI Assistant
            </Button>
          </div>
        </div>
      </Modal>

      {/* Camera Document Scanner Modal */}
      <DocumentCameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        initialCategory={scannerInitialCategory}
      />
    </div>
  );
};
