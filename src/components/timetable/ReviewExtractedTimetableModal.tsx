import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Trash2, 
  Plus, 
  Clock, 
  Building, 
  User, 
  BookOpen, 
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { TimetableSlot, Subject, DayOfWeek } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';
import { normalizeTimeTo24Hour, parseDayOfWeek } from '../../utils/fileHelper';

export interface EditableSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  room: string;
  faculty: string;
  type: 'lecture' | 'lab' | 'tutorial';
  enabled: boolean;
}

interface ReviewExtractedTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawSlots: any[];
  rawSubjects?: any[];
  onCommit: (slots: TimetableSlot[], subjects: Subject[], mode: 'replace' | 'merge') => void;
  existingSubjects?: Subject[];
  defaultAttendanceThreshold?: number;
}

const DAYS: Array<{ id: DayOfWeek; name: string; short: string }> = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' }
];

export const ReviewExtractedTimetableModal: React.FC<ReviewExtractedTimetableModalProps> = ({
  isOpen,
  onClose,
  rawSlots,
  rawSubjects = [],
  onCommit,
  existingSubjects = [],
  defaultAttendanceThreshold = 75
}) => {
  const { showToast } = useToast();
  const [activeDay, setActiveDay] = useState<DayOfWeek>(1);
  const [viewFilter, setViewFilter] = useState<'day' | 'all'>('day');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [slots, setSlots] = useState<EditableSlot[]>([]);

  // Initialize slots when modal opens or rawSlots change
  useEffect(() => {
    if (!rawSlots || rawSlots.length === 0) {
      setSlots([]);
      return;
    }

    const mapped: EditableSlot[] = rawSlots.map((s, idx) => {
      const dayNum = parseDayOfWeek(s.dayOfWeek);
      const startTime = normalizeTimeTo24Hour(s.startTime, false);
      const endTime = normalizeTimeTo24Hour(s.endTime, true);
      const code = (s.subjectCode || 'SUB').toUpperCase().trim();
      const name = (s.subjectName || s.subjectCode || 'Lecture Period').trim();

      return {
        id: s.id || `edit-slot-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        dayOfWeek: dayNum,
        startTime,
        endTime,
        subjectCode: code,
        subjectName: name,
        room: s.room || 'LH-101',
        faculty: s.faculty || 'Faculty Member',
        type: (['lecture', 'lab', 'tutorial'].includes(s.type) ? s.type : 'lecture') as 'lecture' | 'lab' | 'tutorial',
        enabled: true
      };
    }).sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

    setSlots(mapped);

    // Default to the first day that has extracted slots
    const firstDayWithSlots = DAYS.find(d => mapped.some(s => s.dayOfWeek === d.id));
    if (firstDayWithSlots) {
      setActiveDay(firstDayWithSlots.id);
    }
  }, [rawSlots, isOpen]);

  const handleUpdateSlot = (id: string, updates: Partial<EditableSlot>) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteSlot = (id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
  };

  const handleAddSlot = (day: DayOfWeek) => {
    const daySlots = slots.filter(s => s.dayOfWeek === day);
    let nextStart = '09:00';
    let nextEnd = '10:00';

    if (daySlots.length > 0) {
      const last = daySlots[daySlots.length - 1];
      nextStart = last.endTime;
      const [h, m] = last.endTime.split(':').map(Number);
      nextEnd = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const newSlot: EditableSlot = {
      id: `new-slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      dayOfWeek: day,
      startTime: nextStart,
      endTime: nextEnd,
      subjectCode: 'NEW101',
      subjectName: 'New Course Period',
      room: 'LH-101',
      faculty: 'Faculty Instructor',
      type: 'lecture',
      enabled: true
    };

    setSlots(prev => [...prev, newSlot].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    }));
  };

  const handleConfirmAndCommit = () => {
    const enabledSlots = slots.filter(s => s.enabled);
    if (enabledSlots.length === 0) {
      showToast('Please enable at least one class period to import', 'warning');
      return;
    }

    // Build subject map
    const subjectMap = new Map<string, string>();
    existingSubjects.forEach(s => {
      subjectMap.set(s.code.toUpperCase().trim(), s.id);
      subjectMap.set(s.name.toLowerCase().trim(), s.id);
    });

    const newCreatedSubjects: Subject[] = [];

    // Check rawSubjects from AI first
    if (Array.isArray(rawSubjects)) {
      rawSubjects.forEach(s => {
        const codeKey = (s.code || '').toUpperCase().trim();
        const nameKey = (s.name || '').toLowerCase().trim();
        if (codeKey && !subjectMap.has(codeKey)) {
          const subId = 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
          const newSub: Subject = {
            id: subId,
            code: codeKey,
            name: s.name || codeKey,
            faculty: s.faculty || 'Faculty Member',
            room: s.room || 'LH-101',
            credits: Number(s.credits) || 4,
            color: '#007FFF',
            targetAttendance: defaultAttendanceThreshold,
            totalClasses: 0,
            attendedClasses: 0
          };
          newCreatedSubjects.push(newSub);
          subjectMap.set(codeKey, subId);
          subjectMap.set(nameKey, subId);
        }
      });
    }

    // Ensure all edited slots have a matching subject
    enabledSlots.forEach(s => {
      const codeKey = s.subjectCode.toUpperCase().trim();
      const nameKey = s.subjectName.toLowerCase().trim();
      if (!subjectMap.has(codeKey) && !subjectMap.has(nameKey)) {
        const subId = 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const newSub: Subject = {
          id: subId,
          code: codeKey || 'SUB' + (newCreatedSubjects.length + 1),
          name: s.subjectName || codeKey,
          faculty: s.faculty || 'Faculty Member',
          room: s.room || 'LH-101',
          credits: s.type === 'lab' ? 2 : 4,
          color: '#007FFF',
          targetAttendance: defaultAttendanceThreshold,
          totalClasses: 0,
          attendedClasses: 0
        };
        newCreatedSubjects.push(newSub);
        subjectMap.set(codeKey, subId);
        subjectMap.set(nameKey, subId);
      }
    });

    // Format slots into application TimetableSlot data structure
    const formattedTimetableSlots: TimetableSlot[] = enabledSlots.map(s => {
      const codeKey = s.subjectCode.toUpperCase().trim();
      const nameKey = s.subjectName.toLowerCase().trim();
      const subjectId = subjectMap.get(codeKey) || subjectMap.get(nameKey) || existingSubjects[0]?.id || 'sub-default';

      return {
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: normalizeTimeTo24Hour(s.startTime, false),
        endTime: normalizeTimeTo24Hour(s.endTime, true),
        subjectId,
        room: s.room,
        faculty: s.faculty,
        type: s.type
      };
    });

    onCommit(formattedTimetableSlots, newCreatedSubjects, importMode);
    showToast(`Successfully verified & committed ${formattedTimetableSlots.length} classes to your Timetable! 🎉`, 'success');
    onClose();
  };

  const activeSlots = viewFilter === 'all'
    ? slots
    : slots.filter(s => s.dayOfWeek === activeDay);

  const totalEnabled = slots.filter(s => s.enabled).length;
  const daysCoveredCount = new Set(slots.filter(s => s.enabled).map(s => s.dayOfWeek)).size;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review & Verify Extracted Timetable"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Header summary & instructions banner */}
        <div className="p-3.5 rounded-xl bg-[#F0F7FF] border border-[#BAE6FD] flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#007FFF] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-[#007FFF]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1E2022]">
                Verify AI-Extracted Classes (Monday – Friday)
              </h4>
              <p className="text-[11px] text-[#5A5E65] mt-0.5 leading-relaxed">
                Check and fine-tune parsed course names, codes, class times, room numbers, and faculty details before applying to your schedule.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="blue">{totalEnabled} Active Classes</Badge>
            <Badge variant="green">{daysCoveredCount} Weekdays</Badge>
          </div>
        </div>

        {/* View mode toggle & Day Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-[#E8E7E2]">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
            {DAYS.map(d => {
              const count = slots.filter(s => s.dayOfWeek === d.id && s.enabled).length;
              const isActive = viewFilter === 'day' && activeDay === d.id;

              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setViewFilter('day');
                    setActiveDay(d.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-[#007FFF] text-white shadow-xs'
                      : 'bg-white border border-[#E8E7E2] text-[#5A5E65] hover:border-[#007FFF] hover:text-[#007FFF]'
                  }`}
                >
                  <span>{d.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-[#F4F3EE] text-[#1E2022]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewFilter(prev => prev === 'all' ? 'day' : 'all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                viewFilter === 'all'
                  ? 'bg-[#1E2022] text-white border-[#1E2022]'
                  : 'bg-white text-[#5A5E65] border-[#E8E7E2] hover:bg-[#F4F3EE]'
              }`}
            >
              {viewFilter === 'all' ? 'Show Day View' : 'Show All Days'}
            </button>

            <Button
              variant="outline"
              size="xs"
              onClick={() => handleAddSlot(activeDay)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Class
            </Button>
          </div>
        </div>

        {/* List of Editable Slots */}
        <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
          {activeSlots.length === 0 ? (
            <div className="p-8 text-center bg-[#FCFBF8] rounded-xl border border-dashed border-[#E8E7E2] space-y-2">
              <Clock className="w-8 h-8 text-[#848A94] mx-auto opacity-50" />
              <p className="text-xs text-[#5A5E65] font-medium">
                No classes extracted for {DAYS.find(d => d.id === activeDay)?.name || 'this day'}.
              </p>
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleAddSlot(activeDay)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Class for {DAYS.find(d => d.id === activeDay)?.name}
              </Button>
            </div>
          ) : (
            activeSlots.map((slot) => (
              <div
                key={slot.id}
                className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                  slot.enabled
                    ? 'bg-white border-[#E8E7E2] shadow-2xs hover:border-[#007FFF]/50'
                    : 'bg-[#F9F8F5] border-[#E8E7E2]/60 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={(e) => handleUpdateSlot(slot.id, { enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-[#007FFF] cursor-pointer"
                      title="Include in timetable"
                    />

                    {viewFilter === 'all' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4F3EE] text-[#1E2022]">
                        {DAYS.find(d => d.id === slot.dayOfWeek)?.short}
                      </span>
                    )}

                    {/* Start & End Times Inputs */}
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <input
                        type="text"
                        value={slot.startTime}
                        onChange={(e) => handleUpdateSlot(slot.id, { startTime: e.target.value })}
                        onBlur={(e) => handleUpdateSlot(slot.id, { startTime: normalizeTimeTo24Hour(e.target.value, false) })}
                        placeholder="08:10"
                        className="w-16 px-2 py-1 rounded bg-[#FCFBF8] border border-[#E8E7E2] text-xs font-mono font-bold text-[#1E2022] text-center focus:bg-white focus:outline-hidden"
                        title="Start Time (24h)"
                      />
                      <span className="text-[#848A94]">-</span>
                      <input
                        type="text"
                        value={slot.endTime}
                        onChange={(e) => handleUpdateSlot(slot.id, { endTime: e.target.value })}
                        onBlur={(e) => handleUpdateSlot(slot.id, { endTime: normalizeTimeTo24Hour(e.target.value, true) })}
                        placeholder="09:00"
                        className="w-16 px-2 py-1 rounded bg-[#FCFBF8] border border-[#E8E7E2] text-xs font-mono font-bold text-[#1E2022] text-center focus:bg-white focus:outline-hidden"
                        title="End Time (24h)"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={slot.type}
                      onChange={(e) => handleUpdateSlot(slot.id, { type: e.target.value as any })}
                      className="px-2 py-1 rounded bg-[#FCFBF8] border border-[#E8E7E2] text-[11px] font-semibold text-[#1E2022] cursor-pointer focus:outline-hidden"
                    >
                      <option value="lecture">LECTURE</option>
                      <option value="lab">LAB</option>
                      <option value="tutorial">TUTORIAL</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1 text-[#848A94] hover:text-[#DC2626] rounded transition-colors cursor-pointer"
                      title="Delete class period"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subject Name, Code, Room, Faculty Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">
                      Subject Title:
                    </label>
                    <input
                      type="text"
                      value={slot.subjectName}
                      onChange={(e) => handleUpdateSlot(slot.id, { subjectName: e.target.value })}
                      placeholder="e.g. Data Structures & Algorithms"
                      className="w-full px-2.5 py-1 text-xs rounded border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden font-medium text-[#1E2022]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">
                      Course Code:
                    </label>
                    <input
                      type="text"
                      value={slot.subjectCode}
                      onChange={(e) => handleUpdateSlot(slot.id, { subjectCode: e.target.value.toUpperCase() })}
                      placeholder="CS301"
                      className="w-full px-2.5 py-1 text-xs font-mono font-bold rounded border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden text-[#1E2022]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#848A94] mb-0.5">
                      Room / Hall:
                    </label>
                    <input
                      type="text"
                      value={slot.room}
                      onChange={(e) => handleUpdateSlot(slot.id, { room: e.target.value })}
                      placeholder="LH-101"
                      className="w-full px-2.5 py-1 text-xs rounded border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden text-[#1E2022]"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Mode Selector and Commit Actions */}
        <div className="pt-3 border-t border-[#E8E7E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-[#5A5E65]">
            <span className="font-semibold text-[#1E2022]">Import Mode:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-[#007FFF]"
              />
              <span>Replace Timetable</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
                className="text-[#007FFF]"
              />
              <span>Merge with Existing</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmAndCommit}
              disabled={totalEnabled === 0}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              className="bg-[#007FFF] hover:bg-[#0066CC] font-semibold shadow-xs"
            >
              Confirm & Commit to Timetable ({totalEnabled} Classes)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
