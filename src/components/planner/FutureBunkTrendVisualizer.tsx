import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Flame,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  ChevronRight,
  Filter,
  Layers,
  ArrowRight,
  Sun,
  Coffee,
  CalendarDays
} from 'lucide-react';
import { AppState, Subject, TimetableSlot, DayOfWeek } from '../../types';
import { calculateSubjectAttendance, calculateOverallAttendance } from '../../utils/attendanceMath';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface FutureClassInstance {
  id: string;
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Wed, Aug 26"
  shortDate: string; // e.g. "Aug 26"
  dayOfWeek: DayOfWeek;
  dayName: string;
  slotId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectColor?: string;
  timeSlot: string;
  room: string;
  faculty: string;
  type: 'lecture' | 'lab' | 'tutorial';
}

interface FutureBunkTrendVisualizerProps {
  state: AppState;
  selectedSubjectId?: string;
  onSubjectChange?: (subjectId: string) => void;
}

export const FutureBunkTrendVisualizer: React.FC<FutureBunkTrendVisualizerProps> = ({
  state,
  selectedSubjectId: externalSubjectId,
  onSubjectChange
}) => {
  // Bunked instances state (Set of instance IDs)
  const [bunkedIds, setBunkedIds] = useState<Set<string>>(new Set());
  // Default to single subject focus because university requirements are strictly evaluated per course
  const [viewScope, setViewScope] = useState<'overall' | 'single'>('single');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    externalSubjectId || state.subjects[0]?.id || ''
  );
  const [timeRange, setTimeRange] = useState<'2weeks' | '4weeks' | 'semester'>('4weeks');
  const [activeDateFilter, setActiveDateFilter] = useState<string | 'all'>('all');

  // Sync external subject selection if provided
  const currentSubjectId = externalSubjectId || selectedSubjectId;
  const currentSubject = state.subjects.find(s => s.id === currentSubjectId) || state.subjects[0];

  // Today reference date (using metadata 2026-08-25 or current system time)
  const baseDate = useMemo(() => {
    // Current date reference
    return new Date('2026-08-26T00:00:00');
  }, []);

  const semesterEnd = useMemo(() => {
    if (state.semesterEndDate) {
      const end = new Date(state.semesterEndDate + 'T23:59:59');
      if (!isNaN(end.getTime())) return end;
    }
    // Default fallback to 12 weeks ahead
    const fallback = new Date(baseDate);
    fallback.setDate(fallback.getDate() + 84);
    return fallback;
  }, [state.semesterEndDate, baseDate]);

  // Generate future scheduled classes based on timetable, holidays, and replacement days
  const futureClasses = useMemo<FutureClassInstance[]>(() => {
    const list: FutureClassInstance[] = [];
    const subjectsMap = new Map<string, Subject>(state.subjects.map(s => [s.id, s]));

    // Map holidays for rapid lookup
    const holidayDates = new Set(state.holidays.map(h => h.date));
    const replacementMap = new Map<string, DayOfWeek>(
      state.replacementDays.map(r => [r.date, r.operatesAsDayOfWeek])
    );

    // Fallback slots generator if user hasn't defined timetable yet
    const effectiveSlots: TimetableSlot[] = (state.timetable && state.timetable.length > 0)
      ? state.timetable
      : state.subjects.flatMap((sub, subIdx) => {
          // Create a realistic default timetable distribution
          const days: DayOfWeek[] = [1, 2, 3, 4, 5];
          return days.map(d => ({
            id: `fallback-${sub.id}-${d}`,
            dayOfWeek: d,
            startTime: `${9 + (subIdx % 4)}:00`,
            endTime: `${10 + (subIdx % 4)}:00`,
            subjectId: sub.id,
            room: sub.room || 'Room 302',
            faculty: sub.faculty || 'Dept Faculty',
            type: 'lecture' as const
          }));
        });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxDays = timeRange === '2weeks' ? 14 : timeRange === '4weeks' ? 30 : 95;

    const curr = new Date(baseDate);
    let daysIterated = 0;

    while (curr <= semesterEnd && daysIterated < maxDays) {
      const dateStr = curr.toISOString().split('T')[0];
      const jsDay = curr.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

      // Skip Sundays unless replacement day
      if (jsDay !== 0 && !holidayDates.has(dateStr)) {
        const activeDayOfWeek = (replacementMap.get(dateStr) || jsDay) as DayOfWeek;
        const matchingSlots = effectiveSlots.filter(s => s.dayOfWeek === activeDayOfWeek);

        // Sort by start time
        matchingSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

        for (const slot of matchingSlots) {
          const sub = subjectsMap.get(slot.subjectId);
          if (sub) {
            const displayDate = curr.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
            const shortDate = curr.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });

            list.push({
              id: `${dateStr}_${slot.id}`,
              date: dateStr,
              displayDate,
              shortDate,
              dayOfWeek: activeDayOfWeek,
              dayName: dayNames[activeDayOfWeek] || 'Day',
              slotId: slot.id,
              subjectId: sub.id,
              subjectName: sub.name,
              subjectCode: sub.code,
              subjectColor: sub.color,
              timeSlot: `${slot.startTime} - ${slot.endTime}`,
              room: slot.room || sub.room || 'L-101',
              faculty: slot.faculty || sub.faculty || 'Professor',
              type: slot.type || 'lecture'
            });
          }
        }
      }

      curr.setDate(curr.getDate() + 1);
      daysIterated++;
    }

    return list;
  }, [state.timetable, state.subjects, state.holidays, state.replacementDays, baseDate, semesterEnd, timeRange]);

  // Unique scheduled dates for the interactive date picker
  const scheduledDates = useMemo(() => {
    const datesMap = new Map<string, { date: string; displayDate: string; count: number }>();
    futureClasses.forEach(c => {
      const existing = datesMap.get(c.date);
      if (existing) {
        existing.count++;
      } else {
        datesMap.set(c.date, { date: c.date, displayDate: c.displayDate, count: 1 });
      }
    });
    return Array.from(datesMap.values());
  }, [futureClasses]);

  // Toggle individual class bunk state
  const handleToggleBunk = (instanceId: string) => {
    setBunkedIds(prev => {
      const next = new Set(prev);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  };

  // Preset: Bunk all classes on a specific date
  const handleBunkEntireDate = (dateStr: string) => {
    const classesOnDate = futureClasses.filter(c => c.date === dateStr);
    setBunkedIds(prev => {
      const next = new Set(prev);
      const allBunked = classesOnDate.every(c => next.has(c.id));
      if (allBunked) {
        // Toggle off
        classesOnDate.forEach(c => next.delete(c.id));
      } else {
        // Toggle on
        classesOnDate.forEach(c => next.add(c.id));
      }
      return next;
    });
  };

  // Preset: Quick Scenarios
  const handleApplyPreset = (preset: 'nextFriday' | 'longWeekend' | 'singleSubject' | 'clear') => {
    if (preset === 'clear') {
      setBunkedIds(new Set());
      return;
    }

    if (preset === 'nextFriday') {
      const fridayClasses = futureClasses.filter(c => c.dayOfWeek === 5).slice(0, 4);
      setBunkedIds(new Set(fridayClasses.map(c => c.id)));
    } else if (preset === 'longWeekend') {
      // Bunk next Friday (5) and subsequent Monday (1)
      const fridayClasses = futureClasses.filter(c => c.dayOfWeek === 5).slice(0, 4);
      const mondayClasses = futureClasses.filter(c => c.dayOfWeek === 1).slice(0, 4);
      setBunkedIds(new Set([...fridayClasses, ...mondayClasses].map(c => c.id)));
    } else if (preset === 'singleSubject' && currentSubject) {
      const targetClasses = futureClasses.filter(c => c.subjectId === currentSubject.id).slice(0, 3);
      setBunkedIds(new Set(targetClasses.map(c => c.id)));
    }
  };

  // Compute chronological simulation data points for Recharts
  const chartData = useMemo(() => {
    // Current starting state
    const overallStats = calculateOverallAttendance(state.subjects);
    const initialTotalConducted = overallStats.totalConducted || 1;
    const initialTotalAttended = overallStats.totalAttended || 1;

    // Map subject initial status
    const subjectStateMap = new Map<string, { attended: number; total: number; target: number; name: string; code: string }>();
    state.subjects.forEach(s => {
      subjectStateMap.set(s.id, {
        attended: s.attendedClasses,
        total: s.totalClasses,
        target: s.targetAttendance || 75,
        name: s.name,
        code: s.code
      });
    });

    let runningSimAttended = initialTotalAttended;
    let runningSimTotal = initialTotalConducted;

    let runningBaselineAttended = initialTotalAttended;
    let runningBaselineTotal = initialTotalConducted;

    // Track per-subject running totals for single subject view
    const runningSubjectSim = new Map<string, { attended: number; total: number }>();
    const runningSubjectBaseline = new Map<string, { attended: number; total: number }>();
    state.subjects.forEach(s => {
      runningSubjectSim.set(s.id, { attended: s.attendedClasses, total: s.totalClasses });
      runningSubjectBaseline.set(s.id, { attended: s.attendedClasses, total: s.totalClasses });
    });

    const initialOverallPct = Math.round((initialTotalAttended / initialTotalConducted) * 1000) / 10;
    const initialSubjectPct = currentSubject
      ? Math.round((currentSubject.attendedClasses / (currentSubject.totalClasses || 1)) * 1000) / 10
      : initialOverallPct;

    // Start with Day 0 baseline point
    const points: any[] = [
      {
        id: 'start-point',
        date: 'Today',
        shortDate: 'Today',
        fullLabel: 'Current Status',
        simulatedPct: viewScope === 'overall' ? initialOverallPct : initialSubjectPct,
        baselinePct: viewScope === 'overall' ? initialOverallPct : initialSubjectPct,
        threshold: viewScope === 'overall' ? 75 : (currentSubject?.targetAttendance || 75),
        isBunked: false,
        action: 'Current',
        className: 'Start',
        delta: 0,
        bunkedCountSoFar: 0
      }
    ];

    let bunkCount = 0;

    // Iterate through every chronological future class instance
    futureClasses.forEach((inst, index) => {
      const isBunked = bunkedIds.has(inst.id);

      // Baseline scenario (assumes 100% attendance of upcoming classes)
      runningBaselineTotal += 1;
      runningBaselineAttended += 1;

      const subBaseline = runningSubjectBaseline.get(inst.subjectId);
      if (subBaseline) {
        subBaseline.total += 1;
        subBaseline.attended += 1;
      }

      // Simulated scenario with user bunk choices
      runningSimTotal += 1;
      const subSim = runningSubjectSim.get(inst.subjectId);

      if (isBunked) {
        bunkCount++;
        // No increase in attended classes
        if (subSim) {
          subSim.total += 1;
        }
      } else {
        runningSimAttended += 1;
        if (subSim) {
          subSim.total += 1;
          subSim.attended += 1;
        }
      }

      const overallSimPct = Math.round((runningSimAttended / runningSimTotal) * 1000) / 10;
      const overallBasePct = Math.round((runningBaselineAttended / runningBaselineTotal) * 1000) / 10;

      let subSimPct = overallSimPct;
      let subBasePct = overallBasePct;
      if (currentSubject) {
        const sSim = runningSubjectSim.get(currentSubject.id);
        const sBase = runningSubjectBaseline.get(currentSubject.id);
        if (sSim && sSim.total > 0) {
          subSimPct = Math.round((sSim.attended / sSim.total) * 1000) / 10;
        }
        if (sBase && sBase.total > 0) {
          subBasePct = Math.round((sBase.attended / sBase.total) * 1000) / 10;
        }
      }

      const activeSimPct = viewScope === 'overall' ? overallSimPct : subSimPct;
      const activeBasePct = viewScope === 'overall' ? overallBasePct : subBasePct;
      const targetThreshold = viewScope === 'overall' ? 75 : (currentSubject?.targetAttendance || 75);

      // We only emit points when either a bunk occurs or on major daily checkpoints to keep chart legible
      const isFilterMatch = viewScope === 'overall' || inst.subjectId === currentSubjectId;

      if (isFilterMatch) {
        points.push({
          id: inst.id,
          date: inst.date,
          shortDate: inst.shortDate,
          fullLabel: `${inst.displayDate} • ${inst.timeSlot}`,
          simulatedPct: activeSimPct,
          baselinePct: activeBasePct,
          threshold: targetThreshold,
          isBunked,
          action: isBunked ? 'Bunked' : 'Attended',
          className: `${inst.subjectCode} (${inst.timeSlot})`,
          subjectName: inst.subjectName,
          subjectCode: inst.subjectCode,
          delta: Math.round((activeSimPct - activeBasePct) * 10) / 10,
          bunkedCountSoFar: bunkCount,
          isBelowThreshold: activeSimPct < targetThreshold
        });
      }
    });

    return points;
  }, [state.subjects, futureClasses, bunkedIds, viewScope, currentSubject, currentSubjectId]);

  // Overall impact calculation
  const impactSummary = useMemo(() => {
    const currentOverall = calculateOverallAttendance(state.subjects);
    const lastPoint = chartData[chartData.length - 1] || chartData[0];
    const finalSimPct = lastPoint?.simulatedPct ?? currentOverall.overallPercentage;
    const finalBasePct = lastPoint?.baselinePct ?? currentOverall.overallPercentage;
    const threshold = viewScope === 'overall' ? 75 : (currentSubject?.targetAttendance || 75);

    const netChangeFromCurrent = Math.round((finalSimPct - (viewScope === 'overall' ? currentOverall.overallPercentage : (currentSubject ? (currentSubject.attendedClasses / (currentSubject.totalClasses || 1)) * 100 : 75))) * 10) / 10;
    const netDropFromBaseline = Math.round((finalSimPct - finalBasePct) * 10) / 10;
    const marginOfSafety = Math.round((finalSimPct - threshold) * 10) / 10;

    const isSafe = finalSimPct >= threshold;
    const isWarning = finalSimPct < threshold && finalSimPct >= threshold - 3;
    const isCritical = finalSimPct < threshold - 3;

    // Filter future classes if in single subject view
    const relevantBunkedClasses = futureClasses.filter(c => 
      bunkedIds.has(c.id) && (viewScope === 'overall' || c.subjectId === currentSubjectId)
    );

    return {
      currentPct: viewScope === 'overall' ? currentOverall.overallPercentage : (currentSubject ? Math.round((currentSubject.attendedClasses / (currentSubject.totalClasses || 1)) * 1000) / 10 : 75),
      finalSimPct,
      finalBasePct,
      netChangeFromCurrent,
      netDropFromBaseline,
      marginOfSafety,
      threshold,
      isSafe,
      isWarning,
      isCritical,
      totalBunkedCount: relevantBunkedClasses.length,
      bunkedHours: relevantBunkedClasses.length
    };
  }, [state.subjects, chartData, viewScope, currentSubject, futureClasses, bunkedIds, currentSubjectId]);

  // Filter future class cards shown in the interactive checklist
  const visibleFutureClasses = useMemo(() => {
    return futureClasses.filter(c => {
      const matchSubject = viewScope === 'overall' || c.subjectId === currentSubjectId;
      const matchDate = activeDateFilter === 'all' || c.date === activeDateFilter;
      return matchSubject && matchDate;
    });
  }, [futureClasses, viewScope, currentSubjectId, activeDateFilter]);

  return (
    <div id="future-bunk-trend-container" className="bg-white rounded-xl border border-[#E8E7E2] shadow-xs overflow-hidden space-y-6">
      {/* Top Section / Header */}
      <div className="p-5 sm:p-6 border-b border-[#E8E7E2] bg-gradient-to-r from-[#FCFBF8] via-white to-[#F4F3EE]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EBF5FF] text-[#0066CC] border border-[#CCE5FF]">
                <Sparkles className="w-3.5 h-3.5" />
                Future Attendance Trajectory Simulator
              </span>
              <Badge variant={impactSummary.isSafe ? 'safe' : impactSummary.isWarning ? 'warning' : 'critical'}>
                {impactSummary.isSafe ? 'Safe Projection' : impactSummary.isWarning ? 'Warning (Near Cutoff)' : 'Attendance Shortage Risk'}
              </Badge>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E2022]">
              Semester Attendance Trend vs Planned Bunks
            </h2>
            <p className="text-xs text-[#5A5E65] mt-0.5 max-w-2xl">
              Toggle specific upcoming lectures to preview exactly how each skipped class bends your semester-long attendance percentage curve.
            </p>
          </div>

          {/* Preset buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-[#848A94] uppercase tracking-wider hidden sm:inline">
              Quick Scenarios:
            </span>
            <button
              id="preset-next-friday-btn"
              onClick={() => handleApplyPreset('nextFriday')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1E2022] bg-white border border-[#E8E7E2] hover:bg-[#F4F3EE] transition-colors shadow-2xs"
            >
              🎉 Bunk Next Friday
            </button>
            <button
              id="preset-long-weekend-btn"
              onClick={() => handleApplyPreset('longWeekend')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1E2022] bg-white border border-[#E8E7E2] hover:bg-[#F4F3EE] transition-colors shadow-2xs"
            >
              🏖️ Extended Weekend
            </button>
            {bunkedIds.size > 0 && (
              <button
                id="reset-bunks-btn"
                onClick={() => handleApplyPreset('clear')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D9381E] bg-[#FFF8F7] border border-[#FADBD8] hover:bg-[#FDE8E6] transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Bunks ({bunkedIds.size})
              </button>
            )}
          </div>
        </div>

        {/* View Scope Tabs & Time Horizon Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-[#E8E7E2]">
          {/* Scope selection: Overall vs Specific Subject */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            <button
              id="scope-single-btn"
              onClick={() => setViewScope('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                viewScope === 'single'
                  ? 'bg-[#1E2022] text-white border-[#1E2022] shadow-2xs'
                  : 'bg-white text-[#5A5E65] border-[#E8E7E2] hover:bg-[#FCFBF8]'
              }`}
            >
              Per-Course Critical Threshold
            </button>
            <button
              id="scope-overall-btn"
              onClick={() => setViewScope('overall')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                viewScope === 'overall'
                  ? 'bg-[#1E2022] text-white border-[#1E2022] shadow-2xs'
                  : 'bg-white text-[#5A5E65] border-[#E8E7E2] hover:bg-[#FCFBF8]'
              }`}
            >
              Aggregate Average (Ref)
            </button>

            {viewScope === 'single' && (
              <div className="flex items-center gap-2">
                <select
                  id="subject-dropdown-select"
                  value={currentSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    if (onSubjectChange) onSubjectChange(e.target.value);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#D1D0C9] text-[#1E2022] focus:outline-none focus:ring-1 focus:ring-[#1E2022]"
                >
                  {state.subjects.map(s => {
                    const calc = calculateSubjectAttendance(s);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.code} ({calc.currentPercentage}% • Threshold: {s.targetAttendance}%)
                      </option>
                    );
                  })}
                </select>
                {currentSubject && (
                  <span className="text-[11px] font-mono text-[#5A5E65] bg-white px-2 py-1 rounded border border-[#E8E7E2] hidden lg:inline">
                    Target: <strong>{currentSubject.targetAttendance}%</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#F4F3EE] p-1 rounded-lg border border-[#E8E7E2]">
            <span className="text-[10px] font-bold text-[#848A94] uppercase tracking-wider px-1.5">Horizon:</span>
            {(['2weeks', '4weeks', 'semester'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  timeRange === t
                    ? 'bg-white text-[#1E2022] font-bold shadow-2xs'
                    : 'text-[#5A5E65] hover:text-[#1E2022]'
                }`}
              >
                {t === '2weeks' ? '2 Weeks' : t === '4weeks' ? '1 Month' : 'Full Semester'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Impact Metric Cards */}
      <div className="px-5 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Current Base */}
          <div className="p-3.5 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-[#848A94] uppercase tracking-wider">
              Current Baseline
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-[#1E2022]">
                {impactSummary.currentPct}%
              </span>
              <span className="text-[11px] text-[#5A5E65]">recorded</span>
            </div>
            <span className="text-[10px] text-[#5A5E65] mt-1">
              {viewScope === 'overall' ? 'Across all enrolled subjects' : currentSubject?.name}
            </span>
          </div>

          {/* Card 2: Simulated Projected Outcome */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            impactSummary.isSafe
              ? 'bg-[#EBF7EE]/40 border-[#C3E6CB]'
              : impactSummary.isWarning
              ? 'bg-[#FEF9E7]/60 border-[#FCEEC0]'
              : 'bg-[#FFF8F7] border-[#FADBD8]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#848A94]">
                Projected Outcome
              </span>
              {impactSummary.isSafe ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7E34]" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-[#D9381E]" />
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${
                impactSummary.isSafe ? 'text-[#1E7E34]' : impactSummary.isWarning ? 'text-[#B7791F]' : 'text-[#D9381E]'
              }`}>
                {impactSummary.finalSimPct}%
              </span>
              {impactSummary.netDropFromBaseline !== 0 && (
                <span className={`text-xs font-mono font-bold ${
                  impactSummary.netDropFromBaseline < 0 ? 'text-[#D9381E]' : 'text-[#1E7E34]'
                }`}>
                  {impactSummary.netDropFromBaseline > 0 ? `+${impactSummary.netDropFromBaseline}%` : `${impactSummary.netDropFromBaseline}%`}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#5A5E65] mt-1">
              End-of-horizon attendance
            </span>
          </div>

          {/* Card 3: Planned Missed Classes */}
          <div className="p-3.5 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#848A94] uppercase tracking-wider">
                Classes to Bunk
              </span>
              <Flame className="w-3.5 h-3.5 text-[#FF6347]" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-[#D9381E]">
                {impactSummary.totalBunkedCount}
              </span>
              <span className="text-[11px] text-[#5A5E65]">classes</span>
            </div>
            <span className="text-[10px] text-[#5A5E65] mt-1">
              {impactSummary.bunkedHours} hours of planned absence
            </span>
          </div>

          {/* Card 4: Margin of Safety */}
          <div className="p-3.5 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2] flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-[#848A94] uppercase tracking-wider">
              Threshold Buffer ({impactSummary.threshold}%)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${
                impactSummary.marginOfSafety >= 0 ? 'text-[#1E7E34]' : 'text-[#D9381E]'
              }`}>
                {impactSummary.marginOfSafety >= 0 ? `+${impactSummary.marginOfSafety}%` : `${impactSummary.marginOfSafety}%`}
              </span>
              <span className="text-[11px] text-[#5A5E65]">
                {impactSummary.marginOfSafety >= 0 ? 'safe buffer' : 'shortage'}
              </span>
            </div>
            <span className="text-[10px] text-[#5A5E65] mt-1">
              {impactSummary.marginOfSafety >= 0 ? 'Eligible for end-semester exams' : 'Requires recovery attendance'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Recharts Trend Chart Container */}
      <div className="px-5 sm:px-6">
        <div className="p-4 sm:p-5 rounded-xl border border-[#E8E7E2] bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#1E2022] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#007FFF]" />
                {viewScope === 'overall' ? 'Overall Attendance Trajectory Curve' : `${currentSubject?.name} Projection Curve`}
              </h3>
              <p className="text-[11px] text-[#5A5E65]">
                Dashed line = Ideal attendance curve (100% attendance). Solid line = Your simulated trajectory.
              </p>
            </div>

            {/* Legend indicators */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#35A853] inline-block border border-dashed border-[#35A853]" />
                <span className="text-[#5A5E65] text-[11px]">Ideal (Attend All)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#007FFF] rounded-full inline-block" />
                <span className="text-[#1E2022] font-semibold text-[11px]">Simulated Curve</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#D9381E] inline-block" />
                <span className="text-[#D9381E] text-[11px] font-semibold">{impactSummary.threshold}% Cutoff</span>
              </div>
            </div>
          </div>

          {/* Recharts Component */}
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="simulatedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007FFF" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#007FFF" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="dangerZoneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D9381E" stopOpacity={0.06} />
                    <stop offset="100%" stopColor="#D9381E" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#F4F3EE" vertical={false} />

                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 11, fill: '#848A94' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E8E7E2' }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />

                <YAxis
                  domain={[
                    (dataMin: number) => Math.max(40, Math.floor((dataMin - 5) / 5) * 5),
                    100
                  ]}
                  tick={{ fontSize: 11, fill: '#848A94', fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E8E7E2' }}
                  unit="%"
                  ticks={[50, 60, 70, 75, 80, 90, 100]}
                />

                {/* Statutory 75% Reference Cutoff */}
                <ReferenceLine
                  y={impactSummary.threshold}
                  stroke="#D9381E"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `${impactSummary.threshold}% Cutoff`,
                    position: 'insideBottomRight',
                    fill: '#D9381E',
                    fontSize: 10,
                    fontWeight: 600
                  }}
                />

                {/* Rich Custom Tooltip */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isBunk = data.isBunked;
                      const isBelow = data.simulatedPct < data.threshold;

                      return (
                        <div className="bg-[#1E2022] text-white p-3 rounded-lg shadow-xl text-xs space-y-2 border border-[#33373B] max-w-xs z-50">
                          <div className="flex items-center justify-between border-b border-[#33373B] pb-1.5 gap-3">
                            <span className="font-bold text-white text-[11px]">{data.fullLabel}</span>
                            {isBunk ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#D9381E] text-white font-bold text-[10px]">
                                🔥 BUNKED
                              </span>
                            ) : data.action === 'Current' ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#5A5E65] text-white text-[10px]">
                                CURRENT
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-[#1E7E34] text-white text-[10px]">
                                ATTENDING
                              </span>
                            )}
                          </div>

                          {data.className && data.action !== 'Current' && (
                            <div className="text-[11px] text-[#D1D0C9]">
                              Class: <strong className="text-white">{data.className}</strong>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                            <div>
                              <span className="text-[#848A94] block text-[10px]">Simulated %:</span>
                              <span className={`font-bold text-sm ${isBelow ? 'text-[#FF6347]' : 'text-[#35A853]'}`}>
                                {data.simulatedPct}%
                              </span>
                            </div>
                            <div>
                              <span className="text-[#848A94] block text-[10px]">Ideal (Attend All):</span>
                              <span className="font-semibold text-sm text-[#CCE5FF]">
                                {data.baselinePct}%
                              </span>
                            </div>
                          </div>

                          {data.delta !== 0 && (
                            <div className="text-[10px] pt-1 border-t border-[#33373B] flex items-center justify-between">
                              <span className="text-[#848A94]">Impact vs Baseline:</span>
                              <span className={`font-bold ${data.delta < 0 ? 'text-[#FF6347]' : 'text-[#35A853]'}`}>
                                {data.delta}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Baseline trajectory line */}
                <Line
                  type="monotone"
                  dataKey="baselinePct"
                  stroke="#35A853"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                  name="Ideal Trajectory"
                />

                {/* Simulated area fill */}
                <Area
                  type="monotone"
                  dataKey="simulatedPct"
                  stroke="#007FFF"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#simulatedAreaGrad)"
                  name="Simulated Attendance"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.isBunked) {
                      return (
                        <circle
                          key={`dot-${payload.id}`}
                          cx={cx}
                          cy={cy}
                          r={4.5}
                          fill="#D9381E"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      );
                    }
                    return <></>;
                  }}
                  activeDot={{ r: 5, stroke: '#007FFF', strokeWidth: 2, fill: '#FFFFFF' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Actionable insight bar */}
          <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
            impactSummary.isSafe
              ? 'bg-[#EBF7EE] text-[#1E7E34] border-[#C3E6CB]'
              : impactSummary.isWarning
              ? 'bg-[#FEF9E7] text-[#975A16] border-[#FCEEC0]'
              : 'bg-[#FFF8F7] text-[#D9381E] border-[#FADBD8]'
          }`}>
            {impactSummary.isSafe ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#D9381E]" />
            )}
            <div className="leading-relaxed">
              {impactSummary.isSafe ? (
                <span>
                  <strong>Safe Bunk Plan:</strong> Even after skipping {impactSummary.totalBunkedCount} upcoming classes, your final attendance will remain comfortably at <strong>{impactSummary.finalSimPct}%</strong> (a +{impactSummary.marginOfSafety}% buffer above your {impactSummary.threshold}% requirement).
                </span>
              ) : impactSummary.isWarning ? (
                <span>
                  <strong>Caution (Borderline):</strong> Skipping {impactSummary.totalBunkedCount} classes pulls your attendance down to <strong>{impactSummary.finalSimPct}%</strong>, only {impactSummary.marginOfSafety}% above the minimum threshold. Any unexpected emergency or sickness could lead to exam debarment.
                </span>
              ) : (
                <span>
                  <strong>Critical Shortage Alert:</strong> Skipping {impactSummary.totalBunkedCount} classes causes your attendance to collapse to <strong>{impactSummary.finalSimPct}%</strong>, breaching your {impactSummary.threshold}% statutory cutoff by {Math.abs(impactSummary.marginOfSafety)}%. You would need to attend at least {Math.ceil((impactSummary.threshold * (impactSummary.totalBunkedCount + 10) - 10) / (100 - impactSummary.threshold))} consecutive lectures to regain eligibility!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Future Classes Checklist / Schedule Picker */}
      <div className="p-5 sm:p-6 border-t border-[#E8E7E2] bg-[#FCFBF8] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#1E2022] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#1E2022]" />
              Upcoming Future Lectures Checklist
            </h3>
            <p className="text-xs text-[#5A5E65]">
              Click any lecture button to toggle between <strong>Attending</strong> and <strong>Bunking</strong>. Changes reflect instantly on the graph above.
            </p>
          </div>

          {/* Date quick filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[#848A94] uppercase tracking-wider mr-1">
              Date Filter:
            </span>
            <button
              id="filter-all-dates-btn"
              onClick={() => setActiveDateFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                activeDateFilter === 'all'
                  ? 'bg-[#1E2022] text-white'
                  : 'bg-white border border-[#E8E7E2] text-[#5A5E65] hover:bg-[#F4F3EE]'
              }`}
            >
              All Dates ({futureClasses.length})
            </button>
            {scheduledDates.slice(0, 6).map(d => (
              <button
                key={d.date}
                onClick={() => setActiveDateFilter(d.date === activeDateFilter ? 'all' : d.date)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeDateFilter === d.date
                    ? 'bg-[#1E2022] text-white font-bold'
                    : 'bg-white border border-[#E8E7E2] text-[#5A5E65] hover:bg-[#F4F3EE]'
                }`}
              >
                {d.displayDate}
              </button>
            ))}
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleFutureClasses.slice(0, 24).map((inst) => {
            const isBunked = bunkedIds.has(inst.id);

            return (
              <div
                key={inst.id}
                onClick={() => handleToggleBunk(inst.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isBunked
                    ? 'bg-[#FFF8F7] border-[#FADBD8] shadow-xs ring-1 ring-[#D9381E]/30'
                    : 'bg-white border-[#E8E7E2] hover:border-[#D1D0C9] hover:bg-[#FCFBF8]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#5A5E65] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#848A94]" />
                      {inst.displayDate} • {inst.timeSlot}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors ${
                        isBunked
                          ? 'bg-[#D9381E] text-white'
                          : 'bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]'
                      }`}
                    >
                      {isBunked ? '🔥 Bunking' : '✓ Attending'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#1E2022] line-clamp-1">
                    {inst.subjectCode} - {inst.subjectName}
                  </h4>
                  <p className="text-[11px] text-[#848A94] mt-0.5">
                    {inst.faculty} • {inst.room}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E8E7E2]/70 flex items-center justify-between text-[11px]">
                  <span className="text-[#848A94] capitalize">
                    {inst.type}
                  </span>
                  <span className={`font-semibold ${isBunked ? 'text-[#D9381E]' : 'text-[#007FFF]'}`}>
                    {isBunked ? 'Click to Attend' : 'Click to Bunk'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {visibleFutureClasses.length > 24 && (
          <p className="text-center text-xs text-[#848A94] pt-2">
            Showing first 24 scheduled classes. Use date filters above to isolate specific weeks or days.
          </p>
        )}
      </div>
    </div>
  );
};
