import React, { useState } from 'react';
import { 
  ShieldAlert, 
  RotateCcw, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  Calendar, 
  BookOpen, 
  Flag, 
  FileText, 
  Layers, 
  RefreshCw, 
  Sliders, 
  KeyRound, 
  Check, 
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { AppState, Subject } from '../../types';
import { 
  adminResetAllAttendance, 
  adminResetCourseAttendance, 
  adminResetTimetable, 
  adminResetMilestones, 
  adminResetNotes, 
  adminMasterFullReset, 
  adminRestoreDemoCurriculum 
} from '../../services/storage';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface AdminResetConsoleProps {
  state: AppState;
  onNavigate?: (route: string) => void;
}

export const AdminResetConsole: React.FC<AdminResetConsoleProps> = ({ state, onNavigate }) => {
  const { showToast } = useToast();

  // Selected subject for custom counter adjustment
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [customAttended, setCustomAttended] = useState<number>(0);
  const [customTotal, setCustomTotal] = useState<number>(0);

  // Active confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'attendance_all' | 'course_attendance' | 'timetable' | 'milestones' | 'notes' | 'factory' | 'restore_demo';
    title: string;
    description: string;
    targetSubjectId?: string;
    targetSubjectName?: string;
    isDestructive: boolean;
  } | null>(null);

  const [typedConfirmation, setTypedConfirmation] = useState('');

  // System status metrics
  const totalSubjects = state.subjects.length;
  const totalAttendanceRecords = state.attendanceRecords.length;
  const totalTimetableSlots = state.timetableSlots.length;
  const totalNotes = state.notes.length;
  const totalMilestones = (state.semesterMilestones || []).length;
  const totalClassesRecorded = state.subjects.reduce((acc, s) => acc + s.totalClasses, 0);

  const handleOpenSubjectReset = (sub: Subject) => {
    setEditingSubjectId(sub.id);
    setCustomAttended(0);
    setCustomTotal(0);
  };

  const handleSaveCustomCourseReset = (subjectId: string, subjectName: string) => {
    adminResetCourseAttendance(subjectId, customAttended, customTotal);
    showToast(`Reset ${subjectName} attendance to ${customAttended}/${customTotal}`, 'success');
    setEditingSubjectId(null);
  };

  const handleConfirmReset = () => {
    if (!confirmAction) return;

    switch (confirmAction.type) {
      case 'attendance_all':
        adminResetAllAttendance();
        showToast('All course attendance records and class counters reset to 0/0', 'success');
        break;

      case 'course_attendance':
        if (confirmAction.targetSubjectId) {
          adminResetCourseAttendance(confirmAction.targetSubjectId, 0, 0);
          showToast(`Reset attendance for ${confirmAction.targetSubjectName || 'course'} to 0/0`, 'success');
        }
        break;

      case 'timetable':
        adminResetTimetable();
        showToast('Timetable schedule, replacement days, and faculty leaves cleared', 'success');
        break;

      case 'milestones':
        adminResetMilestones();
        showToast('Semester milestones and academic targets cleared', 'success');
        break;

      case 'notes':
        adminResetNotes();
        showToast('All academic notes and study materials cleared', 'success');
        break;

      case 'restore_demo':
        adminRestoreDemoCurriculum();
        showToast('Restored official Computer Engineering 6-course curriculum and schedule', 'success');
        break;

      case 'factory':
        adminMasterFullReset();
        showToast('Master Factory Reset: Entire workspace reset to clean initial state', 'info');
        break;
    }

    setConfirmAction(null);
    setTypedConfirmation('');
  };

  return (
    <div className="space-y-6">
      {/* Admin Privilege Header Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-[#1E2022] to-[#2D3035] text-white shadow-xs border border-[#3C4047] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#F4C430] text-[#1E2022]">
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Console
              </span>
              <span className="text-xs text-[#E8E7E2]">
                Full System Reset Authority
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              System Reset & Data Management Center
            </h2>
            <p className="text-xs text-[#B0B4BC] max-w-2xl">
              Execute selective or system-wide resets for course attendance logs, timetables, academic milestones, and database state with fine-grained administrative controls.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmAction({
                  type: 'restore_demo',
                  title: 'Restore Standard Demo Curriculum?',
                  description: 'This will re-populate all 6 standard engineering courses, faculty assignments, lecture schedule, and sample attendance data.',
                  isDestructive: false
                });
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#F4C430]" />}
            >
              Restore Demo Dataset
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirmAction({
                  type: 'factory',
                  title: 'Execute Master Factory Reset?',
                  description: 'CRITICAL ACTION: This wipes all subjects, timetables, attendance records, notes, and milestones to a completely clean slate.',
                  isDestructive: true
                });
              }}
              className="text-xs"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Master Factory Reset
            </Button>
          </div>
        </div>

        {/* Live System Data Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-[#A6ABB5] block uppercase font-medium">Courses Enrolled</span>
            <span className="text-lg font-mono font-bold text-white">{totalSubjects}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-[#A6ABB5] block uppercase font-medium">Attendance Records</span>
            <span className="text-lg font-mono font-bold text-white">{totalAttendanceRecords}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-[#A6ABB5] block uppercase font-medium">Timetable Slots</span>
            <span className="text-lg font-mono font-bold text-white">{totalTimetableSlots}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-[#A6ABB5] block uppercase font-medium">Semester Milestones</span>
            <span className="text-lg font-mono font-bold text-white">{totalMilestones}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-[#A6ABB5] block uppercase font-medium">Total Classes Held</span>
            <span className="text-lg font-mono font-bold text-white">{totalClassesRecorded}</span>
          </div>
        </div>
      </div>

      {/* Primary Reset Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reset 1: All Course Attendance */}
        <div className="p-5 rounded-xl bg-white border border-[#E8E7E2] hover:border-[#D1D0C9] transition-all space-y-3 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#FFF1F0] text-[#D9381E]">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#1E2022]">
                  Reset All Course Attendance
                </h3>
              </div>
              <Badge variant="warning">Term Reset</Badge>
            </div>
            <p className="text-xs text-[#5A5E65] leading-relaxed">
              Zeroes out attended and conducted class counts (0 / 0) across all courses and deletes all dated attendance logs. 
              <strong> Keeps your subjects, faculty, syllabus, and timetable slots intact.</strong> Ideal when starting a fresh term.
            </p>
          </div>

          <div className="pt-3 border-t border-[#E8E7E2] flex items-center justify-between">
            <span className="text-[11px] text-[#848A94]">
              {totalAttendanceRecords} session logs will be purged
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmAction({
                  type: 'attendance_all',
                  title: 'Reset Attendance for All Courses?',
                  description: 'This will reset attended and total classes to 0 for all courses and clear all attendance session logs. Subjects and timetable will not be deleted.',
                  isDestructive: true
                });
              }}
              className="text-[#D9381E] hover:bg-[#FFF1F0] hover:border-[#FADBD8]"
            >
              Reset All Attendance
            </Button>
          </div>
        </div>

        {/* Reset 2: Timetable & Schedule */}
        <div className="p-5 rounded-xl bg-white border border-[#E8E7E2] hover:border-[#D1D0C9] transition-all space-y-3 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#EBF5FF] text-[#0066CC]">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#1E2022]">
                  Reset Timetable & Schedule
                </h3>
              </div>
              <Badge variant="blue">{totalTimetableSlots} Slots</Badge>
            </div>
            <p className="text-xs text-[#5A5E65] leading-relaxed">
              Clears all weekly timetable periods, replacement day schedule overrides, and faculty leave entries. Leaves subjects and attendance numbers untouched so you can import a new semester schedule.
            </p>
          </div>

          <div className="pt-3 border-t border-[#E8E7E2] flex items-center justify-between">
            <span className="text-[11px] text-[#848A94]">
              Ready for new timetable upload
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmAction({
                  type: 'timetable',
                  title: 'Clear Entire Timetable Schedule?',
                  description: 'This will remove all weekly timetable periods, replacement day schedules, and faculty leaves.',
                  isDestructive: true
                });
              }}
            >
              Clear Timetable
            </Button>
          </div>
        </div>

        {/* Reset 3: Semester Milestones & Targets */}
        <div className="p-5 rounded-xl bg-white border border-[#E8E7E2] hover:border-[#D1D0C9] transition-all space-y-3 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#FEF9E7] text-[#975A16]">
                  <Flag className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#1E2022]">
                  Reset Milestones & Targets
                </h3>
              </div>
              <Badge variant="warning">{totalMilestones} Milestones</Badge>
            </div>
            <p className="text-xs text-[#5A5E65] leading-relaxed">
              Wipes out all tracked academic milestones, exam countdowns, project targets, and completed goal checklists.
            </p>
          </div>

          <div className="pt-3 border-t border-[#E8E7E2] flex items-center justify-between">
            <span className="text-[11px] text-[#848A94]">
              Clear semester milestone queue
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmAction({
                  type: 'milestones',
                  title: 'Clear All Semester Milestones?',
                  description: 'This will delete all academic milestone targets, checkpoints, and exam deadlines.',
                  isDestructive: true
                });
              }}
            >
              Clear Milestones
            </Button>
          </div>
        </div>

        {/* Reset 4: Smart Notes & Study Materials */}
        <div className="p-5 rounded-xl bg-white border border-[#E8E7E2] hover:border-[#D1D0C9] transition-all space-y-3 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#EBF7EE] text-[#1E7E34]">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#1E2022]">
                  Reset Notes & Documents
                </h3>
              </div>
              <Badge variant="safe">{totalNotes} Notes</Badge>
            </div>
            <p className="text-xs text-[#5A5E65] leading-relaxed">
              Removes all uploaded notes, assignments, presentations, lab manuals, and tags stored in your workspace.
            </p>
          </div>

          <div className="pt-3 border-t border-[#E8E7E2] flex items-center justify-between">
            <span className="text-[11px] text-[#848A94]">
              Wipes local note storage
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmAction({
                  type: 'notes',
                  title: 'Delete All Academic Notes?',
                  description: 'This will permanently remove all stored academic notes, documents, and attachments.',
                  isDestructive: true
                });
              }}
            >
              Clear Notes
            </Button>
          </div>
        </div>
      </div>

      {/* Course-Specific Attendance Reset Console */}
      <div className="bg-white rounded-xl border border-[#E8E7E2] overflow-hidden shadow-xs space-y-0">
        <div className="p-5 border-b border-[#E8E7E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FCFBF8]">
          <div>
            <h3 className="text-sm font-bold text-[#1E2022] tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#007FFF]" />
              Course-Specific Attendance Reset Console
            </h3>
            <p className="text-xs text-[#5A5E65] mt-0.5">
              Reset or calibrate attendance numbers for individual courses without affecting other enrolled subjects.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-[#848A94]">
            {totalSubjects} Active Courses
          </span>
        </div>

        <div className="divide-y divide-[#E8E7E2]">
          {state.subjects.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5A5E65]">
              No subjects currently enrolled in the workspace.
            </div>
          ) : (
            state.subjects.map((sub) => {
              const isEditing = editingSubjectId === sub.id;
              const currentPct = sub.totalClasses > 0 
                ? Math.round((sub.attendedClasses / sub.totalClasses) * 1000) / 10 
                : 0;

              return (
                <div key={sub.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FCFBF8] transition-colors">
                  <div className="space-y-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#F4F3EE] border border-[#E8E7E2] text-[#1E2022]">
                        {sub.code}
                      </span>
                      <h4 className="text-xs font-bold text-[#1E2022]">
                        {sub.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#5A5E65]">
                      <span>{sub.faculty || 'Professor'}</span>
                      <span>•</span>
                      <span>Room {sub.room || 'LH'}</span>
                      <span>•</span>
                      <span>Threshold: {sub.targetAttendance}%</span>
                    </div>
                  </div>

                  {/* Attendance Stats & Quick Calibration */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-baseline gap-1.5 justify-end">
                        <span className="font-mono font-bold text-sm text-[#1E2022]">
                          {sub.attendedClasses} / {sub.totalClasses}
                        </span>
                        <span className="text-[11px] text-[#5A5E65]">classes</span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-[#007FFF]">
                        {currentPct}%
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 bg-[#F4F3EE] p-2 rounded-lg border border-[#E8E7E2]">
                        <div className="flex items-center gap-1 text-xs">
                          <label className="text-[10px] text-[#5A5E65]">Attended:</label>
                          <input
                            type="number"
                            min="0"
                            value={customAttended}
                            onChange={(e) => setCustomAttended(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-14 px-1.5 py-1 text-xs font-mono bg-white border border-[#D1D0C9] rounded"
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <label className="text-[10px] text-[#5A5E65]">Total:</label>
                          <input
                            type="number"
                            min={customAttended}
                            value={customTotal}
                            onChange={(e) => setCustomTotal(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-14 px-1.5 py-1 text-xs font-mono bg-white border border-[#D1D0C9] rounded"
                          />
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSaveCustomCourseReset(sub.id, sub.code)}
                          className="text-xs px-2.5 py-1"
                        >
                          Apply
                        </Button>
                        <button
                          onClick={() => setEditingSubjectId(null)}
                          className="p-1 text-[#848A94] hover:text-[#1E2022]"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSubjectReset(sub)}
                          className="text-xs"
                        >
                          Calibrate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmAction({
                              type: 'course_attendance',
                              title: `Reset ${sub.code} Attendance to 0/0?`,
                              description: `This will reset attended classes to 0 and total classes to 0 for ${sub.name} (${sub.code}), purging this subject's historical logs.`,
                              targetSubjectId: sub.id,
                              targetSubjectName: sub.code,
                              isDestructive: true
                            });
                          }}
                          className="text-[#D9381E] hover:bg-[#FFF1F0] hover:border-[#FADBD8] text-xs"
                        >
                          Zero (0/0)
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Safety Confirmation Modal */}
      <Modal
        isOpen={Boolean(confirmAction)}
        onClose={() => {
          setConfirmAction(null);
          setTypedConfirmation('');
        }}
        title={confirmAction?.title || 'Confirm Admin Action'}
      >
        <div className="space-y-4">
          <div className={`p-3.5 rounded-lg border flex items-start gap-3 ${
            confirmAction?.isDestructive
              ? 'bg-[#FFF8F7] border-[#FADBD8] text-[#D9381E]'
              : 'bg-[#EBF5FF] border-[#CCE5FF] text-[#0066CC]'
          }`}>
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs text-[#1E2022] space-y-1">
              <span className="font-bold block">
                {confirmAction?.isDestructive ? 'Warning: Destructive Reset Action' : 'Notice: Data Replacement'}
              </span>
              <p className="text-[#5A5E65] leading-relaxed">
                {confirmAction?.description}
              </p>
            </div>
          </div>

          {confirmAction?.isDestructive && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-[#1E2022]">
                To verify this admin operation, type <strong className="font-mono text-[#D9381E]">RESET</strong> below:
              </label>
              <input
                type="text"
                placeholder="Type RESET"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#E8E7E2] bg-white text-[#1E2022] focus:outline-none focus:border-[#D9381E]"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E7E2]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmAction(null);
                setTypedConfirmation('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction?.isDestructive ? 'danger' : 'primary'}
              size="sm"
              disabled={confirmAction?.isDestructive && typedConfirmation !== 'RESET'}
              onClick={handleConfirmReset}
            >
              {confirmAction?.isDestructive ? 'Confirm & Execute Reset' : 'Proceed with Restore'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
