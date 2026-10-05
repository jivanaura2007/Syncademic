import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Sun, 
  Clock, 
  Building, 
  Layers, 
  ArrowRight, 
  Edit3, 
  Flag,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppState, UniversityHoliday, AcademicEvent, AcademicEventType, DocumentFormat } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { setBulkHolidays, addEvent, updateSemesterDates, logExtractionMetric } from '../../services/storage';
import { useToast } from '../../components/common/Toast';
import { readFileAsCleanBase64, parseExcelOrCsvLocally } from '../../utils/fileHelper';

interface CalendarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onSuccess?: () => void;
}

interface ExtractedHolidayPreview {
  date: string;
  name: string;
  type: 'national' | 'university' | 'exam_break' | 'special';
  description?: string;
  selected: boolean;
  isNonAttendanceDay?: boolean;
  dayOfWeekName?: string;
}

interface ExtractedEventPreview {
  title: string;
  date: string;
  type: AcademicEventType;
  priority: 'high' | 'medium' | 'low';
  description?: string;
  selected: boolean;
}

export const CalendarImportModal: React.FC<CalendarImportModalProps> = ({
  isOpen,
  onClose,
  state,
  onSuccess
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'manual'>('upload');
  const [docType, setDocType] = useState<'calendar' | 'holidays'>('calendar');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');

  // Extracted data preview state
  const [isReviewing, setIsReviewing] = useState(false);
  const [extractedHolidays, setExtractedHolidays] = useState<ExtractedHolidayPreview[]>([]);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEventPreview[]>([]);
  const [detectedStartDate, setDetectedStartDate] = useState<string>('');
  const [detectedEndDate, setDetectedEndDate] = useState<string>('');
  const [summaryText, setSummaryText] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');

  // Manual holiday entries
  const [manualHolidays, setManualHolidays] = useState<Array<{
    date: string;
    name: string;
    type: 'national' | 'university' | 'exam_break' | 'special';
    description: string;
  }>>([
    { date: '2025-08-15', name: 'Independence Day', type: 'national', description: 'National Holiday' },
    { date: '2025-10-02', name: 'Gandhi Jayanti', type: 'national', description: 'National Holiday' },
    { date: '2025-10-20', name: 'Diwali Festival Break', type: 'special', description: 'University Holiday' }
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1] || res;
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const parseExcelOrCsvLocally = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          let fullText = '';
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            fullText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
          });
          resolve(fullText);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleExtractFromFile = async () => {
    if (!selectedFile) {
      showToast('Please select a calendar or holiday document first', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const fileName = selectedFile.name.toLowerCase();
      let res;

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        const rawText = await parseExcelOrCsvLocally(selectedFile);
        res = await api.calendar.extract({
          rawText,
          fileName: selectedFile.name,
          mode: docType
        });
      } else {
        const { base64, mimeType } = await readFileAsCleanBase64(selectedFile);
        res = await api.calendar.extract({
          fileBase64: base64,
          mimeType,
          fileName: selectedFile.name,
          mode: docType
        });
      }

      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const isCsv = fileName.endsWith('.csv');
      const isPdf = fileName.endsWith('.pdf') || selectedFile.type === 'application/pdf';
      const fileFormat: DocumentFormat = isExcel ? 'excel' : isCsv ? 'csv' : isPdf ? 'pdf' : 'image';
      const success = !!(res?.success && res.data);
      const itemsCount = (res?.data?.holidays?.length || 0) + (res?.data?.events?.length || 0);

      logExtractionMetric({
        fileName: selectedFile.name,
        format: fileFormat,
        target: docType === 'holidays' ? 'holiday_list' : 'academic_calendar',
        success,
        confidenceScore: res?.meta?.confidenceScore || (success ? 95 : 40),
        itemsExtracted: itemsCount,
        processingTimeMs: res?.meta?.processingTimeMs || 1350,
        fileSize: `${Math.round(selectedFile.size / 1024)} KB`,
        notes: success ? `Extracted ${itemsCount} dates/milestones from ${selectedFile.name}.` : 'Failed to parse dates.',
        warnings: res?.meta?.warnings || []
      });

      if (success) {
        processExtractionResult(res.data);
      } else {
        showToast(res?.message || 'Could not parse academic calendar or holidays. Try manual entry or paste text.', 'warning');
      }
    } catch (err: any) {
      console.error('Calendar extract error:', err);
      logExtractionMetric({
        fileName: selectedFile.name,
        format: 'pdf',
        target: docType === 'holidays' ? 'holiday_list' : 'academic_calendar',
        success: false,
        confidenceScore: 30,
        itemsExtracted: 0,
        processingTimeMs: 1400,
        notes: err.message || 'Calendar extraction error.'
      });
      showToast(err.message || 'Failed to analyze academic calendar.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractFromText = async () => {
    if (!pastedText.trim()) {
      showToast('Please paste the calendar circular or holiday text', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.calendar.extract({
        rawText: pastedText.trim(),
        mode: docType
      });

      const success = !!(res?.success && res.data);
      const itemsCount = (res?.data?.holidays?.length || 0) + (res?.data?.events?.length || 0);

      logExtractionMetric({
        fileName: 'Pasted Academic Notice',
        format: 'text',
        target: docType === 'holidays' ? 'holiday_list' : 'academic_calendar',
        success,
        confidenceScore: res?.meta?.confidenceScore || (success ? 92 : 40),
        itemsExtracted: itemsCount,
        processingTimeMs: res?.meta?.processingTimeMs || 750,
        fileSize: `${Math.round(pastedText.length / 1024 * 10) / 10} KB`,
        notes: success ? `Parsed ${itemsCount} calendar entries from pasted announcement.` : 'No dates found.',
        warnings: res?.meta?.warnings || []
      });

      if (success) {
        processExtractionResult(res.data);
      } else {
        showToast((res as any)?.message || 'Could not detect holidays/milestones in the text.', 'warning');
      }
    } catch (err: any) {
      console.error('Calendar text extract error:', err);
      logExtractionMetric({
        fileName: 'Pasted Academic Notice',
        format: 'text',
        target: docType === 'holidays' ? 'holiday_list' : 'academic_calendar',
        success: false,
        confidenceScore: 25,
        itemsExtracted: 0,
        processingTimeMs: 800,
        notes: err.message || 'Text parse failure.'
      });
      showToast(err.message || 'Failed to process calendar text.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const processExtractionResult = (data: any) => {
    const HOLIDAY_REGEX = /\b(holiday|vacation|break|closed|closure|recess|festival|jayanti|diwali|deepavali|independence|republic|gandhi|eid|ramzan|bakrid|muharram|christmas|good\s+friday|easter|holi|dussehra|durga\s+puja|navratri|pongal|onam|makar\s+sankranti|shivaratri|janmashtami|ganesh\s+chaturthi|guru\s+nanak|buddha\s+purnima|mahavir|ambedkar|new\s+year|thanksgiving|memorial\s+day|labor\s+day|labour\s+day|bank\s+holiday|puja|autumn\s+break|winter\s+break|summer\s+vacation|summer\s+break|spring\s+break|study\s+break|non-instructional|off-day|milad|valmiki|governor|patel)\b/i;

    const rawHolidays: any[] = Array.isArray(data.holidays) ? data.holidays : [];
    const rawEvents: any[] = Array.isArray(data.events) ? data.events : [];

    const candidateHolidays: ExtractedHolidayPreview[] = [];
    const candidateEvents: ExtractedEventPreview[] = [];

    // Helper to safely expand date strings (handles "YYYY-MM-DD to YYYY-MM-DD")
    const expandDates = (dateStr: string): string[] => {
      if (!dateStr) return [];
      const clean = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return [clean];

      const rangeMatch = clean.match(/^(\d{4}-\d{2}-\d{2})\s*(?:to|-|through|\/)\s*(\d{4}-\d{2}-\d{2})$/i);
      if (rangeMatch) {
        const start = new Date(rangeMatch[1]);
        const end = new Date(rangeMatch[2]);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          const list: string[] = [];
          const cur = new Date(start);
          let count = 0;
          while (cur <= end && count < 31) {
            list.push(cur.toISOString().split('T')[0]);
            cur.setDate(cur.getDate() + 1);
            count++;
          }
          return list;
        }
      }
      return [clean];
    };

    // 1. Process events and auto-promote any that are holidays
    for (const ev of rawEvents) {
      const fullText = `${ev.title || ''} ${ev.description || ''}`;
      if (HOLIDAY_REGEX.test(fullText)) {
        const isNational = /\b(independence|republic|gandhi|national)\b/i.test(fullText);
        const isFestive = /\b(diwali|deepavali|eid|christmas|holi|dussehra|durga|navratri|pongal|onam)\b/i.test(fullText);
        const dates = expandDates(ev.date || '');
        dates.forEach(d => {
          candidateHolidays.push({
            date: d,
            name: ev.title || 'University Holiday',
            type: isNational ? 'national' : isFestive ? 'special' : 'university',
            description: ev.description || 'Official University Holiday (Non-Attendance Day)',
            selected: true,
            isNonAttendanceDay: true
          });
        });
      } else {
        candidateEvents.push({
          title: ev.title || 'Academic Event',
          date: ev.date || '',
          type: (['exam', 'assignment', 'event', 'project'].includes(ev.type) ? ev.type : 'event'),
          priority: (['high', 'medium', 'low'].includes(ev.priority) ? ev.priority : 'medium'),
          description: ev.description || '',
          selected: true
        });
      }
    }

    // 2. Add explicit holidays and expand ranges
    for (const h of rawHolidays) {
      const dates = expandDates(h.date || '');
      dates.forEach((d, idx) => {
        candidateHolidays.push({
          date: d,
          name: dates.length > 1 ? `${h.name || 'Holiday'} (Day ${idx + 1})` : (h.name || 'Holiday'),
          type: (['national', 'university', 'exam_break', 'special'].includes(h.type) ? h.type : 'university'),
          description: h.description || 'Declared Non-Attendance Day - University Closed',
          selected: true,
          isNonAttendanceDay: true,
          dayOfWeekName: h.dayOfWeekName
        });
      });
    }

    // 3. Deduplicate holidays by date
    const dedupedHolidaysMap = new Map<string, ExtractedHolidayPreview>();
    for (const h of candidateHolidays) {
      h.isNonAttendanceDay = true;
      if (!dedupedHolidaysMap.has(h.date)) {
        dedupedHolidaysMap.set(h.date, h);
      } else {
        const ex = dedupedHolidaysMap.get(h.date)!;
        if (h.name.length > ex.name.length) {
          dedupedHolidaysMap.set(h.date, h);
        }
      }
    }

    const holidays = Array.from(dedupedHolidaysMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const events = candidateEvents.sort((a, b) => a.date.localeCompare(b.date));

    setExtractedHolidays(holidays);
    setExtractedEvents(events);
    setDetectedStartDate(data.semesterStartDate || '');
    setDetectedEndDate(data.semesterEndDate || '');
    setSummaryText(data.summary || '');
    setIsReviewing(true);

    showToast(
      `Extracted ${holidays.length} holidays & ${events.length} academic milestones!`,
      'success'
    );
  };

  const handlePrepareManualForReview = () => {
    const valid = manualHolidays.filter(h => h.name.trim() && h.date.trim());
    if (valid.length === 0) {
      showToast('Please provide at least one valid holiday', 'warning');
      return;
    }

    setExtractedHolidays(valid.map(h => ({ ...h, selected: true })));
    setExtractedEvents([]);
    setIsReviewing(true);
  };

  const handleAddManualRow = () => {
    setManualHolidays(prev => [
      ...prev,
      {
        date: new Date().toISOString().split('T')[0],
        name: '',
        type: 'university',
        description: 'University Holiday'
      }
    ]);
  };

  const handleRemoveManualRow = (index: number) => {
    setManualHolidays(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateManualRow = (index: number, key: string, value: any) => {
    setManualHolidays(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleToggleHoliday = (index: number) => {
    setExtractedHolidays(prev => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const handleToggleEvent = (index: number) => {
    setExtractedEvents(prev => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const handleMoveEventToHoliday = (index: number) => {
    const targetEvent = extractedEvents[index];
    if (!targetEvent) return;

    const isNational = /\b(independence|republic|gandhi|national)\b/i.test(targetEvent.title);
    const isSpecial = /\b(diwali|deepavali|eid|christmas|holi|dussehra|festival|vacation|break)\b/i.test(targetEvent.title);

    const newHoliday: ExtractedHolidayPreview = {
      date: targetEvent.date,
      name: targetEvent.title,
      type: isNational ? 'national' : isSpecial ? 'special' : 'university',
      description: targetEvent.description || 'Promoted from circular notice',
      selected: true
    };

    setExtractedEvents(prev => prev.filter((_, idx) => idx !== index));
    setExtractedHolidays(prev => [...prev, newHoliday].sort((a, b) => a.date.localeCompare(b.date)));
    showToast(`Promoted "${targetEvent.title}" to Holidays list`, 'info');
  };

  const handleQuickAddHolidayInReview = () => {
    const today = new Date().toISOString().split('T')[0];
    const newHoliday: ExtractedHolidayPreview = {
      date: today,
      name: 'University Holiday',
      type: 'university',
      description: 'Official Declared Holiday',
      selected: true
    };
    setExtractedHolidays(prev => [newHoliday, ...prev]);
  };

  const handleDeleteHolidayInReview = (index: number) => {
    setExtractedHolidays(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleDeleteEventInReview = (index: number) => {
    setExtractedEvents(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmAndSave = async () => {
    const selectedHolidays = extractedHolidays.filter(h => h.selected);
    const selectedEvents = extractedEvents.filter(e => e.selected);

    if (selectedHolidays.length === 0 && selectedEvents.length === 0 && !detectedStartDate && !detectedEndDate) {
      showToast('Please select at least one holiday or event to import', 'warning');
      return;
    }

    try {
      // 1. Save Holidays to state & backend (state.holidays)
      if (selectedHolidays.length > 0) {
        setBulkHolidays(
          selectedHolidays.map(h => ({
            id: crypto.randomUUID(),
            date: h.date,
            name: h.name,
            type: h.type,
            description: h.description,
            isNonAttendanceDay: true,
            dayOfWeekName: h.dayOfWeekName
          })),
          { startDate: detectedStartDate || undefined, endDate: detectedEndDate || undefined },
          importMode
        );

        // Also mirror into events with type='holiday' so planner and events list show them seamlessly
        selectedHolidays.forEach(h => {
          addEvent({
            title: h.name,
            date: h.date,
            type: 'holiday',
            priority: h.type === 'national' ? 'high' : 'medium',
            description: h.description || (h.type === 'national' ? 'National Holiday' : 'University Holiday'),
            completed: new Date(h.date) < new Date(),
            isNonAttendanceDay: true
          });
        });
      }

      // 2. Save Academic Events/Exams to state
      selectedEvents.forEach(ev => {
        addEvent({
          title: ev.title,
          date: ev.date,
          type: ev.type,
          priority: ev.priority,
          description: ev.description,
          completed: false
        });
      });

      // 3. Update semester dates if detected
      if (detectedStartDate || detectedEndDate) {
        updateSemesterDates(detectedStartDate || undefined, detectedEndDate || undefined);
      }

      showToast(
        `Successfully imported ${selectedHolidays.length} holidays & ${selectedEvents.length} academic milestones!`,
        'success'
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Calendar save error:', err);
      showToast(err.message || 'Failed to save calendar data', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReviewing ? 'Review Academic Calendar & Holidays' : 'Import Academic Calendar & Holiday List'}
      maxWidth={isReviewing ? '3xl' : '2xl'}
    >
      {!isReviewing ? (
        <div className="space-y-5">
          {/* Document type selection */}
          <div className="flex items-center gap-2 p-1 bg-[#FCFBF8] border border-[#E8E7E2] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setDocType('calendar')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                docType === 'calendar'
                  ? 'bg-[#1E2022] text-white shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Full Academic Calendar (Holidays + Exams + Dates)</span>
            </button>

            <button
              onClick={() => setDocType('holidays')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                docType === 'holidays'
                  ? 'bg-[#1E2022] text-white shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Dedicated Holiday List Only</span>
            </button>
          </div>

          {/* Method tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#FCFBF8] border border-[#E8E7E2] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'upload'
                  ? 'bg-[#1E2022] text-white shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>PDF / Image / Excel</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'paste'
                  ? 'bg-[#1E2022] text-white shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Text</span>
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'manual'
                  ? 'bg-[#1E2022] text-white shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>
          </div>

          {/* Tab 1: Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E8E7E2] hover:border-[#16A34A] hover:bg-[#F4FBF6] transition-all rounded-2xl p-8 text-center cursor-pointer space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-[#EBF7EE] text-[#16A34A] flex items-center justify-center mx-auto shadow-xs">
                  <CalendarIcon className="w-6 h-6" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#1E2022]">
                    Select or drag & drop university academic circular or holiday list
                  </p>
                  <p className="text-[11px] text-[#848A94] mt-1">
                    Supports official University PDF calendars, scans/photos, Excel sheets & CSV tables
                  </p>
                </div>

                {selectedFile && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E8E7E2] text-xs font-medium text-[#1E2022] shadow-xs">
                    <FileText className="w-4 h-4 text-[#16A34A]" />
                    <span className="font-mono">{selectedFile.name}</span>
                    <span className="text-[10px] text-[#848A94]">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
              </div>

              {filePreviewUrl && (
                <div className="p-3 bg-[#FCFBF8] rounded-xl border border-[#E8E7E2] space-y-1.5">
                  <p className="text-[11px] font-semibold text-[#5A5E65]">Image Preview:</p>
                  <img
                    src={filePreviewUrl}
                    alt="Calendar upload"
                    className="max-h-48 rounded-lg object-contain mx-auto border border-[#E8E7E2]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E7E2]">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExtractFromFile}
                  isLoading={isProcessing}
                  disabled={!selectedFile}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Extract Holidays & Dates
                </Button>
              </div>
            </div>
          )}

          {/* Tab 2: Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E2022] mb-1">
                  Paste Calendar Circular or Holiday Table Text
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Example:
ACADEMIC YEAR 2025-2026 CALENDAR
Semester Starts: August 1, 2025
Semester Ends: December 15, 2025

List of Gazetted & University Holidays:
15-08-2025: Independence Day
02-10-2025: Mahatma Gandhi Jayanti
20-10-2025 to 24-10-2025: Diwali Vacation
25-12-2025: Christmas Day

Exam Schedule:
Mid-Semester Exams: Oct 6, 2025 - Oct 12, 2025
End-Semester Exams: Dec 1, 2025 - Dec 14, 2025"
                  className="w-full p-3 text-xs font-mono rounded-xl border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E7E2]">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExtractFromText}
                  isLoading={isProcessing}
                  disabled={!pastedText.trim()}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Extract with AI
                </Button>
              </div>
            </div>
          )}

          {/* Tab 3: Manual */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1E2022]">
                  Manual Holiday List ({manualHolidays.length})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualRow}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Holiday
                </Button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                {manualHolidays.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-3">
                      <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">Date</label>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => handleUpdateManualRow(idx, 'date', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#E8E7E2] bg-white text-xs"
                      />
                    </div>

                    <div className="col-span-4">
                      <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">Holiday Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Independence Day"
                        value={row.name}
                        onChange={(e) => handleUpdateManualRow(idx, 'name', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#E8E7E2] bg-white text-xs"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">Type</label>
                      <select
                        value={row.type}
                        onChange={(e) => handleUpdateManualRow(idx, 'type', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#E8E7E2] bg-white text-xs"
                      >
                        <option value="national">National Holiday</option>
                        <option value="university">University Holiday</option>
                        <option value="exam_break">Exam Break</option>
                        <option value="special">Special / Festival</option>
                      </select>
                    </div>

                    <div className="col-span-2 flex justify-center pt-3">
                      <button
                        onClick={() => handleRemoveManualRow(idx)}
                        className="p-1 rounded text-[#848A94] hover:text-[#D9381E] hover:bg-[#FDF2F2]"
                        title="Delete Holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E7E2]">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePrepareManualForReview}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  Review Holidays ({manualHolidays.length})
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Review Step */
        <div className="space-y-4">
          {summaryText && (
            <div className="p-3 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] text-xs text-[#5A5E65] leading-relaxed">
              <strong className="text-[#1E2022]">Extracted Summary: </strong>
              {summaryText}
            </div>
          )}

          {/* Detected Semester Bounds */}
          {(detectedStartDate || detectedEndDate) && (
            <div className="p-3 rounded-xl bg-white border border-[#E8E7E2] grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-[#848A94] mb-1">
                  Detected Semester Start Date
                </label>
                <input
                  type="date"
                  value={detectedStartDate}
                  onChange={(e) => setDetectedStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#848A94] mb-1">
                  Detected Semester End Date
                </label>
                <input
                  type="date"
                  value={detectedEndDate}
                  onChange={(e) => setDetectedEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8]"
                />
              </div>
            </div>
          )}

          {/* Review Header Stats & Advisory */}
          <div className="p-3.5 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EBF7EE] text-[#16A34A] font-semibold border border-[#D1F2D9]">
                  <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>{extractedHolidays.filter(h => h.selected).length} Holidays</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E6F2FF] text-[#007FFF] font-semibold border border-[#CCE5FF]">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>{extractedEvents.filter(e => e.selected).length} Academic Milestones</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-[#5A5E65]">Import Mode:</label>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                  className="px-2 py-1 text-xs rounded-lg border border-[#E8E7E2] bg-white font-medium text-[#1E2022]"
                >
                  <option value="replace">Replace Existing Holidays</option>
                  <option value="merge">Merge with Existing</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-[#5A5E65] leading-relaxed">
              💡 <strong>Attendance Safety:</strong> Official holidays are automatically excluded from attendance penalty calculations and scheduled class instances.
            </p>
          </div>

          {/* Holidays Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-xs font-semibold text-[#1E2022]">
                University Holidays ({extractedHolidays.filter(h => h.selected).length}/{extractedHolidays.length})
              </span>
            </div>

            <Button
              variant="outline"
              size="xs"
              onClick={handleQuickAddHolidayInReview}
              leftIcon={<Plus className="w-3 h-3 text-[#16A34A]" />}
            >
              Add Holiday
            </Button>
          </div>

          {/* Holidays List */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {extractedHolidays.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#E8E7E2] text-center space-y-2">
                <p className="text-xs text-[#848A94] italic">No holidays recognized in this section.</p>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleQuickAddHolidayInReview}
                  leftIcon={<Plus className="w-3 h-3" />}
                >
                  Add a Holiday Manually
                </Button>
              </div>
            ) : (
              extractedHolidays.map((holiday, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                    holiday.selected
                      ? 'bg-white border-[#E8E7E2] shadow-2xs'
                      : 'bg-[#F9F9F8] border-dashed border-[#E8E7E2] opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={holiday.selected}
                      onChange={() => handleToggleHoliday(idx)}
                      className="w-4 h-4 rounded text-[#16A34A] cursor-pointer"
                    />

                    <span className="font-mono text-[11px] font-semibold text-[#1E2022] shrink-0">
                      {holiday.date}
                    </span>

                    <div className="min-w-0">
                      <p className="font-medium text-[#1E2022] truncate">{holiday.name}</p>
                      {holiday.description && (
                        <p className="text-[10px] text-[#848A94] truncate">{holiday.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-[#16A34A] bg-[#EBF7EE] border border-[#D1F2D9] shrink-0">
                      <Sun className="w-3 h-3 text-[#F59E0B]" />
                      Non-Attendance Day
                    </span>
                    <Badge variant={holiday.type === 'national' ? 'red' : holiday.type === 'special' ? 'yellow' : 'neutral'}>
                      {holiday.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <button
                      onClick={() => handleDeleteHolidayInReview(idx)}
                      className="p-1 text-[#848A94] hover:text-[#D9381E] rounded transition-colors"
                      title="Remove holiday from list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Extracted Academic Milestones / Exams */}
          {extractedEvents.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#E8E7E2]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#007FFF]" />
                  <span className="text-xs font-semibold text-[#1E2022]">
                    Exams & Academic Milestones ({extractedEvents.filter(e => e.selected).length}/{extractedEvents.length})
                  </span>
                </div>
                <span className="text-[10px] text-[#848A94]">Click "Move to Holiday" if any event is actually a non-working day</span>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {extractedEvents.map((event, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                      event.selected
                        ? 'bg-white border-[#E8E7E2] shadow-2xs'
                        : 'bg-[#F9F9F8] border-dashed border-[#E8E7E2] opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={event.selected}
                        onChange={() => handleToggleEvent(idx)}
                        className="w-4 h-4 rounded text-[#007FFF] cursor-pointer"
                      />

                      <span className="font-mono text-[11px] font-semibold text-[#1E2022] shrink-0">
                        {event.date}
                      </span>

                      <div className="min-w-0">
                        <p className="font-medium text-[#1E2022] truncate">{event.title}</p>
                        {event.description && (
                          <p className="text-[10px] text-[#848A94] truncate">{event.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleMoveEventToHoliday(idx)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#FCFBF8] border border-[#E8E7E2] text-[#F59E0B] hover:bg-[#FEF8EC] hover:border-[#FAD99F] transition-all flex items-center gap-1"
                        title="Promote this event to official holidays"
                      >
                        <Sun className="w-3 h-3 text-[#F59E0B]" />
                        <span>Move to Holidays</span>
                      </button>

                      <Badge variant={event.type === 'exam' ? 'critical' : 'blue'}>
                        {event.type.toUpperCase()}
                      </Badge>

                      <button
                        onClick={() => handleDeleteEventInReview(idx)}
                        className="p-1 text-[#848A94] hover:text-[#D9381E] rounded transition-colors"
                        title="Remove milestone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-[#E8E7E2]">
            <Button variant="outline" size="sm" onClick={() => setIsReviewing(false)}>
              Back to Source
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAndSave}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Apply Calendar & Holidays
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
