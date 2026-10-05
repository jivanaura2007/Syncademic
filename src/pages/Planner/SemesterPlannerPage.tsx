import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle, 
  Flag, 
  CheckSquare, 
  Square,
  Sparkles,
  BookOpen,
  Milestone,
  Upload,
  CalendarDays,
  FileSpreadsheet,
  Sun,
  ShieldCheck
} from 'lucide-react';
import { AppState, AcademicEvent, AcademicEventType, EventPriority } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CalendarImportModal } from '../../components/calendar/CalendarImportModal';
import { addEvent, updateEvent, deleteEvent, deleteHoliday } from '../../services/storage';
import { useToast } from '../../components/common/Toast';

interface SemesterPlannerPageProps {
  state: AppState;
}

export const SemesterPlannerPage: React.FC<SemesterPlannerPageProps> = ({ state }) => {
  const { showToast } = useToast();
  const [filterType, setFilterType] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  // Import Modal State (PDF / Image / Excel / CSV / Manual)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Add / Edit Event Modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('10:00 AM');
  const [formType, setFormType] = useState<AcademicEventType>('exam');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<EventPriority>('high');

  // Delete confirmation
  const [deletingEvent, setDeletingEvent] = useState<AcademicEvent | null>(null);

  // Combine custom academic events and official university holidays seamlessly
  const allEventsWithHolidays: AcademicEvent[] = React.useMemo(() => {
    const holidayDates = new Set(state.holidays.map(h => h.date));
    const eventsWithoutDuplicateHolidays = state.events.filter(
      e => !(e.type === 'holiday' && holidayDates.has(e.date))
    );

    const holidayItems: AcademicEvent[] = state.holidays.map(h => ({
      id: h.id,
      title: h.name,
      date: h.date,
      type: 'holiday' as AcademicEventType,
      priority: (h.type === 'national' ? 'high' : 'medium') as EventPriority,
      description: h.description || (h.type === 'national' ? 'National Public Holiday (Non-Attendance Day)' : 'Official University Holiday (Non-Attendance Day)'),
      completed: new Date(h.date) < new Date(new Date().toISOString().split('T')[0]),
      isNonAttendanceDay: h.isNonAttendanceDay !== false
    }));

    return [...eventsWithoutDuplicateHolidays, ...holidayItems];
  }, [state.events, state.holidays]);

  const filteredEvents = allEventsWithHolidays
    .filter((e) => {
      const matchesType = filterType === 'all' || e.type === filterType;
      const matchesCompleted = showCompleted ? true : !e.completed;
      return matchesType && matchesCompleted;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const openAddEvent = () => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime('10:00 AM');
    setFormType('exam');
    setFormSubjectId(state.subjects[0]?.id || '');
    setFormDescription('');
    setFormPriority('high');
    setIsEventModalOpen(true);
  };

  const openEditEvent = (ev: AcademicEvent) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormDate(ev.date);
    setFormTime(ev.time || '');
    setFormType(ev.type);
    setFormSubjectId(ev.subjectId || '');
    setFormDescription(ev.description || '');
    setFormPriority(ev.priority);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Event title is required', 'warning');
      return;
    }

    if (editingEvent) {
      updateEvent(editingEvent.id, {
        title: formTitle.trim(),
        date: formDate,
        time: formTime.trim() || undefined,
        type: formType,
        subjectId: formSubjectId || undefined,
        description: formDescription.trim() || undefined,
        priority: formPriority
      });
      showToast('Updated event', 'success');
    } else {
      addEvent({
        title: formTitle.trim(),
        date: formDate,
        time: formTime.trim() || undefined,
        type: formType,
        subjectId: formSubjectId || undefined,
        description: formDescription.trim() || undefined,
        priority: formPriority,
        completed: false
      });
      showToast('Added event to planner', 'success');
    }
    setIsEventModalOpen(false);
  };

  const handleToggleComplete = (ev: AcademicEvent) => {
    updateEvent(ev.id, { completed: !ev.completed });
    showToast(ev.completed ? 'Marked incomplete' : 'Marked as completed! 🎉', 'info');
  };

  const handleDeleteEvent = () => {
    if (!deletingEvent) return;
    const isHoliday = state.holidays.some(h => h.id === deletingEvent.id);
    if (isHoliday) {
      deleteHoliday(deletingEvent.id);
      showToast('Holiday removed', 'info');
    } else {
      deleteEvent(deletingEvent.id);
      showToast('Event removed', 'info');
    }
    setDeletingEvent(null);
  };

  const getEventTypeBadge = (type: AcademicEventType) => {
    switch (type) {
      case 'exam':
        return <Badge variant="critical">EXAM</Badge>;
      case 'project':
        return <Badge variant="coral">PROJECT</Badge>;
      case 'assignment':
        return <Badge variant="blue">ASSIGNMENT</Badge>;
      case 'holiday':
        return <Badge variant="yellow">HOLIDAY</Badge>;
      default:
        return <Badge variant="neutral">EVENT</Badge>;
    }
  };

  const holidayCount = state.holidays.length + state.events.filter(e => e.type === 'holiday' && !state.holidays.some(h => h.date === e.date)).length;
  const examCount = state.events.filter(e => e.type === 'exam').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E7E2]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2022]">
              Semester Planner & Academic Calendar
            </h1>
            <Badge variant="neutral">Sem {state.profile.semester}</Badge>
          </div>
          <p className="text-xs text-[#5A5E65] mt-1">
            Midterm examinations, assignment deadlines, university holidays, and project milestones.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#007FFF]" />}
          >
            Import Academic Calendar / Holidays
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openAddEvent}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Academic Milestone
          </Button>
        </div>
      </div>

      {/* Semester Overview Strip */}
      <div className="p-5 rounded-xl bg-white border border-[#E8E7E2] space-y-3 shadow-xs">
        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Milestone className="w-4 h-4 text-[#007FFF]" />
            <span className="font-semibold text-[#1E2022]">Semester {state.profile.semester} Timeline: </span>
            <span className="text-[#5A5E65] font-mono">{state.semesterStartDate} to {state.semesterEndDate}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#5A5E65]">🎉 <strong className="text-[#1E2022] font-mono">{holidayCount}</strong> Holidays (Non-Attendance)</span>
            <span className="text-[#5A5E65]">📝 <strong className="text-[#1E2022] font-mono">{examCount}</strong> Exams</span>
          </div>
        </div>

        {/* Quick import helper if calendar has no items */}
        {state.events.length === 0 && state.holidays.length === 0 && (
          <div className="p-3 rounded-lg bg-[#FCFBF8] border border-[#E8E7E2] flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#5A5E65]">
              <CalendarDays className="w-4 h-4 text-[#007FFF]" />
              <span>No academic events or holidays logged yet for this semester.</span>
            </div>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="font-semibold text-[#007FFF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Upload University Academic Circular or Holiday List</span> &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#F4F3EE] rounded-lg border border-[#E8E7E2] text-xs overflow-x-auto">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'exam', label: 'Exams' },
            { id: 'assignment', label: 'Assignments' },
            { id: 'project', label: 'Projects' },
            { id: 'holiday', label: 'Holidays' },
            { id: 'event', label: 'Events' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1 rounded-md capitalize font-medium transition-colors shrink-0 ${
                filterType === item.id
                  ? 'bg-white text-[#1E2022] shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-[#5A5E65] cursor-pointer self-end sm:self-center">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded border-[#E8E7E2] text-[#007FFF] focus:ring-[#007FFF]"
          />
          <span>Show completed items</span>
        </label>
      </div>

      {/* Holiday Non-Attendance Explanatory Advisory */}
      {filterType === 'holiday' && (
        <div className="p-3.5 rounded-xl bg-[#F4FBF6] border border-[#D1F2D9] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#16A34A]">
            <Sun className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <div>
              <span className="font-semibold text-[#1E2022] block sm:inline">Official University Holidays & Non-Attendance Days: </span>
              <span className="text-[#5A5E65] text-[11px]">All extracted holidays are certified non-attendance days. They are automatically excluded from attendance penalty calculations and will never lower your subject attendance percentages.</span>
            </div>
          </div>
        </div>
      )}

      {/* Events List Timeline */}
      <div className="bg-white rounded-xl border border-[#E8E7E2] divide-y divide-[#E8E7E2] shadow-xs">
        {filteredEvents.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#5A5E65] space-y-3">
            <p>No upcoming events match the current filter.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              Extract from Academic Calendar
            </Button>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const subject = state.subjects.find(s => s.id === ev.subjectId);

            return (
              <div
                key={ev.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-[#FCFBF8] ${
                  ev.completed ? 'opacity-50 bg-[#FCFBF8]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleComplete(ev)}
                    className="mt-0.5 text-[#848A94] hover:text-[#1E2022] cursor-pointer"
                  >
                    {ev.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold tracking-tight text-[#1E2022] ${ev.completed ? 'line-through' : ''}`}>
                        {ev.title}
                      </span>
                      {getEventTypeBadge(ev.type)}
                      {(ev.type === 'holiday' || ev.isNonAttendanceDay) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] bg-[#EBF7EE] border border-[#D1F2D9] px-2 py-0.5 rounded-md">
                          <Sun className="w-3 h-3 text-[#F59E0B]" />
                          Non-Attendance Day
                        </span>
                      )}
                      {subject && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F4F3EE] text-[#5A5E65] border border-[#E8E7E2]">
                          {subject.code}
                        </span>
                      )}
                    </div>

                    {ev.description && (
                      <p className="text-xs text-[#5A5E65] leading-relaxed max-w-2xl">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E7E2]">
                  <div className="text-left sm:text-right text-xs">
                    <span className="font-semibold text-[#1E2022] block font-mono">{ev.date}</span>
                    {ev.time && <span className="text-[11px] text-[#848A94]">{ev.time}</span>}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditEvent(ev)}
                      className="p-1.5 text-[#5A5E65] hover:text-[#1E2022] rounded hover:bg-[#F4F3EE] cursor-pointer"
                      title="Edit Event"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingEvent(ev)}
                      className="p-1.5 text-[#5A5E65] hover:text-[#D9381E] rounded hover:bg-[#FFF1F0] cursor-pointer"
                      title="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Calendar Import Modal (AI Multimodal / PDF / Image / Excel / CSV / Manual) */}
      <CalendarImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        state={state}
        onSuccess={() => {
          showToast('Academic calendar and holidays loaded successfully!', 'success');
        }}
      />

      {/* Add / Edit Event Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={editingEvent ? 'Edit Milestone' : 'Add Academic Milestone'}
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Title / Milestone Name</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Operating Systems Shell Project Due"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Event Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as AcademicEventType)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] focus:outline-hidden focus:border-[#007FFF]"
              >
                <option value="exam">Examination</option>
                <option value="assignment">Assignment Due</option>
                <option value="project">Project Submission</option>
                <option value="holiday">University Holiday (Non-Attendance)</option>
                <option value="event">Technical Symposium / Hackathon</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Associated Course</label>
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] focus:outline-hidden focus:border-[#007FFF]"
              >
                <option value="">General / Institution</option>
                {state.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formType === 'holiday' && (
            <div className="p-3 rounded-lg bg-[#EBF7EE] border border-[#D1F2D9] flex items-center gap-2 text-xs text-[#16A34A]">
              <Sun className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>Flagged as official Non-Attendance Day (automatically excluded from class attendance & penalty calculations).</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Date</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Time (Optional)</label>
              <input
                type="text"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                placeholder="e.g. 10:00 AM - 12:00 PM"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Notes / Description</label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. Units 1 and 2, Room: Examination Hall A"
              className="w-full p-3 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8E7E2]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsEventModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingEvent ? 'Save Changes' : 'Add Milestone'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Event Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingEvent)}
        onClose={() => setDeletingEvent(null)}
        onConfirm={handleDeleteEvent}
        title="Delete Milestone"
        message={`Are you sure you want to remove "${deletingEvent?.title}" from your semester calendar?`}
      />
    </div>
  );
};
