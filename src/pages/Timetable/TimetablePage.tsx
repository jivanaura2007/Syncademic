import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Calendar as CalendarIcon, 
  Clock, 
  Building, 
  User, 
  AlertCircle, 
  RefreshCw, 
  CalendarDays,
  Printer,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  Upload,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Download,
  Sun
} from 'lucide-react';
import { AppState, TimetableSlot, DayOfWeek, Subject, ReplacementDay, FacultyLeave, UniversityHoliday } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { TimetableImportModal } from '../../components/timetable/TimetableImportModal';
import { TimetableCalendarSyncModal } from '../../components/timetable/TimetableCalendarSyncModal';
import { CalendarImportModal } from '../../components/calendar/CalendarImportModal';
import { 
  addTimetableSlot, 
  updateTimetableSlot, 
  deleteTimetableSlot,
  addReplacementDay,
  deleteReplacementDay,
  addFacultyLeave,
  deleteFacultyLeave,
  markClassAttendance
} from '../../services/storage';
import { useToast } from '../../components/common/Toast';

interface TimetablePageProps {
  state: AppState;
}

const DAYS_MAP: Record<DayOfWeek, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

export const TimetablePage: React.FC<TimetablePageProps> = ({ state }) => {
  const { showToast } = useToast();
  const [activeDay, setActiveDay] = useState<DayOfWeek>(1);
  const [viewMode, setViewMode] = useState<'grid' | 'day'>('grid');

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Google Calendar Sync & University Calendar Import State
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [calendarSyncTab, setCalendarSyncTab] = useState<'export' | 'import'>('export');
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // Selected date for marking attendance on timetable slots (defaults to today)
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Slot modal state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotDay, setSlotDay] = useState<DayOfWeek>(1);
  const [slotSubjectId, setSlotSubjectId] = useState(state.subjects[0]?.id || '');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:00');
  const [slotRoom, setSlotRoom] = useState('LH-204');
  const [slotFaculty, setSlotFaculty] = useState('');
  const [slotType, setSlotType] = useState<TimetableSlot['type']>('lecture');

  // Delete slot confirmation
  const [deletingSlot, setDeletingSlot] = useState<TimetableSlot | null>(null);

  // Replacement Day modal
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [repDate, setRepDate] = useState(new Date().toISOString().split('T')[0]);
  const [repOperatesAs, setRepOperatesAs] = useState<DayOfWeek>(1);
  const [repReason, setRepReason] = useState('Replacement for holiday');

  // Faculty Leave modal
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveFaculty, setLeaveFaculty] = useState(state.subjects[0]?.faculty || '');
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveSubjectId, setLeaveSubjectId] = useState(state.subjects[0]?.id || '');
  const [leaveReason, setLeaveReason] = useState('Department conference');

  const openAddSlot = (day?: DayOfWeek) => {
    setEditingSlot(null);
    setSlotDay(day || activeDay);
    setSlotSubjectId(state.subjects[0]?.id || '');
    setSlotStart('09:00');
    setSlotEnd('10:00');
    setSlotRoom(state.subjects[0]?.room || 'LH-101');
    setSlotFaculty(state.subjects[0]?.faculty || '');
    setSlotType('lecture');
    setIsSlotModalOpen(true);
  };

  const openEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setSlotDay(slot.dayOfWeek);
    setSlotSubjectId(slot.subjectId);
    setSlotStart(slot.startTime);
    setSlotEnd(slot.endTime);
    setSlotRoom(slot.room);
    setSlotFaculty(slot.faculty);
    setSlotType(slot.type);
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotSubjectId) {
      showToast('Please select a subject', 'warning');
      return;
    }

    if (editingSlot) {
      updateTimetableSlot(editingSlot.id, {
        dayOfWeek: slotDay,
        subjectId: slotSubjectId,
        startTime: slotStart,
        endTime: slotEnd,
        room: slotRoom,
        faculty: slotFaculty,
        type: slotType
      });
      showToast('Updated timetable slot', 'success');
    } else {
      addTimetableSlot({
        dayOfWeek: slotDay,
        subjectId: slotSubjectId,
        startTime: slotStart,
        endTime: slotEnd,
        room: slotRoom,
        faculty: slotFaculty,
        type: slotType
      });
      showToast('Added slot to timetable', 'success');
    }
    setIsSlotModalOpen(false);
  };

  const handleDeleteSlot = () => {
    if (!deletingSlot) return;
    deleteTimetableSlot(deletingSlot.id);
    showToast('Slot removed from timetable', 'info');
    setDeletingSlot(null);
  };

  const handleAddReplacement = (e: React.FormEvent) => {
    e.preventDefault();
    addReplacementDay({
      date: repDate,
      operatesAsDayOfWeek: repOperatesAs,
      reason: repReason
    });
    showToast(`Replacement day declared for ${repDate}`, 'success');
    setIsReplacementModalOpen(false);
  };

  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    addFacultyLeave({
      facultyName: leaveFaculty,
      subjectId: leaveSubjectId,
      date: leaveDate,
      reason: leaveReason
    });
    showToast(`Faculty leave recorded for ${leaveFaculty}`, 'success');
    setIsLeaveModalOpen(false);
  };

  // Quick Anytime Attendance Marking directly from Timetable Slot
  const handleMarkSlotAttendance = (slot: TimetableSlot, status: 'present' | 'absent') => {
    const subject = state.subjects.find(s => s.id === slot.subjectId);
    const timeSlotStr = `${slot.startTime} - ${slot.endTime}`;
    
    markClassAttendance(
      slot.subjectId,
      attendanceDate,
      timeSlotStr,
      status,
      `Marked from timetable (${slot.room})`
    );

    showToast(
      `Marked ${status.toUpperCase()} for ${subject?.code || 'class'} on ${attendanceDate} (${timeSlotStr})`,
      status === 'present' ? 'success' : 'info'
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E7E2]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2022]">
              Academic Timetable
            </h1>
            <Badge variant="neutral">Semester {state.profile.semester}</Badge>
            <Badge variant="blue">{state.timetableSlots.length} Classes</Badge>
          </div>
          <p className="text-xs text-[#5A5E65] mt-1">
            Weekly class schedule, lecture halls, faculty leaves, and anytime class attendance marking.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Export to Google Calendar Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCalendarSyncTab('export');
              setIsCalendarSyncOpen(true);
            }}
            leftIcon={<Download className="w-3.5 h-3.5 text-[#007FFF]" />}
          >
            Export to Google Calendar
          </Button>

          {/* Import University Calendar Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCalendarSyncTab('import');
              setIsCalendarSyncOpen(true);
            }}
            leftIcon={<CalendarDays className="w-3.5 h-3.5 text-[#16A34A]" />}
          >
            Import University Calendar (.ICS)
          </Button>

          {/* Import Academic Circular & Holidays */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHolidayModalOpen(true)}
            leftIcon={<Sun className="w-3.5 h-3.5 text-[#F59E0B]" />}
          >
            Import Academic Circular & Holidays
          </Button>

          {/* AI / Document Timetable Import Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Import Timetable (AI / PDF / Excel)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReplacementModalOpen(true)}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-[#007FFF]" />}
          >
            Declare Replacement Day
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLeaveModalOpen(true)}
            leftIcon={<AlertCircle className="w-3.5 h-3.5 text-[#B7791F]" />}
          >
            Mark Faculty Leave
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openAddSlot()}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Slot
          </Button>
        </div>
      </div>

      {/* Anytime Attendance Quick Bar */}
      <div className="p-3.5 rounded-xl bg-white border border-[#E8E7E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#EBF7EE] text-[#16A34A] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-[#1E2022]">Anytime Attendance Marking: </span>
            <span className="text-[#5A5E65]">
              Tap <strong className="text-[#16A34A]">Present</strong> or <strong className="text-[#D9381E]">Absent</strong> directly on any class card to log attendance without time restrictions.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <label className="text-[11px] font-semibold text-[#848A94] uppercase tracking-wide">
            Attendance Date:
          </label>
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-xs font-mono font-medium text-[#1E2022] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Special Replacement Days & Leaves Notices Banner */}
      {(state.replacementDays.length > 0 || state.facultyLeaves.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Replacement Days */}
          {state.replacementDays.length > 0 && (
            <div className="p-4 rounded-xl bg-[#EBF5FF] border border-[#CCE5FF] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0066CC] flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Declared Replacement Working Days
                </span>
              </div>
              <div className="space-y-1.5">
                {state.replacementDays.map((rd) => (
                  <div key={rd.id} className="text-xs text-[#1E2022] flex items-center justify-between bg-white/70 p-2 rounded-lg border border-[#CCE5FF]">
                    <div>
                      <strong>{rd.date}</strong> operates as <strong>{DAYS_MAP[rd.operatesAsDayOfWeek]} Timetable</strong>
                      <span className="block text-[10px] text-[#5A5E65]">{rd.reason}</span>
                    </div>
                    <button
                      onClick={() => deleteReplacementDay(rd.id)}
                      className="text-[#848A94] hover:text-[#D9381E] p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Faculty Leaves */}
          {state.facultyLeaves.length > 0 && (
            <div className="p-4 rounded-xl bg-[#FEF9E7] border border-[#FCEEC0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#975A16] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Upcoming Faculty Leaves (No Penalty)
                </span>
              </div>
              <div className="space-y-1.5">
                {state.facultyLeaves.map((fl) => (
                  <div key={fl.id} className="text-xs text-[#1E2022] flex items-center justify-between bg-white/70 p-2 rounded-lg border border-[#FCEEC0]">
                    <div>
                      <strong>{fl.facultyName}</strong> on leave on {fl.date}
                      <span className="block text-[10px] text-[#5A5E65]">{fl.reason}</span>
                    </div>
                    <button
                      onClick={() => deleteFacultyLeave(fl.id)}
                      className="text-[#848A94] hover:text-[#D9381E] p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Mode Toggle & Day Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Day of Week Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {([1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((d) => {
            const count = state.timetableSlots.filter(s => s.dayOfWeek === d).length;
            const isActive = activeDay === d;

            return (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1E2022] text-white border-[#1E2022] shadow-xs'
                    : 'bg-white text-[#5A5E65] border-[#E8E7E2] hover:bg-[#F4F3EE]'
                }`}
              >
                {DAYS_MAP[d]} <span className="font-mono opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="flex items-center p-1 bg-[#F4F3EE] rounded-lg border border-[#E8E7E2] text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded font-medium cursor-pointer ${viewMode === 'grid' ? 'bg-white text-[#1E2022] shadow-xs' : 'text-[#5A5E65]'}`}
            >
              Full Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-2.5 py-1 rounded font-medium cursor-pointer ${viewMode === 'day' ? 'bg-white text-[#1E2022] shadow-xs' : 'text-[#5A5E65]'}`}
            >
              Day Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Empty State Banner if no slots */}
      {state.timetableSlots.length === 0 && (
        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#E8E7E2] space-y-3 shadow-xs">
          <CalendarDays className="w-10 h-10 text-[#848A94] mx-auto opacity-60" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#1E2022]">Your Timetable is Empty</h3>
            <p className="text-xs text-[#5A5E65] max-w-md mx-auto">
              Get started by importing your university calendar file (.ics / CSV), using the AI document extractor, or adding class slots manually.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCalendarSyncTab('import');
                setIsCalendarSyncOpen(true);
              }}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              Import University Calendar (.ICS)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              AI Document Extractor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAddSlot(activeDay)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Class Manually
            </Button>
          </div>
        </div>
      )}

      {/* Full Week Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {([1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => {
            const slots = state.timetableSlots
              .filter(s => s.dayOfWeek === day)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={day}
                className="bg-white rounded-xl border border-[#E8E7E2] overflow-hidden flex flex-col shadow-xs"
              >
                {/* Header */}
                <div className="px-4 py-3 bg-[#FCFCF8] border-b border-[#E8E7E2] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#1E2022]">
                      {DAYS_MAP[day]}
                    </span>
                    <span className="text-[10px] text-[#848A94]">
                      {slots.length} {slots.length === 1 ? 'class' : 'classes'}
                    </span>
                  </div>
                  <button
                    onClick={() => openAddSlot(day)}
                    className="text-[#848A94] hover:text-[#1E2022] p-1 rounded hover:bg-[#F4F3EE] cursor-pointer"
                    title="Add class to this day"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Slots List */}
                <div className="p-3 space-y-2 flex-1">
                  {slots.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#848A94] italic space-y-2">
                      <p>No classes scheduled</p>
                      <button
                        onClick={() => openAddSlot(day)}
                        className="text-[11px] font-medium text-[#007FFF] hover:underline"
                      >
                        + Add slot for {DAYS_MAP[day]}
                      </button>
                    </div>
                  ) : (
                    slots.map((slot) => {
                      const subject = state.subjects.find(s => s.id === slot.subjectId);
                      const isTodaySlot = new Date().getDay() === (slot.dayOfWeek % 7);

                      return (
                        <div
                          key={slot.id}
                          className="p-2.5 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] hover:border-[#D5D3CB] transition-colors space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-semibold text-[#1E2022] bg-[#F4F3EE] px-1.5 py-0.5 rounded border border-[#E8E7E2]">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <Badge
                              variant={slot.type === 'lab' ? 'yellow' : slot.type === 'tutorial' ? 'blue' : 'neutral'}
                              size="sm"
                            >
                              {slot.type.toUpperCase()}
                            </Badge>
                          </div>

                          <div>
                            <span className="font-semibold text-xs text-[#1E2022] block truncate">
                              {subject ? subject.name : 'Unknown Subject'}
                            </span>
                            <span className="text-[10px] text-[#5A5E65] font-mono">
                              {subject?.code} • {slot.room}
                            </span>
                          </div>

                          {/* Quick Attendance 1-Tap Action */}
                          <div className="pt-1.5 border-t border-[#E8E7E2]/60 flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleMarkSlotAttendance(slot, 'present')}
                                className="px-2 py-1 rounded bg-[#EBF7EE] text-[#16A34A] hover:bg-[#DCF2E2] font-semibold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title={`Mark Present for ${attendanceDate}`}
                              >
                                <Check className="w-3 h-3" />
                                <span>Present</span>
                              </button>
                              <button
                                onClick={() => handleMarkSlotAttendance(slot, 'absent')}
                                className="px-2 py-1 rounded bg-[#FDF2F2] text-[#D9381E] hover:bg-[#FBE4E4] font-semibold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title={`Mark Absent for ${attendanceDate}`}
                              >
                                <X className="w-3 h-3" />
                                <span>Absent</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1 text-[#848A94]">
                              <button
                                onClick={() => openEditSlot(slot)}
                                className="p-1 hover:text-[#1E2022] cursor-pointer"
                                title="Edit Class"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setDeletingSlot(slot)}
                                className="p-1 hover:text-[#D9381E] cursor-pointer"
                                title="Delete Class"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Day Schedule Focus View */
        <div className="bg-white p-6 rounded-xl border border-[#E8E7E2] space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E7E2] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#1E2022]">
                Detailed Schedule for {DAYS_MAP[activeDay]}
              </h3>
              <p className="text-xs text-[#5A5E65]">
                {state.timetableSlots.filter(s => s.dayOfWeek === activeDay).length} classes configured
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => openAddSlot(activeDay)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add Class
            </Button>
          </div>

          <div className="space-y-3">
            {state.timetableSlots
              .filter(s => s.dayOfWeek === activeDay)
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((slot) => {
                const subject = state.subjects.find(s => s.id === slot.subjectId);

                return (
                  <div
                    key={slot.id}
                    className="p-4 rounded-xl border border-[#E8E7E2] bg-[#FCFBF8] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="px-3 py-2 rounded-lg bg-[#F4F3EE] border border-[#E8E7E2] text-center shrink-0">
                        <span className="text-xs font-mono font-bold text-[#1E2022] block">{slot.startTime}</span>
                        <span className="text-[10px] text-[#848A94] font-mono">{slot.endTime}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#1E2022]">{subject?.name}</span>
                          <span className="text-xs font-mono text-[#5A5E65] px-1.5 py-0.5 rounded bg-white border border-[#E8E7E2]">{subject?.code}</span>
                          <Badge variant={slot.type === 'lab' ? 'yellow' : 'neutral'} size="sm">{slot.type}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#5A5E65] mt-1.5">
                          <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-[#848A94]" /> Room {slot.room}</span>
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-[#848A94]" /> {slot.faculty}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                      <button
                        onClick={() => handleMarkSlotAttendance(slot, 'present')}
                        className="px-3 py-1.5 rounded-lg bg-[#EBF7EE] text-[#16A34A] hover:bg-[#DCF2E2] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Present</span>
                      </button>
                      <button
                        onClick={() => handleMarkSlotAttendance(slot, 'absent')}
                        className="px-3 py-1.5 rounded-lg bg-[#FDF2F2] text-[#D9381E] hover:bg-[#FBE4E4] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Mark Absent</span>
                      </button>

                      <Button variant="outline" size="sm" onClick={() => openEditSlot(slot)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeletingSlot(slot)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Timetable Import Modal (AI Multimodal / PDF / Image / Excel / CSV / Manual) */}
      <TimetableImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        state={state}
        onSuccess={() => {
          showToast('Timetable loaded successfully!', 'success');
        }}
      />

      {/* Add / Edit Slot Modal */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title={editingSlot ? 'Edit Timetable Slot' : 'Add Class Slot'}
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Day of Week</label>
              <select
                value={slotDay}
                onChange={(e) => setSlotDay(Number(e.target.value) as DayOfWeek)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              >
                {([1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((d) => (
                  <option key={d} value={d}>
                    {DAYS_MAP[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Session Type</label>
              <select
                value={slotType}
                onChange={(e) => setSlotType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              >
                <option value="lecture">Lecture</option>
                <option value="lab">Laboratory (Practical)</option>
                <option value="tutorial">Tutorial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Subject</label>
            <select
              value={slotSubjectId}
              onChange={(e) => {
                setSlotSubjectId(e.target.value);
                const sub = state.subjects.find(s => s.id === e.target.value);
                if (sub) {
                  setSlotFaculty(sub.faculty);
                  setSlotRoom(sub.room);
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            >
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Start Time</label>
              <input
                type="text"
                required
                value={slotStart}
                onChange={(e) => setSlotStart(e.target.value)}
                placeholder="09:00"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">End Time</label>
              <input
                type="text"
                required
                value={slotEnd}
                onChange={(e) => setSlotEnd(e.target.value)}
                placeholder="10:00"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Lecture Hall / Lab Room</label>
              <input
                type="text"
                value={slotRoom}
                onChange={(e) => setSlotRoom(e.target.value)}
                placeholder="LH-204"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Faculty / Instructor</label>
              <input
                type="text"
                value={slotFaculty}
                onChange={(e) => setSlotFaculty(e.target.value)}
                placeholder="Prof. Name"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8E7E2]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsSlotModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingSlot ? 'Save Changes' : 'Add Slot'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Replacement Day Modal */}
      <Modal
        isOpen={isReplacementModalOpen}
        onClose={() => setIsReplacementModalOpen(false)}
        title="Declare Replacement Timetable Day"
        subtitle="When an unexpected holiday make-up day is assigned by the college"
      >
        <form onSubmit={handleAddReplacement} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Working Date</label>
              <input
                type="date"
                required
                value={repDate}
                onChange={(e) => setRepDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Operates as Timetable</label>
              <select
                value={repOperatesAs}
                onChange={(e) => setRepOperatesAs(Number(e.target.value) as DayOfWeek)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              >
                {([1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((d) => (
                  <option key={d} value={d}>
                    {DAYS_MAP[d]} Schedule
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">University Circular / Reason</label>
            <input
              type="text"
              required
              value={repReason}
              onChange={(e) => setRepReason(e.target.value)}
              placeholder="e.g. Saturday working as Monday make-up for Independence Day"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8E7E2]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsReplacementModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Declare Replacement Day
            </Button>
          </div>
        </form>
      </Modal>

      {/* Faculty Leave Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Record Faculty Official Leave"
        subtitle="Lectures cancelled due to faculty leave will not count against your attendance total"
      >
        <form onSubmit={handleAddLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Faculty Name</label>
            <input
              type="text"
              required
              value={leaveFaculty}
              onChange={(e) => setLeaveFaculty(e.target.value)}
              placeholder="Prof. Name"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Date of Leave</label>
              <input
                type="date"
                required
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Associated Subject</label>
              <select
                value={leaveSubjectId}
                onChange={(e) => setLeaveSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              >
                {state.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Reason / Notice</label>
            <input
              type="text"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="e.g. Department Senate Meeting, Out of station"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8E7E2]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Faculty Leave
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Slot Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingSlot)}
        onClose={() => setDeletingSlot(null)}
        onConfirm={handleDeleteSlot}
        title="Remove Timetable Slot"
        message="Are you sure you want to remove this lecture slot from your weekly schedule?"
      />

      {/* Google Calendar Export & University Calendar Import Modal */}
      <TimetableCalendarSyncModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
        state={state}
        initialTab={calendarSyncTab}
        onOpenCircularHolidayImport={() => setIsHolidayModalOpen(true)}
      />

      {/* Academic Circular & Holiday List AI Extractor Modal */}
      <CalendarImportModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        state={state}
        onSuccess={() => showToast('Academic circular & university holidays updated!', 'success')}
      />
    </div>
  );
};
