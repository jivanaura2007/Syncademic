import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Clock, 
  Building, 
  User, 
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Edit3,
  X,
  Camera
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppState, TimetableSlot, DayOfWeek, Subject, DocumentFormat } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { DocumentCameraScannerModal } from '../scanner/DocumentCameraScannerModal';
import { api } from '../../services/api';
import { setBulkTimetableSlots, logExtractionMetric } from '../../services/storage';
import { useToast } from '../../components/common/Toast';
import { readFileAsCleanBase64, parseExcelOrCsvLocally, normalizeTimeTo24Hour } from '../../utils/fileHelper';

interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onSuccess?: () => void;
}

const DAYS_MAP: Record<DayOfWeek, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

const SUBJECT_COLORS = [
  '#007FFF', '#16A34A', '#E82A89', '#F59E0B', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#10B981', '#6366F1', '#D9381E'
];

interface ExtractedSlotPreview {
  dayOfWeek: DayOfWeek;
  subjectCode: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  room?: string;
  faculty?: string;
  type?: 'lecture' | 'lab' | 'tutorial';
  selected: boolean;
}

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({
  isOpen,
  onClose,
  state,
  onSuccess
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'manual'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  
  // Extracted preview state
  const [previewSlots, setPreviewSlots] = useState<ExtractedSlotPreview[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [isCameraScanOpen, setIsCameraScanOpen] = useState(false);

  const handleCameraScanSuccess = (scanData: {
    photoBase64: string;
    mimeType: string;
    fileName: string;
    targetCategory: string;
    extractionResult: any;
  }) => {
    const rawSlots = scanData?.extractionResult?.slots || [];
    if (Array.isArray(rawSlots) && rawSlots.length > 0) {
      const formatted: ExtractedSlotPreview[] = rawSlots.map((s: any) => ({
        dayOfWeek: (typeof s.dayOfWeek === 'number' ? s.dayOfWeek : Number(s.dayOfWeek) || 1) as DayOfWeek,
        subjectCode: (s.subjectCode || 'SUB').toUpperCase().trim(),
        subjectName: (s.subjectName || s.subjectCode || 'Lecture Period').trim(),
        startTime: normalizeTimeTo24Hour(s.startTime, false),
        endTime: normalizeTimeTo24Hour(s.endTime, true),
        room: s.room || 'LH-101',
        faculty: s.faculty || '',
        type: (['lecture', 'lab', 'tutorial'].includes(s.type) ? s.type : 'lecture'),
        selected: true
      })).sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
      });

      setPreviewSlots(formatted);
      setIsReviewing(true);
      showToast(`Document scan parsed ${formatted.length} timetable periods with Gemini AI!`, 'success');
    } else {
      showToast('Could not identify distinct class periods in the scanned photo. Please try again with clear lighting.', 'warning');
    }
  };

  // Manual entry table state
  const [manualRows, setManualRows] = useState<Array<{
    day: DayOfWeek;
    subjectName: string;
    subjectCode: string;
    startTime: string;
    endTime: string;
    room: string;
    faculty: string;
    type: 'lecture' | 'lab' | 'tutorial';
  }>>([
    { day: 1, subjectName: 'Data Structures & Algorithms', subjectCode: 'CS301', startTime: '09:00', endTime: '10:00', room: 'LH-204', faculty: 'Dr. Sharma', type: 'lecture' },
    { day: 1, subjectName: 'Database Management Systems', subjectCode: 'CS302', startTime: '10:15', endTime: '11:15', room: 'LH-204', faculty: 'Prof. Rao', type: 'lecture' },
    { day: 1, subjectName: 'DSA Laboratory', subjectCode: 'CS301L', startTime: '14:00', endTime: '16:00', room: 'CS-Lab-3', faculty: 'Dr. Sharma', type: 'lab' }
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
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

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        // Strip data:mime/type;base64,
        const base64 = res.split(',')[1] || res;
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Parse Excel / CSV locally with XLSX to text / structured rows
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
      showToast('Please select a PDF, image, Excel or CSV file first', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const fileName = selectedFile.name.toLowerCase();
      let res;

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        // Parse sheets locally and send content to AI for intelligent slot mapping
        const rawText = await parseExcelOrCsvLocally(selectedFile);
        res = await api.timetable.extract({
          rawText,
          fileName: selectedFile.name,
          semester: state.profile.semester || 1
        });
      } else {
        // PDF or Image
        const { base64, mimeType } = await readFileAsCleanBase64(selectedFile);
        res = await api.timetable.extract({
          fileBase64: base64,
          mimeType,
          fileName: selectedFile.name,
          semester: state.profile.semester || 1
        });
      }

      const rawSlots = res?.data?.slots || (res as any)?.slots || [];
      const success = !!(res?.success && Array.isArray(rawSlots) && rawSlots.length > 0);
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const isCsv = fileName.endsWith('.csv');
      const isPdf = fileName.endsWith('.pdf') || selectedFile.type === 'application/pdf';
      const fileFormat: DocumentFormat = isExcel ? 'excel' : isCsv ? 'csv' : isPdf ? 'pdf' : 'image';

      logExtractionMetric({
        fileName: selectedFile.name,
        format: fileFormat,
        target: 'timetable',
        success,
        confidenceScore: res?.meta?.confidenceScore || (success ? 94 : 45),
        itemsExtracted: rawSlots.length,
        processingTimeMs: res?.meta?.processingTimeMs || 1200,
        fileSize: `${Math.round(selectedFile.size / 1024)} KB`,
        notes: success ? `Extracted ${rawSlots.length} class slots from ${selectedFile.name}.` : 'Failed to parse structured periods.',
        warnings: res?.meta?.warnings || []
      });

      if (success) {
        const formatted: ExtractedSlotPreview[] = rawSlots.map((s: any) => ({
          dayOfWeek: (typeof s.dayOfWeek === 'number' ? s.dayOfWeek : Number(s.dayOfWeek) || 1) as DayOfWeek,
          subjectCode: (s.subjectCode || 'GEN').toUpperCase().trim(),
          subjectName: (s.subjectName || s.subjectCode || 'General Lecture').trim(),
          startTime: normalizeTimeTo24Hour(s.startTime, false),
          endTime: normalizeTimeTo24Hour(s.endTime, true),
          room: s.room || 'LH-101',
          faculty: s.faculty || '',
          type: (['lecture', 'lab', 'tutorial'].includes(s.type) ? s.type : 'lecture'),
          selected: true
        })).sort((a, b) => {
          if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
          return a.startTime.localeCompare(b.startTime);
        });

        setPreviewSlots(formatted);
        setIsReviewing(true);
        showToast(`Successfully extracted ${formatted.length} classes from ${selectedFile.name}!`, 'success');
      } else {
        showToast((res as any)?.message || 'Could not detect timetable classes from the document. Please try pasting raw text or using manual entry.', 'warning');
      }
    } catch (err: any) {
      console.error('Timetable extract error:', err);
      logExtractionMetric({
        fileName: selectedFile.name,
        format: 'pdf',
        target: 'timetable',
        success: false,
        confidenceScore: 30,
        itemsExtracted: 0,
        processingTimeMs: 1500,
        notes: err.message || 'Extraction exception.'
      });
      showToast(err.message || 'Failed to analyze timetable document.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractFromText = async () => {
    if (!pastedText.trim()) {
      showToast('Please paste your timetable text or schedule content', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.timetable.extract({
        rawText: pastedText.trim(),
        semester: state.profile.semester || 1
      });

      const rawSlots = res?.data?.slots || (res as any)?.slots || [];
      const success = !!(res?.success && Array.isArray(rawSlots) && rawSlots.length > 0);

      logExtractionMetric({
        fileName: 'Pasted Schedule Text',
        format: 'text',
        target: 'timetable',
        success,
        confidenceScore: res?.meta?.confidenceScore || (success ? 93 : 40),
        itemsExtracted: rawSlots.length,
        processingTimeMs: res?.meta?.processingTimeMs || 800,
        fileSize: `${Math.round(pastedText.length / 1024 * 10) / 10} KB`,
        notes: success ? `Extracted ${rawSlots.length} timetable periods from text prompt.` : 'No structured periods found.',
        warnings: res?.meta?.warnings || []
      });

      if (success) {
        const formatted: ExtractedSlotPreview[] = rawSlots.map((s: any) => ({
          dayOfWeek: (typeof s.dayOfWeek === 'number' ? s.dayOfWeek : Number(s.dayOfWeek) || 1) as DayOfWeek,
          subjectCode: (s.subjectCode || 'GEN').toUpperCase().trim(),
          subjectName: (s.subjectName || s.subjectCode || 'General Lecture').trim(),
          startTime: normalizeTimeTo24Hour(s.startTime, false),
          endTime: normalizeTimeTo24Hour(s.endTime, true),
          room: s.room || 'LH-101',
          faculty: s.faculty || '',
          type: (['lecture', 'lab', 'tutorial'].includes(s.type) ? s.type : 'lecture'),
          selected: true
        })).sort((a, b) => {
          if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
          return a.startTime.localeCompare(b.startTime);
        });

        setPreviewSlots(formatted);
        setIsReviewing(true);
        showToast(`Successfully extracted ${formatted.length} timetable slots!`, 'success');
      } else {
        showToast((res as any)?.message || 'No structured timetable slots detected. Try adding more context or formatting.', 'warning');
      }
    } catch (err: any) {
      console.error('Timetable text extract error:', err);
      logExtractionMetric({
        fileName: 'Pasted Schedule Text',
        format: 'text',
        target: 'timetable',
        success: false,
        confidenceScore: 25,
        itemsExtracted: 0,
        processingTimeMs: 900,
        notes: err.message || 'Text extraction failure.'
      });
      showToast(err.message || 'Failed to process pasted timetable text.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrepareManualForReview = () => {
    const validRows = manualRows.filter(r => r.subjectName.trim() || r.subjectCode.trim());
    if (validRows.length === 0) {
      showToast('Please add at least one subject slot', 'warning');
      return;
    }

    const formatted: ExtractedSlotPreview[] = validRows.map(r => ({
      dayOfWeek: r.day,
      subjectCode: (r.subjectCode.trim() || 'GEN').toUpperCase(),
      subjectName: r.subjectName.trim() || r.subjectCode.trim() || 'Subject',
      startTime: r.startTime,
      endTime: r.endTime,
      room: r.room.trim() || 'LH-101',
      faculty: r.faculty.trim() || '',
      type: r.type,
      selected: true
    }));

    setPreviewSlots(formatted);
    setIsReviewing(true);
  };

  const handleAddManualRow = () => {
    setManualRows(prev => [
      ...prev,
      {
        day: 1,
        subjectName: '',
        subjectCode: '',
        startTime: '09:00',
        endTime: '10:00',
        room: 'LH-201',
        faculty: '',
        type: 'lecture'
      }
    ]);
  };

  const handleRemoveManualRow = (index: number) => {
    setManualRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateManualRow = (index: number, key: string, value: any) => {
    setManualRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleToggleSelectSlot = (index: number) => {
    setPreviewSlots(prev => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const handleRemovePreviewSlot = (index: number) => {
    setPreviewSlots(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmAndSave = async () => {
    const selected = previewSlots.filter(s => s.selected);
    if (selected.length === 0) {
      showToast('Please select at least one timetable slot to import', 'warning');
      return;
    }

    try {
      // Create subjects for any course codes not existing yet
      const currentSubjects = [...state.subjects];
      const newCreatedSubjects: Subject[] = [];

      selected.forEach(s => {
        const existing = currentSubjects.find(cs => cs.code.toUpperCase() === s.subjectCode.toUpperCase());
        if (!existing) {
          const newSub: Subject = {
            id: crypto.randomUUID(),
            name: s.subjectName || s.subjectCode,
            code: s.subjectCode.toUpperCase(),
            faculty: s.faculty || 'Faculty Instructor',
            room: s.room || 'LH-101',
            credits: 3,
            targetAttendance: state.profile.defaultAttendanceThreshold || 75,
            totalClasses: 0,
            attendedClasses: 0,
            color: '#E82A89'
          };
          currentSubjects.push(newSub);
          newCreatedSubjects.push(newSub);
        }
      });

      const finalSlots: TimetableSlot[] = selected.map(s => {
        const sub = currentSubjects.find(cs => cs.code.toUpperCase() === s.subjectCode.toUpperCase());
        return {
          id: crypto.randomUUID(),
          subjectId: sub?.id || currentSubjects[0]?.id || crypto.randomUUID(),
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room || 'LH-101',
          faculty: s.faculty || '',
          type: s.type || 'lecture'
        };
      });

      setBulkTimetableSlots(finalSlots, newCreatedSubjects, importMode);
      showToast(`Successfully imported ${selected.length} classes into your semester timetable!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Import save error:', err);
      showToast(err.message || 'Failed to save timetable slots', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReviewing ? 'Review & Finalize Semester Timetable' : 'Import Semester Timetable'}
      maxWidth={isReviewing ? '3xl' : '2xl'}
    >
      {!isReviewing ? (
        <div className="space-y-5">
          {/* Method selector tabs */}
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
              <span>Paste Text / Table</span>
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
              <span>Manual Multi-Entry</span>
            </button>
          </div>

          {/* Tab 1: File Upload (PDF, Image, Excel, CSV) */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E8E7E2] hover:border-[#007FFF] hover:bg-[#F0F7FF] transition-all rounded-2xl p-8 text-center cursor-pointer space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-[#F4F3EE] text-[#1E2022] flex items-center justify-center mx-auto shadow-xs">
                  <Sparkles className="w-6 h-6 text-[#007FFF]" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#1E2022]">
                    Click to browse or drag & drop timetable document
                  </p>
                  <p className="text-[11px] text-[#848A94] mt-1">
                    Supports Official PDF Schedules, PNG/JPG Timetable Screenshots, Excel (.xlsx/.xls) & CSV
                  </p>
                </div>

                {selectedFile && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E8E7E2] text-xs font-medium text-[#1E2022] shadow-xs">
                    <FileText className="w-4 h-4 text-[#007FFF]" />
                    <span className="font-mono">{selectedFile.name}</span>
                    <span className="text-[10px] text-[#848A94]">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
              </div>

              {/* Or Scan with Camera Option */}
              <div className="flex items-center justify-center gap-3">
                <div className="h-px bg-[#E8E7E2] flex-1" />
                <span className="text-[11px] font-semibold text-[#848A94] uppercase tracking-wider">or scan directly</span>
                <div className="h-px bg-[#E8E7E2] flex-1" />
              </div>

              <button
                type="button"
                onClick={() => setIsCameraScanOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-[#007FFF]/40 bg-[#F0F7FF] text-[#007FFF] hover:bg-[#E0F2FE] hover:border-[#007FFF] transition-all flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Camera className="w-4 h-4 text-[#007FFF]" />
                <span>Take Photo of Timetable with Device Camera</span>
              </button>

              {filePreviewUrl && (
                <div className="p-3 bg-[#FCFBF8] rounded-xl border border-[#E8E7E2] space-y-1.5">
                  <p className="text-[11px] font-semibold text-[#5A5E65]">Image Preview:</p>
                  <img
                    src={filePreviewUrl}
                    alt="Timetable upload"
                    className="max-h-48 rounded-lg object-contain mx-auto border border-[#E8E7E2]"
                  />
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] flex items-start gap-2.5 text-xs text-[#5A5E65]">
                <Sparkles className="w-4 h-4 text-[#007FFF] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Our multimodal AI automatically reads your course names, course codes, class time slots, room numbers, and faculty details from the document.
                </p>
              </div>

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
                  Analyze & Extract Timetable
                </Button>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Raw Text */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E2022] mb-1">
                  Paste Timetable Text or Syllabus Matrix
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Example:
Monday:
09:00 - 10:00: CS301 Data Structures (LH-204) - Dr. Sharma
10:15 - 11:15: CS302 Database Management Systems (LH-204) - Prof. Rao
14:00 - 16:00: CS301L DSA Lab (Lab-3)

Tuesday:
09:00 - 10:00: MAT201 Linear Algebra (LH-102)..."
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
                  Parse with AI
                </Button>
              </div>
            </div>
          )}

          {/* Tab 3: Manual Entry */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1E2022]">
                  Add Timetable Slots ({manualRows.length})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualRow}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Class Slot
                </Button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                {manualRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">Day</label>
                      <select
                        value={row.day}
                        onChange={(e) => handleUpdateManualRow(idx, 'day', Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#E8E7E2] bg-white text-xs"
                      >
                        {[1, 2, 3, 4, 5, 6].map(d => (
                          <option key={d} value={d}>{DAYS_MAP[d as DayOfWeek]}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">Subject Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Operating Systems"
                        value={row.subjectName}
                        onChange={(e) => handleUpdateManualRow(idx, 'subjectName', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#E8E7E2] bg-white text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">Code</label>
                      <input
                        type="text"
                        placeholder="CS304"
                        value={row.subjectCode}
                        onChange={(e) => handleUpdateManualRow(idx, 'subjectCode', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#E8E7E2] bg-white text-xs font-mono uppercase"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">Time</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="09:00"
                          value={row.startTime}
                          onChange={(e) => handleUpdateManualRow(idx, 'startTime', e.target.value)}
                          className="w-14 px-1.5 py-1.5 rounded-lg border border-[#E8E7E2] bg-white text-xs font-mono text-center"
                        />
                        <span>-</span>
                        <input
                          type="text"
                          placeholder="10:00"
                          value={row.endTime}
                          onChange={(e) => handleUpdateManualRow(idx, 'endTime', e.target.value)}
                          className="w-14 px-1.5 py-1.5 rounded-lg border border-[#E8E7E2] bg-white text-xs font-mono text-center"
                        />
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">Room & Type</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="LH-101"
                          value={row.room}
                          onChange={(e) => handleUpdateManualRow(idx, 'room', e.target.value)}
                          className="w-full px-1.5 py-1.5 rounded-lg border border-[#E8E7E2] bg-white text-xs"
                        />
                        <select
                          value={row.type}
                          onChange={(e) => handleUpdateManualRow(idx, 'type', e.target.value)}
                          className="px-1.5 py-1.5 rounded-lg border border-[#E8E7E2] bg-white text-xs"
                        >
                          <option value="lecture">Lec</option>
                          <option value="lab">Lab</option>
                          <option value="tutorial">Tut</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-span-1 flex justify-center pt-3">
                      <button
                        onClick={() => handleRemoveManualRow(idx)}
                        className="p-1 rounded text-[#848A94] hover:text-[#D9381E] hover:bg-[#FDF2F2]"
                        title="Delete Row"
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
                  Review Extracted Slots ({manualRows.length})
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Review Step */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2]">
            <div>
              <p className="text-xs font-semibold text-[#1E2022]">
                {previewSlots.filter(s => s.selected).length} of {previewSlots.length} Classes Selected
              </p>
              <p className="text-[11px] text-[#5A5E65]">
                Review the parsed timetable schedule below. Uncheck any slots you want to exclude.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#5A5E65]">Import Mode:</label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                className="px-2.5 py-1 text-xs rounded-lg border border-[#E8E7E2] bg-white font-medium text-[#1E2022]"
              >
                <option value="replace">Replace Existing Timetable</option>
                <option value="merge">Append / Merge with Existing</option>
              </select>
            </div>
          </div>

          {/* Slots Table by Day */}
          <div className="max-h-80 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {[1, 2, 3, 4, 5, 6].map((dayNum) => {
              const daySlots = previewSlots.filter(s => s.dayOfWeek === dayNum);
              if (daySlots.length === 0) return null;

              return (
                <div key={dayNum} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1E2022] px-1">
                    <Calendar className="w-3.5 h-3.5 text-[#007FFF]" />
                    <span>{DAYS_MAP[dayNum as DayOfWeek]}</span>
                    <span className="text-[10px] text-[#848A94]">({daySlots.length} classes)</span>
                  </div>

                  <div className="space-y-1.5">
                    {previewSlots.map((slot, index) => {
                      if (slot.dayOfWeek !== dayNum) return null;

                      return (
                        <div
                          key={index}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                            slot.selected
                              ? 'bg-white border-[#E8E7E2] shadow-2xs'
                              : 'bg-[#F9F9F8] border-dashed border-[#E8E7E2] opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={slot.selected}
                              onChange={() => handleToggleSelectSlot(index)}
                              className="w-4 h-4 rounded text-[#007FFF] cursor-pointer"
                            />

                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1E2022] text-white font-semibold shrink-0">
                              {slot.subjectCode}
                            </span>

                            <div className="min-w-0">
                              <p className="font-medium text-[#1E2022] truncate">
                                {slot.subjectName}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-[#848A94] mt-0.5 flex-wrap">
                                <span className="flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3 text-[#5A5E65]" />
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                {slot.room && (
                                  <span className="flex items-center gap-1">
                                    <Building className="w-3 h-3 text-[#5A5E65]" />
                                    {slot.room}
                                  </span>
                                )}
                                {slot.faculty && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-[#5A5E65]" />
                                    {slot.faculty}
                                  </span>
                                )}
                                <span className="capitalize px-1.5 py-0.2 rounded bg-[#FCFBF8] border border-[#E8E7E2] text-[10px]">
                                  {slot.type || 'lecture'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemovePreviewSlot(index)}
                            className="p-1 rounded text-[#848A94] hover:text-[#D9381E] shrink-0"
                            title="Remove Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#E8E7E2]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReviewing(false)}
            >
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
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Apply Timetable to Semester
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Camera Scanner Modal */}
      <DocumentCameraScannerModal
        isOpen={isCameraScanOpen}
        onClose={() => setIsCameraScanOpen(false)}
        onScanSuccess={handleCameraScanSuccess}
        initialCategory="timetable"
      />
    </Modal>
  );
};
