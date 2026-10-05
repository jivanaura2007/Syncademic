import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  History, 
  Filter, 
  Calendar,
  Building,
  User,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Table,
  Sun
} from 'lucide-react';
import { AppState, Subject, AttendanceRecord } from '../../types';
import { calculateSubjectAttendance, calculateOverallAttendance } from '../../utils/attendanceMath';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { addSubject, updateSubject, deleteSubject, markClassAttendance } from '../../services/storage';
import { useToast } from '../../components/common/Toast';

interface AttendancePageProps {
  state: AppState;
  onNavigateToBunkPlanner: (subjectId?: string) => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({
  state,
  onNavigateToBunkPlanner
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'safe' | 'warning' | 'critical'>('all');

  // Subject Modal state (Add / Edit)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formFaculty, setFormFaculty] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formCredits, setFormCredits] = useState(4);
  const [formTarget, setFormTarget] = useState(75);
  const [formAttended, setFormAttended] = useState(0);
  const [formTotal, setFormTotal] = useState(0);

  // Delete subject confirmation
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  // Manual Log Attendance modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logSubjectId, setLogSubjectId] = useState(state.subjects[0]?.id || '');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logTimeSlot, setLogTimeSlot] = useState('09:00 - 10:00');
  const [logStatus, setLogStatus] = useState<AttendanceRecord['status']>('present');
  const [logNote, setLogNote] = useState('');

  const overall = calculateOverallAttendance(state.subjects);

  const filteredSubjects = state.subjects.filter((sub) => {
    const calc = calculateSubjectAttendance(sub);
    if (filter === 'all') return true;
    if (filter === 'safe') return calc.status === 'safe';
    if (filter === 'warning') return calc.status === 'warning';
    if (filter === 'critical') return calc.status === 'critical';
    return true;
  });

  const openAddSubject = () => {
    setEditingSubject(null);
    setFormName('');
    setFormCode('');
    setFormFaculty('');
    setFormRoom('');
    setFormCredits(4);
    setFormTarget(state.profile.defaultAttendanceThreshold || 75);
    setFormAttended(0);
    setFormTotal(0);
    setIsSubjectModalOpen(true);
  };

  const openEditSubject = (sub: Subject) => {
    setEditingSubject(sub);
    setFormName(sub.name);
    setFormCode(sub.code);
    setFormFaculty(sub.faculty);
    setFormRoom(sub.room);
    setFormCredits(sub.credits);
    setFormTarget(sub.targetAttendance);
    setFormAttended(sub.attendedClasses);
    setFormTotal(sub.totalClasses);
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      showToast('Subject Name and Code are required', 'warning');
      return;
    }

    if (editingSubject) {
      updateSubject(editingSubject.id, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        faculty: formFaculty.trim(),
        room: formRoom.trim(),
        credits: Number(formCredits),
        targetAttendance: Number(formTarget),
        attendedClasses: Number(formAttended),
        totalClasses: Math.max(Number(formAttended), Number(formTotal))
      });
      showToast(`Updated ${formCode.toUpperCase()}`, 'success');
    } else {
      addSubject({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        faculty: formFaculty.trim(),
        room: formRoom.trim(),
        credits: Number(formCredits),
        color: '#E82A89',
        targetAttendance: Number(formTarget),
        attendedClasses: Number(formAttended),
        totalClasses: Math.max(Number(formAttended), Number(formTotal)),
        notesCount: 0
      });
      showToast(`Added ${formCode.toUpperCase()}`, 'success');
    }
    setIsSubjectModalOpen(false);
  };

  const handleDeleteSubject = () => {
    if (!deletingSubject) return;
    deleteSubject(deletingSubject.id);
    showToast(`Removed subject ${deletingSubject.code}`, 'info');
    setDeletingSubject(null);
  };

