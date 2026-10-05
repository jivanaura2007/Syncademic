import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Calendar as CalendarIcon, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight, 
  CheckSquare, 
  Sparkles, 
  FolderOpen, 
  CalendarDays,
  FileText,
  Building,
  Plus,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { AppState, TimetableSlot, Subject, AttendanceRecord, DayOfWeek } from '../../types';
import { calculateSubjectAttendance, calculateOverallAttendance } from '../../utils/attendanceMath';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { markClassAttendance } from '../../services/storage';
import { useToast } from '../../components/common/Toast';
import { SemesterGoalsWidget } from '../../components/dashboard/SemesterGoalsWidget';
import { SubjectComplianceMatrix } from '../../components/dashboard/SubjectComplianceMatrix';

interface DashboardPageProps {
  state: AppState;
  onNavigate: (route: string) => void;
  onOpenQuickMarkModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  state,
  onNavigate,
  onOpenQuickMarkModal
}) => {
  const { showToast } = useToast();

  // Get current day of week (1..6)
  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 is Sunday, 1 is Mon... 6 is Sat
  const todayStr = now.toISOString().split('T')[0];

  // Check if today is a replacement day
  const replacementDay = state.replacementDays.find(r => r.date === todayStr);
  const effectiveDayOfWeek: DayOfWeek = replacementDay
    ? replacementDay.operatesAsDayOfWeek
    : (currentDayIndex >= 1 && currentDayIndex <= 6 ? (currentDayIndex as DayOfWeek) : 1);

  // Check if today is a university holiday
  const todayHoliday = state.holidays.find(h => h.date === todayStr);

  // Today's classes based on effectiveDayOfWeek
  const todaySlots = state.timetableSlots
    .filter(slot => slot.dayOfWeek === effectiveDayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Attendance calculations for all subjects
  const subjectCalculations = state.subjects.map(s => ({
    subject: s,
    calc: calculateSubjectAttendance(s)
  }));

  const overall = calculateOverallAttendance(state.subjects);
  const subjectsBelowThreshold = subjectCalculations.filter(sc => sc.calc.currentPercentage < sc.subject.targetAttendance);
  const criticalDetentionSubjects = subjectCalculations.filter(sc => sc.calc.status === 'critical');
  const atRiskSubjects = subjectCalculations.filter(sc => sc.calc.status === 'critical' || sc.calc.status === 'warning');
  const safeSubjects = subjectCalculations.filter(sc => sc.calc.safeBunks > 0);
  const allCoursesCompliant = subjectsBelowThreshold.length === 0;

  // Upcoming academic events sorted
  const upcomingEvents = state.events
    .filter(e => !e.completed)
    .slice(0, 4);

  // Recent notes
  const recentNotes = state.notes.slice(0, 4);

  const handleMarkSlot = (subjectId: string, timeSlot: string, status: AttendanceRecord['status']) => {
    markClassAttendance(subjectId, todayStr, timeSlot, status);
    const sub = state.subjects.find(s => s.id === subjectId);
    showToast(`Marked ${status.toUpperCase()} for ${sub?.code || 'class'} (${timeSlot})`, 'success');
  };

  const getSlotRecord = (subjectId: string, timeSlot: string) => {
    return state.attendanceRecords.find(
      r => r.subjectId === subjectId && r.date === todayStr && r.timeSlot === timeSlot
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E7E2]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2022]">
              Welcome back, {state.profile.name.split(' ')[0]}
            </h1>
            {allCoursesCompliant ? (
              <Badge variant="safe" className="font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7E34]" />
                All {state.subjects.length} Courses Meeting Critical Threshold
              </Badge>
            ) : (
              <Badge variant="critical" className="font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-[#D9381E]" />
                {subjectsBelowThreshold.length} of {state.subjects.length} Courses Below Critical Threshold
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#5A5E65] mt-1">
            {state.profile.university} • Semester {state.profile.semester} ({state.profile.section}) • Minimum Critical Threshold:{' '}
            <strong className="text-[#1E2022] font-semibold">{state.profile.defaultAttendanceThreshold || 75}% per course</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenQuickMarkModal}
            leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
          >
            Mark Today&apos;s Attendance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('bunk-planner')}
            leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-[#007FFF]" />}
          >
            Bunk Simulator
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('admin')}
            leftIcon={<RotateCcw className="w-3.5 h-3.5 text-[#848A94]" />}
            title="Open Admin Reset Console"
          >
            Admin Reset
          </Button>
        </div>
      </div>

      {/* Holiday / Replacement Day Notification if active */}
      {todayHoliday && (
        <div className="p-4 rounded-xl bg-[#FEF9E7] border border-[#FCEEC0] flex items-start gap-3">
          <CalendarIcon className="w-5 h-5 text-[#975A16] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-[#975A16]">
              University Holiday: {todayHoliday.name}
            </h4>
            <p className="text-xs text-[#5A5E65] mt-0.5">
              {todayHoliday.description || 'Classes are suspended today. Attendance counts will not be penalised.'}
            </p>
          </div>
        </div>
      )}

      {replacementDay && (
        <div className="p-4 rounded-xl bg-[#EBF5FF] border border-[#CCE5FF] flex items-start gap-3">
          <Clock className="w-5 h-5 text-[#007FFF] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-[#0066CC]">
              Replacement Schedule Active
            </h4>
            <p className="text-xs text-[#5A5E65] mt-0.5">
              Today follows the <strong>Day {replacementDay.operatesAsDayOfWeek} timetable</strong> ({replacementDay.reason}).
            </p>
          </div>
        </div>
      )}

      {/* Course-by-Course Attendance & Critical Thresholds Matrix */}
      <SubjectComplianceMatrix
        state={state}
        onNavigate={onNavigate}
        onOpenQuickMarkModal={onOpenQuickMarkModal}
      />

      {/* Semester Goals & Key Milestones Tracking Widget */}
      <SemesterGoalsWidget
        state={state}
        onNavigate={onNavigate}
      />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Today's Schedule & Quick Bunk Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule Panel */}
          <div className="bg-white p-5 rounded-xl border border-[#E8E7E2] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E7E2] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#1E2022] tracking-tight">
                  Today&apos;s Academic Schedule
                </h3>
                <p className="text-xs text-[#5A5E65]">
                  {todaySlots.length} {todaySlots.length === 1 ? 'class' : 'classes'} scheduled for today
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('timetable')}
              >
                Full Timetable
              </Button>
            </div>

            {todaySlots.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5A5E65] bg-[#FCFBF8] rounded-lg border border-dashed border-[#E8E7E2]">
                No lectures scheduled for today. Enjoy your study time!
              </div>
            ) : (
              <div className="space-y-2.5">
                {todaySlots.map((slot) => {
                  const subject = state.subjects.find(s => s.id === slot.subjectId);
                  const timeFormatted = `${slot.startTime} - ${slot.endTime}`;
                  const currentRecord = subject ? getSlotRecord(subject.id, timeFormatted) : null;
                  const isFacultyOnLeave = state.facultyLeaves.some(
                    fl => fl.facultyName === slot.faculty && fl.date === todayStr
                  );

                  return (
                    <div
                      key={slot.id}
                      className="p-3.5 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#D5D3CB] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="px-2.5 py-1.5 rounded-md bg-[#F4F3EE] border border-[#E8E7E2] text-[11px] font-mono font-semibold text-[#1E2022] shrink-0 text-center">
                          {slot.startTime}
                          <span className="block text-[9px] text-[#848A94] font-normal">{slot.type}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#1E2022]">
                              {subject ? subject.name : 'Unknown Subject'}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white border border-[#E8E7E2] text-[#5A5E65]">
                              {subject?.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#5A5E65] mt-1">
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3 text-[#848A94]" />
                              {slot.room}
                            </span>
                            <span>•</span>
                            <span>{slot.faculty}</span>
                          </div>
                          {isFacultyOnLeave && (
                            <span className="inline-block text-[10px] text-[#B7791F] font-medium mt-1 bg-[#FEF9E7] px-1.5 py-0.5 rounded border border-[#FCEEC0]">
                              ⚠️ Faculty marked on official leave
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Immediate Attendance Marking Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {currentRecord ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                currentRecord.status === 'present'
                                  ? 'safe'
                                  : currentRecord.status === 'absent'
                                  ? 'critical'
                                  : 'warning'
                              }
                              size="sm"
                            >
                              {currentRecord.status.toUpperCase()}
                            </Badge>
                            <button
                              onClick={() => handleMarkSlot(slot.subjectId, timeFormatted, currentRecord.status === 'present' ? 'absent' : 'present')}
                              className="text-[10px] text-[#007FFF] hover:underline"
                            >
                              Toggle
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleMarkSlot(slot.subjectId, timeFormatted, 'present')}
                              className="px-2.5 py-1 rounded bg-[#EBF7EE] text-[#1E7E34] hover:bg-[#D4EDDA] text-xs font-semibold border border-[#C3E6CB] transition-colors"
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMarkSlot(slot.subjectId, timeFormatted, 'absent')}
                              className="px-2.5 py-1 rounded bg-[#FFF1F0] text-[#D9381E] hover:bg-[#FFE4E1] text-xs font-semibold border border-[#FADBD8] transition-colors"
                            >
                              Absent
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Safe Bunks Snapshot */}
          <div className="bg-white p-5 rounded-xl border border-[#E8E7E2] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8E7E2] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#35A853]" />
                <h3 className="text-sm font-semibold text-[#1E2022] tracking-tight">
                  Safe Bunk Snapshot
                </h3>
              </div>
              <button
                onClick={() => onNavigate('bunk-planner')}
                className="text-xs font-semibold text-[#007FFF] hover:underline"
              >
                Open Calculator Simulator →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {safeSubjects.map(({ subject, calc }) => (
                <div
                  key={subject.id}
                  className="p-3 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#1E2022] truncate max-w-[160px]">
                      {subject.name}
                    </span>
                    <Badge variant="safe" size="sm">
                      {calc.safeBunks} safe {calc.safeBunks === 1 ? 'bunk' : 'bunks'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#5A5E65]">
                    <span>Current: <strong className="text-[#1E2022] font-mono">{calc.currentPercentage}%</strong></span>
                    <span>Goal: {subject.targetAttendance}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Events & Smart Notes */}
        <div className="space-y-6">
          {/* Upcoming Academic Deadlines & Exams */}
          <div className="bg-white p-5 rounded-xl border border-[#E8E7E2] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8E7E2] pb-3">
              <h3 className="text-sm font-semibold text-[#1E2022] tracking-tight">
                Upcoming Deadlines & Exams
              </h3>
              <button
                onClick={() => onNavigate('planner')}
                className="text-xs font-semibold text-[#007FFF] hover:underline"
              >
                Calendar →
              </button>
            </div>

            <div className="space-y-2.5">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-[#5A5E65] text-center py-4">No upcoming events listed.</p>
              ) : (
                upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#1E2022] truncate max-w-[180px]">
                        {ev.title}
                      </span>
                      <Badge
                        variant={ev.type === 'exam' ? 'critical' : ev.type === 'project' ? 'coral' : 'blue'}
                        size="sm"
                      >
                        {ev.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#5A5E65] flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[#848A94]" />
                      <span>{ev.date} {ev.time && `• ${ev.time}`}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Notes & Recent Files */}
          <div className="bg-white p-5 rounded-xl border border-[#E8E7E2] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8E7E2] pb-3">
              <h3 className="text-sm font-semibold text-[#1E2022] tracking-tight">
                Recent Smart Notes
              </h3>
              <button
                onClick={() => onNavigate('notes')}
                className="text-xs font-semibold text-[#007FFF] hover:underline"
              >
                All Files →
              </button>
            </div>

            <div className="space-y-2">
              {recentNotes.map((note) => {
                const sub = state.subjects.find(s => s.id === note.subjectId);
                return (
                  <div
                    key={note.id}
                    onClick={() => onNavigate('notes')}
                    className="p-2.5 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] hover:bg-[#F7F6F1] cursor-pointer transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#1E2022] truncate max-w-[180px]">
                        {note.title}
                      </span>
                      <span className="text-[10px] font-mono text-[#848A94] uppercase">
                        {note.fileType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#5A5E65]">
                      <span>{sub?.code || 'General'}</span>
                      <span>{note.createdAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
