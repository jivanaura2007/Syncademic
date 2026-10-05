import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  Calendar as CalendarIcon, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building, 
  User, 
  Sparkles, 
  FileText, 
  Layers, 
  ChevronRight, 
  Info,
  Check,
  X,
  FileSpreadsheet,
  HelpCircle,
  ArrowRight,
  Sun
} from 'lucide-react';
import { AppState, TimetableSlot, Subject, DayOfWeek } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';
import { 
  generateGoogleCalendarIcs, 
  generateGoogleCalendarCsv, 
  generateClassGoogleCalendarUrl,
  parseUniversityCalendarFile,
  ParsedCalendarSlot
} from '../../utils/calendarSync';
import { setBulkTimetableSlots } from '../../services/storage';

interface TimetableCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  initialTab?: 'export' | 'import';
  onSuccess?: () => void;
  onOpenCircularHolidayImport?: () => void;
}

const DAYS_MAP: Record<DayOfWeek, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

const SAMPLE_UNIVERSITY_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//University Portal//Timetable Export//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
SUMMARY:[CS301] Data Structures & Algorithms
LOCATION:LH-204
DESCRIPTION:Instructor: Dr. Sharma\\nCredits: 4\\nType: Lecture
DTSTART:20260817T090000
DTEND:20260817T100000
RRULE:FREQ=WEEKLY;BYDAY=MO,WE
END:VEVENT
BEGIN:VEVENT
SUMMARY:[CS302] Operating Systems
LOCATION:LH-205
DESCRIPTION:Instructor: Prof. Verma\\nCredits: 4\\nType: Lecture
DTSTART:20260818T101500
DTEND:20260818T111500
RRULE:FREQ=WEEKLY;BYDAY=TU,TH
END:VEVENT
BEGIN:VEVENT
SUMMARY:[CS303] Computer Networks Laboratory
LOCATION:Network-Lab-2
DESCRIPTION:Instructor: Dr. Iyer\\nCredits: 2\\nType: Lab
DTSTART:20260821T140000
DTEND:20260821T160000
RRULE:FREQ=WEEKLY;BYDAY=FR
END:VEVENT
END:VCALENDAR`;

export const TimetableCalendarSyncModal: React.FC<TimetableCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  state,
  initialTab = 'export',
  onSuccess,
  onOpenCircularHolidayImport
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);

  // Import State
  const [importInputMode, setImportInputMode] = useState<'file' | 'paste'>('file');
  const [pastedContent, setPastedContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedSlots, setParsedSlots] = useState<ParsedCalendarSlot[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [autoCreateSubjects, setAutoCreateSubjects] = useState(true);

  // How-to accordion state
  const [showHowToGuide, setShowHowToGuide] = useState(false);

  // 1. Export Handlers
  const handleDownloadIcs = () => {
    if (state.timetableSlots.length === 0) {
      showToast('No timetable slots found to export', 'warning');
      return;
    }
    const icsContent = generateGoogleCalendarIcs(state);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `syncademic-timetable-semester-${state.profile.semester || 1}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Google Calendar (.ICS) file downloaded successfully!', 'success');
  };

  const handleDownloadCsv = () => {
    if (state.timetableSlots.length === 0) {
      showToast('No timetable slots found to export', 'warning');
      return;
    }
    const csvContent = generateGoogleCalendarCsv(state);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `google-calendar-schedule-semester-${state.profile.semester || 1}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Google Calendar CSV file downloaded successfully!', 'success');
  };

  // 2. Import Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCalendarText(text, file.name);
    };
    reader.onerror = () => {
      showToast('Failed to read calendar file', 'error');
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const processCalendarText = (text: string, fileName: string) => {
    setIsParsing(true);
    try {
      const res = parseUniversityCalendarFile(text, fileName);
      if (res.slots.length === 0) {
        showToast('No class schedules found in the uploaded file', 'warning');
        setParsedSlots([]);
      } else {
        setParsedSlots(res.slots);
        showToast(`Parsed ${res.slots.length} schedule periods from calendar!`, 'success');
      }
    } catch (err: any) {
      showToast(`Parse error: ${err.message || 'Invalid format'}`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleLoadSampleIcs = () => {
    setSelectedFileName('university-sample-schedule.ics');
    processCalendarText(SAMPLE_UNIVERSITY_ICS, 'university-sample-schedule.ics');
  };

  const handleToggleSelectSlot = (id: string) => {
    setParsedSlots(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
  };

  const handleSelectAllSlots = (selectAll: boolean) => {
    setParsedSlots(prev => prev.map(s => ({ ...s, selected: selectAll })));
  };

  const handleExecuteImport = () => {
    const selected = parsedSlots.filter(s => s.selected);
    if (selected.length === 0) {
      showToast('Please select at least one class to import', 'warning');
      return;
    }

    // Map detected courses to existing subjects or generate new subject entries
    const existingSubjects = [...state.subjects];
    const newSubjectsToCreate: Subject[] = [];
    const subjectsMap = new Map<string, string>(); // code.toLowerCase() -> subjectId

    existingSubjects.forEach(s => {
      subjectsMap.set(s.code.toLowerCase(), s.id);
    });

    const slotsToCommit: TimetableSlot[] = [];

    const defaultColors = ['#007FFF', '#16A34A', '#E82A89', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

    selected.forEach((ps, idx) => {
      const lowerCode = ps.subjectCode.toLowerCase();
      let subjectId = subjectsMap.get(lowerCode);

      if (!subjectId && autoCreateSubjects) {
        // Create new subject
        const newSubId = 'sub-' + Date.now() + '-' + idx;
        const newSub: Subject = {
          id: newSubId,
          code: ps.subjectCode,
          name: ps.subjectName || ps.subjectCode,
          faculty: ps.faculty || 'Faculty',
          room: ps.room || 'LH-101',
          credits: 4,
          color: defaultColors[(existingSubjects.length + newSubjectsToCreate.length) % defaultColors.length],
          targetAttendance: state.profile.defaultAttendanceThreshold || 75,
          attendedClasses: 0,
          totalClasses: 0,
          notesCount: 0
        };
        newSubjectsToCreate.push(newSub);
        subjectsMap.set(lowerCode, newSubId);
        subjectId = newSubId;
      }

      if (subjectId) {
        slotsToCommit.push({
          id: 'slot-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 6),
          dayOfWeek: ps.dayOfWeek,
          startTime: ps.startTime,
          endTime: ps.endTime,
          subjectId,
          room: ps.room || 'LH-101',
          faculty: ps.faculty || 'Faculty',
          type: ps.type
        });
      }
    });

    setBulkTimetableSlots(slotsToCommit, newSubjectsToCreate, importMode);
    showToast(`Successfully imported ${slotsToCommit.length} classes into your timetable!`, 'success');

    if (onSuccess) onSuccess();
    onClose();
  };

  const selectedCount = parsedSlots.filter(s => s.selected).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Google Calendar & University Schedule Sync"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F4F3EE] rounded-xl border border-[#E8E7E2] text-xs">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'export'
                ? 'bg-white text-[#1E2022] shadow-xs'
                : 'text-[#5A5E65] hover:text-[#1E2022]'
            }`}
          >
            <Download className="w-4 h-4 text-[#007FFF]" />
            Export to Google Calendar (.ICS)
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'import'
                ? 'bg-white text-[#1E2022] shadow-xs'
                : 'text-[#5A5E65] hover:text-[#1E2022]'
            }`}
          >
            <Upload className="w-4 h-4 text-[#16A34A]" />
            Import University Calendar (.ICS / CSV)
          </button>
        </div>

        {/* ================= TAB 1: EXPORT TO GOOGLE CALENDAR ================= */}
        {activeTab === 'export' && (
          <div className="space-y-5">
            {/* Overview Banner */}
            <div className="p-4 rounded-xl bg-[#EBF5FF] border border-[#CCE5FF] flex items-start gap-3">
              <CalendarIcon className="w-5 h-5 text-[#007FFF] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-[#0066CC]">
                  Direct Google Calendar Compatibility (RFC 5545 Standard)
                </h4>
                <p className="text-[#5A5E65] leading-relaxed">
                  Export your full recurring lecture timetable to an <strong>iCalendar (.ics)</strong> file. 
                  Google Calendar, Apple Calendar, and Outlook natively import this file and auto-schedule all weekly classes with correct recurrence, lecture halls, and faculty information.
                </p>
              </div>
            </div>

            {/* Schedule Summary Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-[#FCFBF8] border border-[#E8E7E2]">
                <span className="text-[10px] text-[#848A94] uppercase font-semibold">Weekly Classes</span>
                <span className="text-base font-bold font-mono text-[#1E2022] block mt-0.5">
                  {state.timetableSlots.length} Slots
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#FCFBF8] border border-[#E8E7E2]">
                <span className="text-[10px] text-[#848A94] uppercase font-semibold">Enrolled Courses</span>
                <span className="text-base font-bold font-mono text-[#1E2022] block mt-0.5">
                  {state.subjects.length} Subjects
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#FCFBF8] border border-[#E8E7E2]">
                <span className="text-[10px] text-[#848A94] uppercase font-semibold">Recurrence Rule</span>
                <span className="text-xs font-bold text-[#16A34A] block mt-1">
                  Weekly Recurring
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-xl border border-[#E8E7E2] bg-white space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#1E2022] flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-[#007FFF]" />
                      Download .ICS File
                    </span>
                    <Badge variant="safe">Recommended</Badge>
                  </div>
                  <p className="text-[11px] text-[#5A5E65] mt-1.5">
                    Standard iCalendar file with recurring weekly events. Best for Google Calendar, Apple Calendar & Outlook.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadIcs}
                  className="w-full text-xs"
                >
                  Download .ICS File
                </Button>
              </div>

              <div className="p-4 rounded-xl border border-[#E8E7E2] bg-white space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#1E2022] flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
                      Download Google Calendar CSV
                    </span>
                    <Badge variant="neutral">CSV Format</Badge>
                  </div>
                  <p className="text-[11px] text-[#5A5E65] mt-1.5">
                    Tabular CSV formatted strictly according to Google Calendar's official import specification.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCsv}
                  className="w-full text-xs"
                >
                  Download Calendar CSV
                </Button>
              </div>
            </div>

            {/* Step-by-Step Google Calendar Guide Accordion */}
            <div className="border border-[#E8E7E2] rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setShowHowToGuide(!showHowToGuide)}
                className="w-full p-3.5 text-left flex items-center justify-between hover:bg-[#FCFBF8] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#007FFF]" />
                  <span className="text-xs font-semibold text-[#1E2022]">
                    How to import into Google Calendar (4 simple steps)
                  </span>
                </div>
                <span className="text-xs text-[#007FFF] font-semibold">
                  {showHowToGuide ? 'Hide instructions' : 'View instructions'}
                </span>
              </button>

              {showHowToGuide && (
                <div className="p-4 pt-1 border-t border-[#E8E7E2] bg-[#FCFBF8] text-xs text-[#5A5E65] space-y-2.5">
                  <ol className="list-decimal list-inside space-y-2 pl-1 leading-relaxed">
                    <li>
                      Click <strong>"Download .ICS File"</strong> above to save the calendar file to your device.
                    </li>
                    <li>
                      Open <strong>Google Calendar</strong> in your web browser:{' '}
                      <a
                        href="https://calendar.google.com/calendar/u/0/r/settings/export"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#007FFF] font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        Open Google Calendar Import Settings <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      In Google Calendar settings, navigate to <strong>Import &amp; export</strong> in the left sidebar.
                    </li>
                    <li>
                      Click <strong>"Select file from your computer"</strong>, choose your downloaded <code>.ics</code> file, and click <strong>Import</strong>.
                    </li>
                  </ol>
                  <p className="text-[11px] text-[#848A94] pt-1">
                    Tip: You can also create a dedicated "Academics" calendar in Google Calendar before importing to keep classes separate from your personal events.
                  </p>
                </div>
              )}
            </div>

            {/* 1-Click Direct Google Calendar Web Event Links */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1E2022]">
                  1-Click Direct Class Additions
                </span>
                <span className="text-[11px] text-[#848A94]">
                  Opens pre-filled Google Calendar event in new tab
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-[#E8E7E2] rounded-lg border border-[#E8E7E2] bg-white">
                {state.timetableSlots.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#5A5E65]">
                    No timetable slots configured yet.
                  </div>
                ) : (
                  state.timetableSlots.map(slot => {
                    const sub = state.subjects.find(s => s.id === slot.subjectId);
                    const url = sub 
                      ? generateClassGoogleCalendarUrl(slot, sub, state.semesterStartDate, state.semesterEndDate)
                      : '#';

                    return (
                      <div key={slot.id} className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-[#FCFBF8]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#1E2022]">{sub?.code || 'CRS'}</span>
                            <span className="text-[#5A5E65]">{DAYS_MAP[slot.dayOfWeek]} {slot.startTime} - {slot.endTime}</span>
                          </div>
                          <span className="text-[10px] text-[#848A94] block">
                            {slot.room} • {slot.faculty}
                          </span>
                        </div>

                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-[#EBF5FF] text-[#0066CC] hover:bg-[#CCE5FF] text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                        >
                          Add to Google Cal <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: IMPORT UNIVERSITY CALENDAR ================= */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            {/* Direct Switch to Academic Circular / Holiday List */}
            {onOpenCircularHolidayImport && (
              <div className="p-3 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-[#F59E0B] shrink-0" />
                  <span className="text-[#5A5E65]">
                    Need to extract <strong>University Holidays or Academic Circular notices</strong> (PDF/Image/Tables)?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCircularHolidayImport();
                  }}
                  className="font-semibold text-[#007FFF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open AI Circular & Holiday Extractor</span> &rarr;
                </button>
              </div>
            )}

            {/* Input Selection Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportInputMode('file')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    importInputMode === 'file' ? 'bg-[#1E2022] text-white' : 'text-[#5A5E65] hover:text-[#1E2022]'
                  }`}
                >
                  Upload File (.ics / .csv / .json)
                </button>
                <button
                  type="button"
                  onClick={() => setImportInputMode('paste')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    importInputMode === 'paste' ? 'bg-[#1E2022] text-white' : 'text-[#5A5E65] hover:text-[#1E2022]'
                  }`}
                >
                  Paste Raw Calendar Text
                </button>
              </div>

              <button
                type="button"
                onClick={handleLoadSampleIcs}
                className="text-[11px] font-semibold text-[#007FFF] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Sample University .ICS
              </button>
            </div>

            {/* File Dropzone */}
            {importInputMode === 'file' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-xl border-2 border-dashed border-[#D1D0C9] hover:border-[#007FFF] bg-[#FCFBF8] text-center cursor-pointer transition-colors space-y-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".ics,.ical,.csv,.json,text/calendar,text/csv,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-[#848A94] mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-[#1E2022]">
                    {selectedFileName || 'Click or drag university calendar file here'}
                  </p>
                  <p className="text-[11px] text-[#5A5E65] mt-0.5">
                    Supports Canvas, Blackboard, Moodle, Google Calendar (.ics), CSV schedules, and JSON
                  </p>
                </div>
              </div>
            )}

            {/* Paste Raw Text Box */}
            {importInputMode === 'paste' && (
              <div className="space-y-2">
                <textarea
                  rows={5}
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder="Paste your university calendar content here (e.g. BEGIN:VCALENDAR... or Subject,Start Date,Start Time...)"
                  className="w-full p-3 text-xs font-mono rounded-xl border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-none focus:border-[#007FFF]"
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!pastedContent.trim()}
                  onClick={() => processCalendarText(pastedContent, 'pasted-calendar.ics')}
                  className="text-xs"
                >
                  Parse Pasted Calendar Text
                </Button>
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedSlots.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-[#E8E7E2]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1E2022]">
                      Detected Schedule ({selectedCount} of {parsedSlots.length} classes selected)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSelectAllSlots(true)}
                      className="text-[11px] font-semibold text-[#007FFF] hover:underline"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllSlots(false)}
                      className="text-[11px] font-semibold text-[#5A5E65] hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Table of Parsed Classes */}
                <div className="max-h-60 overflow-y-auto divide-y divide-[#E8E7E2] rounded-xl border border-[#E8E7E2] bg-white">
                  {parsedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => handleToggleSelectSlot(slot.id)}
                      className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                        slot.selected ? 'bg-[#FCFBF8]' : 'opacity-60 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={slot.selected}
                          onChange={() => handleToggleSelectSlot(slot.id)}
                          className="w-4 h-4 rounded text-[#007FFF] focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#1E2022]">{slot.subjectCode}</span>
                            <span className="font-medium text-[#1E2022]">{slot.subjectName}</span>
                            <Badge variant={slot.type === 'lab' ? 'warning' : 'blue'} size="sm">
                              {slot.type.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#5A5E65] mt-0.5">
                            <span>{DAYS_MAP[slot.dayOfWeek]} {slot.startTime} - {slot.endTime}</span>
                            <span>•</span>
                            <span>{slot.room}</span>
                            <span>•</span>
                            <span>{slot.faculty}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Import Configuration Options */}
                <div className="p-3.5 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="font-semibold text-[#1E2022]">Import Method:</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-[#007FFF]"
                        />
                        <span>Replace existing timetable</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="text-[#007FFF]"
                        />
                        <span>Merge with existing</span>
                      </label>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-[#E8E7E2]">
                    <input
                      type="checkbox"
                      checked={autoCreateSubjects}
                      onChange={(e) => setAutoCreateSubjects(e.target.checked)}
                      className="w-4 h-4 rounded text-[#007FFF]"
                    />
                    <span className="text-[#5A5E65]">
                      Automatically create subjects in workspace for courses not currently enrolled
                    </span>
                  </label>
                </div>

                {/* Final Import Action */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={selectedCount === 0}
                    onClick={handleExecuteImport}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Commit {selectedCount} Classes to Timetable
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