  const handleQuickLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logSubjectId) return;

    markClassAttendance(logSubjectId, logDate, logTimeSlot, logStatus, logNote || undefined);
    showToast(`Recorded ${logStatus.toUpperCase()} for ${logDate}`, 'success');
    setIsLogModalOpen(false);
    setLogNote('');
  };

  const handleQuickAttendance = (subId: string, status: 'present' | 'absent') => {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    markClassAttendance(subId, today, time, status);
    showToast(`Marked ${status.toUpperCase()} for subject`, 'success');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E7E2]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2022]">
              Attendance Tracker
            </h1>
            <Badge variant="neutral">Sem {state.profile.semester}</Badge>
          </div>
          <p className="text-xs text-[#5A5E65] mt-1">
            Subject-wise attendance, safe bunks calculation, and flexible session logs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLogModalOpen(true)}
            leftIcon={<History className="w-3.5 h-3.5 text-[#007FFF]" />}
          >
            Log Session
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openAddSubject}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Subject
          </Button>
        </div>
      </div>

      {/* Subject-Wise Compliance Policy Advisory Banner */}
      <div className="p-4 rounded-xl bg-[#FFF8F7] border border-[#FADBD8] flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#D9381E] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-[#D9381E]">
            University Attendance Policy: Course-by-Course Threshold Requirement
          </h4>
          <p className="text-xs text-[#5A5E65] leading-relaxed">
            Attendance is calculated and enforced <strong>individually for each enrolled subject and course</strong>. Meeting an overall aggregate percentage does <strong>not</strong> grant exam eligibility if any single course drops below its critical threshold ({state.profile.defaultAttendanceThreshold || 75}%). Ensure every subject maintains compliance to avoid semester debarment.
          </p>
        </div>
      </div>

      {/* Aggregate Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#E8E7E2]">
          <span className="text-[11px] font-medium text-[#5A5E65]">Course Compliance</span>
          <div className="text-xl font-bold font-mono text-[#1E2022] mt-1 flex items-baseline gap-1.5">
            <span className={overall.subjectsAboveThreshold === state.subjects.length ? 'text-[#1E7E34]' : 'text-[#D9381E]'}>
              {overall.subjectsAboveThreshold}
            </span>
            <span className="text-xs font-normal text-[#5A5E65]">/ {state.subjects.length} courses safe</span>
          </div>
          <span className="text-[10px] text-[#848A94]">
            {overall.subjectsAboveThreshold === state.subjects.length ? 'All courses meet critical threshold' : `${state.subjects.length - overall.subjectsAboveThreshold} courses below threshold`}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E8E7E2]">
          <span className="text-[11px] font-medium text-[#5A5E65]">Critical Threshold</span>
          <div className="text-xl font-bold font-mono text-[#1E2022] mt-1">
            {state.profile.defaultAttendanceThreshold || 75}%
          </div>
          <span className="text-[10px] text-[#D9381E] font-medium">Mandatory per subject</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E8E7E2]">
          <span className="text-[11px] font-medium text-[#5A5E65]">At-Risk Courses</span>
          <div className="text-xl font-bold font-mono text-[#D9381E] mt-1">
            {overall.subjectsBelowThreshold}
          </div>
          <span className="text-[10px] text-[#D9381E]">
            {overall.criticalSubjectsCount > 0 ? `${overall.criticalSubjectsCount} critical detention risk` : 'Borderline shortage'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E8E7E2]">
          <span className="text-[11px] font-medium text-[#5A5E65]">Overall Average (Ref)</span>
          <div className="text-xl font-bold font-mono text-[#5A5E65] mt-1">
            {overall.overallPercentage}%
          </div>
          <span className="text-[10px] text-[#848A94]">
            Aggregate only • Subject rules apply
          </span>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-[#F4F3EE] rounded-lg border border-[#E8E7E2] text-xs">
          {(['all', 'safe', 'warning', 'critical'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
                filter === f
                  ? 'bg-white text-[#1E2022] shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              {f === 'all' ? 'All Subjects' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSubjects.map((sub) => {
          const calc = calculateSubjectAttendance(sub);
          const missed = sub.totalClasses - sub.attendedClasses;

          return (
            <div
              key={sub.id}
              className="p-5 rounded-xl bg-white border border-[#E8E7E2] hover:border-[#D5D3CB] transition-all space-y-4 shadow-xs"
            >
              {/* Subject Title & Actions */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#F4F3EE] border border-[#E8E7E2] text-[#1E2022]">
                      {sub.code}
                    </span>
                    <h3 className="text-sm font-semibold text-[#1E2022] tracking-tight">
                      {sub.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#5A5E65] mt-1.5">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[#848A94]" />
                      {sub.faculty || 'Faculty not assigned'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-[#848A94]" />
                      {sub.room || 'LH'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditSubject(sub)}
                    className="p-1.5 text-[#848A94] hover:text-[#1E2022] rounded-md hover:bg-[#F4F3EE]"
                    title="Edit Subject"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingSubject(sub)}
                    className="p-1.5 text-[#848A94] hover:text-[#D9381E] rounded-md hover:bg-[#FFF1F0]"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress & Numbers */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-[#1E2022]">
                      {calc.currentPercentage}%
                    </span>
                    <span className="text-xs text-[#5A5E65]">
                      ({sub.attendedClasses}/{sub.totalClasses} attended)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-medium text-[#5A5E65]">
                      Critical Threshold: <strong>{sub.targetAttendance}%</strong>
                    </span>
                    <Badge variant={calc.status}>
                      {calc.currentPercentage >= sub.targetAttendance
                        ? '✓ Compliant'
                        : calc.status === 'critical'
                        ? '❌ Detention Risk'
                        : '⚠️ Shortage'}
                    </Badge>
                  </div>
                </div>

                {/* Progress bar with threshold indicator */}
                <div className="relative w-full h-2.5 bg-[#E8E7E2] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      calc.currentPercentage >= sub.targetAttendance
                        ? 'bg-[#35A853]'
                        : calc.currentPercentage >= sub.targetAttendance - 10
                        ? 'bg-[#F4C430]'
                        : 'bg-[#FF6347]'
                    }`}
                    style={{ width: `${Math.min(100, calc.currentPercentage)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-[#1E2022] z-10 -ml-0.5 shadow-xs"
                    style={{ left: `${Math.min(100, sub.targetAttendance)}%` }}
                    title={`Critical Threshold: ${sub.targetAttendance}%`}
                  />
                </div>
              </div>

              {/* Mathematical Bunk & Recovery Outcome */}
              <div className="p-3 rounded-lg bg-[#FCFBF8] border border-[#E8E7E2] text-xs flex items-center justify-between">
                <div className="text-[#5A5E65]">
                  {calc.safeBunks > 0 ? (
                    <span>
                      <strong className="text-[#1E7E34]">{calc.safeBunks}</strong> safe {calc.safeBunks === 1 ? 'bunk' : 'bunks'} remaining
                    </span>
                  ) : calc.classesNeededToRecover > 0 ? (
                    <span>
                      Attend next <strong className="text-[#D9381E]">{calc.classesNeededToRecover}</strong> {calc.classesNeededToRecover === 1 ? 'class' : 'classes'} to reach {sub.targetAttendance}%
                    </span>
                  ) : (
                    <span>On target threshold ({sub.targetAttendance}%)</span>
                  )}
                </div>

                <button
                  onClick={() => onNavigateToBunkPlanner(sub.id)}
                  className="text-[11px] font-semibold text-[#007FFF] hover:underline flex items-center gap-0.5"
                >
                  Simulate <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              {/* Fast +1 Present / +1 Absent Action Bar */}
              <div className="pt-2 border-t border-[#E8E7E2] flex items-center justify-between">
                <span className="text-[10px] text-[#848A94]">
                  Missed: {missed} {missed === 1 ? 'class' : 'classes'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleQuickAttendance(sub.id, 'present')}
                    className="px-2.5 py-1 rounded bg-[#EBF7EE] text-[#1E7E34] hover:bg-[#D4EDDA] text-xs font-semibold border border-[#C3E6CB] transition-colors"
                  >
                    + Present
                  </button>
                  <button
                    onClick={() => handleQuickAttendance(sub.id, 'absent')}
                    className="px-2.5 py-1 rounded bg-[#FFF1F0] text-[#D9381E] hover:bg-[#FFE4E1] text-xs font-semibold border border-[#FADBD8] transition-colors"
                  >
                    + Absent
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
        subtitle="Manage course details, faculty, and attendance target"
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Subject Name</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Operating Systems"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Subject Code</label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="e.g. CS302"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Faculty Name</label>
              <input
                type="text"
                value={formFaculty}
                onChange={(e) => setFormFaculty(e.target.value)}
                placeholder="e.g. Prof. Meera Sen"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Lecture Hall / Room</label>
              <input
                type="text"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                placeholder="e.g. LH-102"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Target %</label>
              <input
                type="number"
                min="50"
                max="100"
                value={formTarget}
                onChange={(e) => setFormTarget(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Attended</label>
              <input
                type="number"
                min="0"
                value={formAttended}
                onChange={(e) => setFormAttended(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Total Classes</label>
              <input
                type="number"
                min={formAttended}
                value={formTotal}
                onChange={(e) => setFormTotal(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8E7E2]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsSubjectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manual Class Log Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Log Class Attendance Session"
        subtitle="Record attendance session and sync directly to Google Sheets"
      >
        <form onSubmit={handleQuickLog} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Select Subject</label>
            <select
              value={logSubjectId}
              onChange={(e) => setLogSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            >
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Date</label>
              <input
                type="date"
                required
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Time Slot</label>
              <input
                type="text"
                value={logTimeSlot}
                onChange={(e) => setLogTimeSlot(e.target.value)}
                placeholder="e.g. 09:00 - 10:00"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {(() => {
            const matchedHoliday = state.holidays.find(h => h.date === logDate);
            if (!matchedHoliday) return null;
            return (
              <div className="p-2.5 rounded-lg bg-[#EBF7EE] border border-[#D1F2D9] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-[#16A34A]">
                  <Sun className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                  <span><strong>{matchedHoliday.name}</strong> is an official Non-Attendance Day.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLogStatus('holiday')}
                  className="text-[11px] font-semibold text-[#16A34A] underline hover:opacity-80 cursor-pointer"
                >
                  Set as Holiday
                </button>
              </div>
            );
          })()}

          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Status</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'present', label: 'Present', color: 'text-[#1E7E34]' },
                { id: 'absent', label: 'Absent', color: 'text-[#D9381E]' },
                { id: 'faculty_leave', label: 'Faculty Leave', color: 'text-[#B7791F]' },
                { id: 'holiday', label: 'Holiday', color: 'text-[#16A34A]' }
              ].map((st) => (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => setLogStatus(st.id as any)}
                  className={`px-2 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    logStatus === st.id
                      ? 'bg-[#1E2022] text-white border-[#1E2022]'
                      : 'bg-[#FCFBF8] text-[#5A5E65] border-[#E8E7E2] hover:bg-[#F4F3EE]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Reason / Note (Optional)</label>
            <input
              type="text"
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
              placeholder="e.g. Attended campus symposium, sick leave"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8E7E2]">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Session Log
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Subject Delete */}
      <ConfirmModal
        isOpen={Boolean(deletingSubject)}
        onClose={() => setDeletingSubject(null)}
        onConfirm={handleDeleteSubject}
        title="Delete Subject"
        message={`Are you sure you want to delete ${deletingSubject?.name} (${deletingSubject?.code})? This will permanently remove its timetable entries and associated attendance logs.`}
        confirmLabel="Delete Subject"
      />
    </div>
  );
};
