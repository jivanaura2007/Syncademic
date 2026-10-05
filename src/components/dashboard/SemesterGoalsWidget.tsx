import React, { useState } from 'react';
import { 
  Target, 
  Flag, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Sliders, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  TrendingUp, 
  Award, 
  BookOpen, 
  FileText, 
  Layers, 
  Sparkles, 
  ChevronRight,
  ArrowRight,
  Calendar,
  Check
} from 'lucide-react';
import { AppState, Subject, SemesterMilestone, MilestoneCategory, MilestonePriority } from '../../types';
import { calculateSubjectAttendance } from '../../utils/attendanceMath';
import { 
  addSemesterMilestone, 
  toggleSemesterMilestone, 
  deleteSemesterMilestone, 
  setSubjectTarget, 
  setAllSubjectTargets 
} from '../../services/storage';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface SemesterGoalsWidgetProps {
  state: AppState;
  onNavigate?: (route: string) => void;
}

export const SemesterGoalsWidget: React.FC<SemesterGoalsWidgetProps> = ({ state, onNavigate }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'milestones' | 'targets' | 'roadmap'>('milestones');
  const [milestoneFilter, setMilestoneFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [isBulkTargetOpen, setIsBulkTargetOpen] = useState(false);
  const [bulkTargetValue, setBulkTargetValue] = useState<number>(75);

  // New Milestone Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MilestoneCategory>('exam');
  const [newTargetDate, setNewTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [newSubjectId, setNewSubjectId] = useState<string>('all');
  const [newMetric, setNewMetric] = useState('');
  const [newPriority, setNewPriority] = useState<MilestonePriority>('high');
  const [newNotes, setNewNotes] = useState('');

  const milestones: SemesterMilestone[] = state.semesterMilestones || [];
  const completedMilestones = milestones.filter(m => m.completed);
  const pendingMilestones = milestones.filter(m => !m.completed);
  const milestoneProgressPct = milestones.length > 0
    ? Math.round((completedMilestones.length / milestones.length) * 100)
    : 0;

  // Semester timeline calculations
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const startDate = state.semesterStartDate ? new Date(state.semesterStartDate) : new Date(today.getFullYear(), 0, 15);
  const endDate = state.semesterEndDate ? new Date(state.semesterEndDate) : new Date(today.getFullYear(), 4, 30);
  
  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(0, Math.min(totalDays, Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
  const semesterProgressPct = Math.round((daysElapsed / totalDays) * 100);
  const currentWeek = Math.max(1, Math.min(Math.ceil(totalDays / 7), Math.ceil(daysElapsed / 7)));
  const totalWeeks = Math.ceil(totalDays / 7);

  // Subject compliance metrics
  const subjectCalcs = state.subjects.map(s => {
    const calc = calculateSubjectAttendance(s);
    const target = s.targetAttendance || 75;
    const isMeetingTarget = calc.currentPercentage >= target;
    const diff = Math.round((calc.currentPercentage - target) * 10) / 10;
    return {
      subject: s,
      calc,
      target,
      isMeetingTarget,
      diff
    };
  });

  const subjectsOnTarget = subjectCalcs.filter(sc => sc.isMeetingTarget).length;
  const avgTargetAttendance = state.subjects.length > 0
    ? Math.round((state.subjects.reduce((sum, s) => sum + (s.targetAttendance || 75), 0) / state.subjects.length) * 10) / 10
    : 75;

  // Filtered milestones
  const filteredMilestones = milestones
    .filter(m => {
      if (milestoneFilter === 'pending') return !m.completed;
      if (milestoneFilter === 'completed') return m.completed;
      return true;
    })
    .sort((a, b) => {
      // Pending first, sorted by targetDate ascending; then completed
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.targetDate.localeCompare(b.targetDate);
    });

  const handleToggleMilestone = (id: string, title: string) => {
    toggleSemesterMilestone(id);
    const m = milestones.find(item => item.id === id);
    if (m) {
      if (!m.completed) {
        showToast(`Milestone achieved: "${title}"!`, 'success');
      } else {
        showToast(`Reopened milestone: "${title}"`, 'info');
      }
    }
  };

  const handleDeleteMilestone = (id: string, title: string) => {
    deleteSemesterMilestone(id);
    showToast(`Deleted milestone: "${title}"`, 'info');
  };

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Please provide a milestone title', 'error');
      return;
    }

    addSemesterMilestone({
      title: newTitle.trim(),
      category: newCategory,
      targetDate: newTargetDate,
      subjectId: newSubjectId === 'all' ? undefined : newSubjectId,
      targetMetric: newMetric.trim() || undefined,
      priority: newPriority,
      completed: false,
      notes: newNotes.trim() || undefined
    });

    showToast(`Added milestone: "${newTitle.trim()}"`, 'success');
    setNewTitle('');
    setNewMetric('');
    setNewNotes('');
    setIsAddMilestoneOpen(false);
  };

  const handleUpdateSubjectTarget = (subjectId: string, targetVal: number, subjectName: string) => {
    const clamped = Math.max(50, Math.min(100, targetVal));
    setSubjectTarget(subjectId, clamped);
    showToast(`Updated ${subjectName} target to ${clamped}%`, 'success');
  };

  const handleUpdateSubjectGrade = (subjectId: string, grade: string) => {
    const currentSubject = state.subjects.find(s => s.id === subjectId);
    if (currentSubject) {
      setSubjectTarget(subjectId, currentSubject.targetAttendance || 75, grade);
      showToast(`Target grade set to ${grade} for ${currentSubject.code}`, 'success');
    }
  };

  const handleApplyBulkTarget = () => {
    setAllSubjectTargets(bulkTargetValue);
    setIsBulkTargetOpen(false);
    showToast(`All subject targets updated to ${bulkTargetValue}%`, 'success');
  };

  const getCategoryIcon = (category: MilestoneCategory) => {
    switch (category) {
      case 'exam':
        return <BookOpen className="w-3.5 h-3.5 text-[#007FFF]" />;
      case 'project':
        return <Layers className="w-3.5 h-3.5 text-[#8E44AD]" />;
      case 'assignment':
        return <FileText className="w-3.5 h-3.5 text-[#E67E22]" />;
      case 'attendance':
        return <ShieldCheck className="w-3.5 h-3.5 text-[#35A853]" />;
      case 'academic':
        return <Award className="w-3.5 h-3.5 text-[#F4C430]" />;
      default:
        return <Flag className="w-3.5 h-3.5 text-[#5A5E65]" />;
    }
  };

  const formatDaysRemaining = (targetDateStr: string, isCompleted: boolean) => {
    if (isCompleted) return 'Completed';
    const target = new Date(targetDateStr);
    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays > 1) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)}d overdue`;
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8E7E2] overflow-hidden shadow-xs">
      {/* Widget Header */}
      <div className="p-5 border-b border-[#E8E7E2] bg-[#FCFBF8]/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EBF5FF] border border-[#CCE5FF] flex items-center justify-center text-[#007FFF]">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1E2022] tracking-tight">
                  Semester Goals & Academic Milestones
                </h2>
                <div className="flex items-center gap-2 text-xs text-[#5A5E65] mt-0.5">
                  <span>Semester {state.profile.semester || 4} Roadmap</span>
                  <span aria-hidden="true">·</span>
                  <span>{subjectsOnTarget} of {state.subjects.length} subjects on target</span>
                  <span aria-hidden="true">·</span>
                  <span>{completedMilestones.length} of {milestones.length} milestones reached</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkTargetOpen(true)}
              leftIcon={<Sliders className="w-3.5 h-3.5 text-[#5A5E65]" />}
            >
              Batch Targets
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddMilestoneOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Milestone
            </Button>
          </div>
        </div>

        {/* Semester Telemetry Barometer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#E8E7E2]/70">
          {/* Milestone Progress */}
          <div className="p-3 rounded-lg bg-white border border-[#E8E7E2] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#5A5E65] block">Milestone Completion</span>
              <span className="text-lg font-bold font-mono text-[#1E2022]">
                {completedMilestones.length} <span className="text-xs font-normal text-[#848A94]">/ {milestones.length}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-[#007FFF] font-mono">{milestoneProgressPct}%</span>
              <div className="w-16 h-1.5 bg-[#F4F3EE] rounded-full overflow-hidden mt-1.5">
                <div 
                  className="h-full bg-[#007FFF] rounded-full transition-all duration-300"
                  style={{ width: `${milestoneProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Subject Target Compliance */}
          <div className="p-3 rounded-lg bg-white border border-[#E8E7E2] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#5A5E65] block">Subject Targets Met</span>
              <span className="text-lg font-bold font-mono text-[#1E2022]">
                {subjectsOnTarget} <span className="text-xs font-normal text-[#848A94]">/ {state.subjects.length}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold font-mono text-[#35A853]">
                {state.subjects.length > 0 ? Math.round((subjectsOnTarget / state.subjects.length) * 100) : 0}%
              </span>
              <div className="w-16 h-1.5 bg-[#F4F3EE] rounded-full overflow-hidden mt-1.5">
                <div 
                  className="h-full bg-[#35A853] rounded-full transition-all duration-300"
                  style={{ width: `${state.subjects.length > 0 ? (subjectsOnTarget / state.subjects.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Semester Timeline */}
          <div className="p-3 rounded-lg bg-white border border-[#E8E7E2] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#5A5E65] block">Semester Timeline</span>
              <span className="text-sm font-semibold text-[#1E2022]">
                Week {currentWeek} <span className="text-xs text-[#848A94]">of {totalWeeks}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-medium text-[#5A5E65]">{semesterProgressPct}% elapsed</span>
              <div className="w-16 h-1.5 bg-[#F4F3EE] rounded-full overflow-hidden mt-1.5">
                <div 
                  className="h-full bg-[#1E2022] rounded-full transition-all duration-300"
                  style={{ width: `${semesterProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Control Navigation Tabs */}
      <div className="px-5 pt-3 border-b border-[#E8E7E2] flex items-center justify-between bg-white">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'milestones'
                ? 'border-[#007FFF] text-[#007FFF]'
                : 'border-transparent text-[#5A5E65] hover:text-[#1E2022]'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            Key Milestones ({pendingMilestones.length} pending)
          </button>
          <button
            onClick={() => setActiveTab('targets')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'targets'
                ? 'border-[#007FFF] text-[#007FFF]'
                : 'border-transparent text-[#5A5E65] hover:text-[#1E2022]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Course Critical Thresholds ({subjectsOnTarget}/{state.subjects.length} Safe)
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'roadmap'
                ? 'border-[#007FFF] text-[#007FFF]'
                : 'border-transparent text-[#5A5E65] hover:text-[#1E2022]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Semester Roadmap & Trajectory
          </button>
        </div>

        {activeTab === 'milestones' && (
          <div className="hidden sm:flex items-center gap-1 p-1 bg-[#F4F3EE] rounded-lg text-xs">
            <button
              onClick={() => setMilestoneFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                milestoneFilter === 'all' ? 'bg-white text-[#1E2022] shadow-xs' : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              All ({milestones.length})
            </button>
            <button
              onClick={() => setMilestoneFilter('pending')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                milestoneFilter === 'pending' ? 'bg-white text-[#1E2022] shadow-xs' : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              Pending ({pendingMilestones.length})
            </button>
            <button
              onClick={() => setMilestoneFilter('completed')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                milestoneFilter === 'completed' ? 'bg-white text-[#1E2022] shadow-xs' : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              Achieved ({completedMilestones.length})
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Key Academic Milestones */}
      {activeTab === 'milestones' && (
        <div className="p-5 space-y-3">
          {filteredMilestones.length === 0 ? (
            <div className="text-center py-10 bg-[#FCFBF8] rounded-xl border border-dashed border-[#E8E7E2] space-y-2">
              <Flag className="w-8 h-8 text-[#848A94] mx-auto opacity-50" />
              <p className="text-xs font-semibold text-[#1E2022]">No academic milestones found</p>
              <p className="text-xs text-[#5A5E65] max-w-sm mx-auto">
                {milestoneFilter === 'all'
                  ? 'Set your first academic milestone for mid-terms, submissions, or attendance checkpoints.'
                  : `No ${milestoneFilter} milestones at this time.`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddMilestoneOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="mt-2"
              >
                Create Milestone
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredMilestones.map((m) => {
                const sub = m.subjectId ? state.subjects.find(s => s.id === m.subjectId) : null;
                const daysStatus = formatDaysRemaining(m.targetDate, m.completed);
                const isOverdue = !m.completed && new Date(m.targetDate).getTime() < today.getTime() && daysStatus.includes('overdue');

                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      m.completed
                        ? 'bg-[#F9FAF9] border-[#E2EBE2] opacity-80'
                        : isOverdue
                        ? 'bg-[#FFF8F7] border-[#FADBD8]'
                        : 'bg-[#FCFBF8] border-[#E8E7E2] hover:border-[#D1D0C9]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleMilestone(m.id, m.title)}
                        className={`mt-0.5 shrink-0 transition-colors focus-visible:outline-hidden ${
                          m.completed
                            ? 'text-[#35A853]'
                            : 'text-[#848A94] hover:text-[#007FFF]'
                        }`}
                        title={m.completed ? 'Mark uncompleted' : 'Mark completed'}
                      >
                        {m.completed ? (
                          <CheckCircle2 className="w-5 h-5 fill-[#35A853]/10" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-semibold ${
                              m.completed ? 'line-through text-[#848A94]' : 'text-[#1E2022]'
                            }`}
                          >
                            {m.title}
                          </span>
                          {m.priority === 'high' && !m.completed && (
                            <span className="text-[10px] font-semibold text-[#D9381E] bg-[#FFF1F0] px-1.5 py-0.2 rounded border border-[#FADBD8]">
                              High Priority
                            </span>
                          )}
                        </div>

                        {/* Unboxed Metadata with Typographic Separators */}
                        <div className="flex items-center gap-2 text-[11px] text-[#5A5E65] flex-wrap">
                          <span className="flex items-center gap-1 capitalize">
                            {getCategoryIcon(m.category)}
                            <span>{m.category}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          {sub && (
                            <>
                              <span className="font-medium text-[#1E2022]">{sub.code}</span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#848A94]" />
                            <span>{m.targetDate}</span>
                          </span>
                          {m.targetMetric && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-[#007FFF]">{m.targetMetric}</span>
                            </>
                          )}
                        </div>

                        {m.notes && (
                          <p className="text-[11px] text-[#848A94] italic mt-0.5 line-clamp-1">
                            {m.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-sm ${
                          m.completed
                            ? 'text-[#35A853] bg-[#EBF7EE]'
                            : isOverdue
                            ? 'text-[#D9381E] bg-[#FFF1F0] font-semibold'
                            : 'text-[#5A5E65] bg-[#F4F3EE]'
                        }`}
                      >
                        {daysStatus}
                      </span>
                      <button
                        onClick={() => handleDeleteMilestone(m.id, m.title)}
                        className="text-[#848A94] hover:text-[#D9381E] p-1 rounded transition-colors"
                        title="Delete milestone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Subject Custom Targets */}
      {activeTab === 'targets' && (
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-[#FCFBF8] border border-[#E8E7E2]">
            <div className="text-xs text-[#5A5E65]">
              <span className="font-semibold text-[#1E2022]">Mandatory Course-by-Course Thresholds: </span>
              Attendance is evaluated per course, not overall. Each subject must satisfy its critical threshold (minimum 75%) to qualify for exams. Customizing course targets recalibrates your bunk simulator and recovery warnings in real time.
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-[#848A94]">Quick Presets:</span>
              <button
                onClick={() => setAllSubjectTargets(75)}
                className="px-2 py-0.5 text-[11px] font-medium rounded bg-white border border-[#E8E7E2] hover:bg-[#F4F3EE] text-[#1E2022]"
              >
                75%
              </button>
              <button
                onClick={() => setAllSubjectTargets(80)}
                className="px-2 py-0.5 text-[11px] font-medium rounded bg-white border border-[#E8E7E2] hover:bg-[#F4F3EE] text-[#007FFF]"
              >
                80%
              </button>
              <button
                onClick={() => setAllSubjectTargets(85)}
                className="px-2 py-0.5 text-[11px] font-medium rounded bg-white border border-[#E8E7E2] hover:bg-[#F4F3EE] text-[#35A853]"
              >
                85%
              </button>
              <button
                onClick={() => setAllSubjectTargets(90)}
                className="px-2 py-0.5 text-[11px] font-medium rounded bg-white border border-[#E8E7E2] hover:bg-[#F4F3EE] text-[#8E44AD]"
              >
                90%
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectCalcs.map(({ subject, calc, target, isMeetingTarget, diff }) => {
              return (
                <div
                  key={subject.id}
                  className="p-4 rounded-xl border border-[#E8E7E2] bg-[#FCFBF8] hover:border-[#D1D0C9] transition-all space-y-3"
                >
                  {/* Subject Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: subject.color || '#007FFF' }}
                        />
                        <h4 className="text-xs font-bold text-[#1E2022] truncate max-w-[180px]">
                          {subject.name}
                        </h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white border border-[#E8E7E2] text-[#5A5E65]">
                          {subject.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5A5E65] mt-0.5">
                        {subject.faculty} · {subject.credits} Credits
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold font-mono text-[#1E2022]">
                        {calc.currentPercentage}%
                      </span>
                      <span className="text-[10px] text-[#848A94] block">
                        {subject.attendedClasses} / {subject.totalClasses} classes
                      </span>
                    </div>
                  </div>

                  {/* Dual-Progress Gauge with Target Marker */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#5A5E65]">
                        Attendance Status
                      </span>
                      <span
                        className={`font-semibold font-mono ${
                          isMeetingTarget ? 'text-[#35A853]' : 'text-[#D9381E]'
                        }`}
                      >
                        {isMeetingTarget
                          ? `+${diff}% above target`
                          : `${diff}% below target`}
                      </span>
                    </div>

                    <div className="relative w-full h-2.5 bg-[#F4F3EE] rounded-full overflow-hidden">
                      {/* Current Percentage Bar */}
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isMeetingTarget ? 'bg-[#35A853]' : 'bg-[#D9381E]'
                        }`}
                        style={{ width: `${Math.min(100, calc.currentPercentage)}%` }}
                      />
                      {/* Custom Target Pin Marker */}
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-[#1E2022] z-10 -ml-0.5 shadow-xs"
                        style={{ left: `${Math.min(100, target)}%` }}
                        title={`Target: ${target}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#848A94]">
                      <span>0%</span>
                      <span className="font-semibold text-[#1E2022]">Target: {target}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Custom Target Setter Controls */}
                  <div className="pt-2 border-t border-[#E8E7E2] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1E2022]">Custom Target:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateSubjectTarget(subject.id, target - 5, subject.name)}
                          className="w-6 h-6 rounded bg-white border border-[#E8E7E2] text-xs font-bold text-[#5A5E65] hover:bg-[#F4F3EE] flex items-center justify-center"
                          title="Decrease target by 5%"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold text-[#007FFF] w-10 text-center">
                          {target}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSubjectTarget(subject.id, target + 5, subject.name)}
                          className="w-6 h-6 rounded bg-white border border-[#E8E7E2] text-xs font-bold text-[#5A5E65] hover:bg-[#F4F3EE] flex items-center justify-center"
                          title="Increase target by 5%"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Quick Preset Chips & Optional Grade Target */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1">
                        {[75, 80, 85, 90].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleUpdateSubjectTarget(subject.id, preset, subject.name)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              target === preset
                                ? 'bg-[#007FFF] text-white font-semibold'
                                : 'bg-white border border-[#E8E7E2] text-[#5A5E65] hover:border-[#D1D0C9]'
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#848A94]">Goal:</span>
                        <select
                          value={subject.targetGrade || 'A'}
                          onChange={(e) => handleUpdateSubjectGrade(subject.id, e.target.value)}
                          className="text-[10px] font-semibold bg-white border border-[#E8E7E2] rounded px-1.5 py-0.5 text-[#1E2022] focus-visible:outline-hidden"
                        >
                          <option value="O / A+">Grade O / A+</option>
                          <option value="A">Grade A</option>
                          <option value="B+">Grade B+</option>
                          <option value="B">Grade B</option>
                          <option value="Pass">Pass Only</option>
                        </select>
                      </div>
                    </div>

                    {/* Actionable Feedback Summary */}
                    <div className="text-[11px] pt-1">
                      {isMeetingTarget ? (
                        <p className="text-[#35A853] flex items-center gap-1 font-medium">
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {calc.safeBunks > 0 
                              ? `You can safely miss ${calc.safeBunks} ${calc.safeBunks === 1 ? 'class' : 'classes'} and stay at or above ${target}%.` 
                              : `Exact match: Attend upcoming classes to prevent falling below ${target}%.`}
                          </span>
                        </p>
                      ) : (
                        <p className="text-[#D9381E] flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Must attend next {calc.classesNeededToRecover} consecutive {calc.classesNeededToRecover === 1 ? 'class' : 'classes'} to reach {target}%.
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Semester Roadmap & Trajectory */}
      {activeTab === 'roadmap' && (
        <div className="p-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] space-y-3">
            <h4 className="text-xs font-bold text-[#1E2022] uppercase tracking-wider">
              Chronological Semester Timeline
            </h4>
            <p className="text-xs text-[#5A5E65]">
              Track your trajectory across the semester horizon. Checkpoints are automatically synced with your calendar events, exams, and attendance targets.
            </p>

            <div className="relative pl-6 space-y-6 pt-2 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E8E7E2]">
              {milestones.map((m, idx) => {
                const isPassed = new Date(m.targetDate).getTime() < today.getTime();
                return (
                  <div key={m.id} className="relative flex items-start gap-3">
                    {/* Timeline Node */}
                    <div 
                      className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-colors ${
                        m.completed 
                          ? 'border-[#35A853] text-[#35A853]' 
                          : isPassed 
                          ? 'border-[#D9381E] text-[#D9381E]' 
                          : 'border-[#007FFF] text-[#007FFF]'
                      }`}
                    >
                      {m.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1 bg-white p-3 rounded-lg border border-[#E8E7E2] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${m.completed ? 'line-through text-[#848A94]' : 'text-[#1E2022]'}`}>
                          {m.title}
                        </span>
                        <span className="text-[10px] font-mono text-[#5A5E65]">
                          {m.targetDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#5A5E65]">
                        <span className="capitalize">{m.category}</span>
                        {m.targetMetric && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[#007FFF]">{m.targetMetric}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className={m.completed ? 'text-[#35A853]' : isPassed ? 'text-[#D9381E]' : 'text-[#5A5E65]'}>
                          {m.completed ? 'Achieved' : isPassed ? 'Overdue' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      <Modal
        isOpen={isAddMilestoneOpen}
        onClose={() => setIsAddMilestoneOpen(false)}
        title="Add Academic Milestone"
        subtitle="Track an exam, major project, attendance checkpoint, or target grade"
        maxWidth="md"
      >
        <form onSubmit={handleCreateMilestone} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1E2022]">Milestone Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Operating Systems Mid-Term Theory Exam"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] focus:border-[#007FFF] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1E2022]">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MilestoneCategory)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-white focus:border-[#007FFF] focus:outline-hidden"
              >
                <option value="exam">Examination / Viva</option>
                <option value="project">Project / Prototype</option>
                <option value="assignment">Assignment / Problem Set</option>
                <option value="attendance">Attendance Checkpoint</option>
                <option value="academic">Academic / SGPA Goal</option>
                <option value="other">Other Academic Milestone</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1E2022]">Target Date *</label>
              <input
                type="date"
                required
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-white focus:border-[#007FFF] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1E2022]">Associated Subject</label>
              <select
                value={newSubjectId}
                onChange={(e) => setNewSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-white focus:border-[#007FFF] focus:outline-hidden"
              >
                <option value="all">General / All Subjects</option>
                {state.subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1E2022]">Target Metric / Benchmark</label>
              <input
                type="text"
                placeholder="e.g. >= 80% Attendance or Grade A"
                value={newMetric}
                onChange={(e) => setNewMetric(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] focus:border-[#007FFF] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1E2022]">Priority</label>
            <div className="flex items-center gap-3">
              {(['high', 'medium', 'low'] as MilestonePriority[]).map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-xs text-[#5A5E65] cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    checked={newPriority === p}
                    onChange={() => setNewPriority(p)}
                    className="text-[#007FFF]"
                  />
                  <span className="capitalize">{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1E2022]">Preparation Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Focus on Units 1 & 2; verify lab manual signatures."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] focus:border-[#007FFF] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E7E2]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddMilestoneOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Save Milestone
            </Button>
          </div>
        </form>
      </Modal>

      {/* Batch Targets Modal */}
      <Modal
        isOpen={isBulkTargetOpen}
        onClose={() => setIsBulkTargetOpen(false)}
        title="Batch Set Subject Attendance Targets"
        subtitle="Apply a uniform attendance target percentage across all enrolled subjects"
        maxWidth="sm"
      >
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#5A5E65]">
            Choose a standard target or configure a custom percentage. This will update the attendance threshold and recalculate your safe bunks for every subject.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { val: 75, label: '75% Statutory Minimum', desc: 'Standard university requirement' },
              { val: 80, label: '80% Safety Buffer', desc: 'Recommended safety cushion' },
              { val: 85, label: '85% Distinction', desc: 'Higher scholarship tier' },
              { val: 90, label: '90% High Honors', desc: 'Strict attendance honors' },
            ].map(item => (
              <button
                key={item.val}
                type="button"
                onClick={() => setBulkTargetValue(item.val)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  bulkTargetValue === item.val
                    ? 'border-[#007FFF] bg-[#EBF5FF]'
                    : 'border-[#E8E7E2] bg-white hover:border-[#D1D0C9]'
                }`}
              >
                <span className="text-xs font-bold text-[#1E2022] block">{item.label}</span>
                <span className="text-[10px] text-[#5A5E65] block mt-0.5">{item.desc}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1E2022]">Custom Value:</span>
              <span className="font-mono font-bold text-[#007FFF]">{bulkTargetValue}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={bulkTargetValue}
              onChange={(e) => setBulkTargetValue(Number(e.target.value))}
              className="w-full accent-[#007FFF]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E7E2]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkTargetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApplyBulkTarget}
            >
              Apply to All {state.subjects.length} Subjects
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
