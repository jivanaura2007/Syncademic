import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Sliders, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  TrendingDown, 
  TrendingUp,
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { AppState, Subject } from '../../types';
import { calculateSubjectAttendance, simulateAttendance } from '../../utils/attendanceMath';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { FutureBunkTrendVisualizer } from '../../components/planner/FutureBunkTrendVisualizer';

interface BunkPlannerPageProps {
  state: AppState;
  initialSubjectId?: string;
  onNavigateToAI?: () => void;
}

export const BunkPlannerPage: React.FC<BunkPlannerPageProps> = ({
  state,
  initialSubjectId,
  onNavigateToAI
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || state.subjects[0]?.id || ''
  );
  const [skipCount, setSkipCount] = useState<number>(1);
  const [attendCount, setAttendCount] = useState<number>(0);

  // Multi-day bulk leave planner
  const [bulkLeaveDays, setBulkLeaveDays] = useState<number>(2);
  const [isBulkPlannerOpen, setIsBulkPlannerOpen] = useState(false);

  const selectedSubject = state.subjects.find(s => s.id === selectedSubjectId) || state.subjects[0];

  if (!selectedSubject) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#E8E7E2]">
        <p className="text-xs text-[#5A5E65]">No subjects found. Please add a subject first in Attendance.</p>
      </div>
    );
  }

  const currentCalc = calculateSubjectAttendance(selectedSubject);
  const simulation = simulateAttendance(
    selectedSubject.attendedClasses,
    selectedSubject.totalClasses,
    attendCount,
    skipCount
  );

  const targetFrac = selectedSubject.targetAttendance / 100;
  const isProjectedSafe = simulation.projectedPercentage >= selectedSubject.targetAttendance;
  const isProjectedWarning = simulation.projectedPercentage < selectedSubject.targetAttendance && simulation.projectedPercentage >= selectedSubject.targetAttendance - 5;
  const isProjectedCritical = simulation.projectedPercentage < selectedSubject.targetAttendance - 5;

  const pctDiff = Math.round((simulation.projectedPercentage - currentCalc.currentPercentage) * 10) / 10;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E7E2]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2022]">
              Bunk Planner & Attendance Simulator
            </h1>
            <Badge variant="blue">Mathematical Model</Badge>
          </div>
          <p className="text-xs text-[#5A5E65] mt-1">
            Evaluate whether you can safely miss upcoming lectures without dropping below your {selectedSubject.targetAttendance}% threshold.
          </p>
        </div>

        {onNavigateToAI && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToAI}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#F4C430]" />}
          >
            Ask AI Excuse Drafter
          </Button>
        )}
      </div>

      {/* Critical Threshold Notice Banner */}
      <div className="p-4 rounded-xl bg-[#FFF8F7] border border-[#FADBD8] flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#D9381E] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-[#D9381E]">
            Individual Course Attendance Mandate:
          </span>
          <p className="text-[#5A5E65]">
            Attendance calculations and detention regulations apply <strong>strictly per course</strong>. You cannot average out or transfer attendance between courses; every individual subject must meet its critical threshold (e.g. {selectedSubject.targetAttendance}%) to guarantee exam hall-ticket eligibility.
          </p>
        </div>
      </div>

      {/* Recharts Semester Attendance Trend Visualizer */}
      <FutureBunkTrendVisualizer
        state={state}
        selectedSubjectId={selectedSubjectId}
        onSubjectChange={(id) => setSelectedSubjectId(id)}
      />

      {/* Main Interactive Simulation Card */}
      <div className="bg-white p-6 rounded-xl border border-[#E8E7E2] space-y-6 shadow-xs">
        {/* Subject Selector Tabs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-[#1E2022]">
              Select Course to Simulate
            </label>
            <span className="text-[11px] text-[#848A94]">
              Red dots indicate courses below critical threshold
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {state.subjects.map((sub) => {
              const calc = calculateSubjectAttendance(sub);
              const isSelected = sub.id === selectedSubjectId;
              const isBelow = calc.currentPercentage < sub.targetAttendance;

              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium shrink-0 border transition-all ${
                    isSelected
                      ? 'bg-[#1E2022] text-white border-[#1E2022] shadow-xs'
                      : isBelow
                      ? 'bg-[#FFF8F7] text-[#D9381E] border-[#FADBD8] hover:bg-[#FFEBE9]'
                      : 'bg-[#FCFBF8] text-[#5A5E65] border-[#E8E7E2] hover:bg-[#F4F3EE]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isBelow && (
                      <span className="w-2 h-2 rounded-full bg-[#D9381E] shrink-0" title="Below Critical Threshold" />
                    )}
                    <span className="font-mono font-bold">{sub.code}</span>
                    <span>•</span>
                    <span>{calc.currentPercentage}%</span>
                    <span className="text-[10px] opacity-75">({sub.targetAttendance}%)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current State vs Simulation Projection Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-[#FCFBF8] border border-[#E8E7E2]">
          {/* Current Status */}
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#848A94]">
              Current Academic Status
            </span>
            <div>
              <h3 className="text-base font-bold text-[#1E2022]">
                {selectedSubject.name} ({selectedSubject.code})
              </h3>
              <p className="text-xs text-[#5A5E65] mt-0.5">
                {selectedSubject.faculty} • Room {selectedSubject.room}
              </p>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold font-mono text-[#1E2022]">
                {currentCalc.currentPercentage}%
              </span>
              <span className="text-xs text-[#5A5E65]">
                ({selectedSubject.attendedClasses} / {selectedSubject.totalClasses} classes)
              </span>
            </div>

            <div className="text-xs text-[#5A5E65] bg-white p-3 rounded-lg border border-[#E8E7E2]">
              {currentCalc.safeBunks > 0 ? (
                <span className="text-[#1E7E34] font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Currently you can safely skip up to <strong>{currentCalc.safeBunks}</strong> classes.
                </span>
              ) : (
                <span className="text-[#D9381E] font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Currently below threshold! Must attend next <strong>{currentCalc.classesNeededToRecover}</strong> classes.
                </span>
              )}
            </div>
          </div>

          {/* Projected Outcome */}
          <div className="space-y-3 md:border-l md:border-[#E8E7E2] md:pl-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#848A94]">
              Projected Simulation
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={isProjectedSafe ? 'safe' : isProjectedWarning ? 'warning' : 'critical'}>
                  {isProjectedSafe ? '✓ Safe Bunk' : isProjectedWarning ? '⚠️ Risky' : '❌ Not Advisable (Shortage)'}
                </Badge>
                {pctDiff !== 0 && (
                  <span className={`text-xs font-mono font-semibold flex items-center ${pctDiff > 0 ? 'text-[#1E7E34]' : 'text-[#D9381E]'}`}>
                    {pctDiff > 0 ? `+${pctDiff}%` : `${pctDiff}%`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold font-mono text-[#1E2022]">
                {simulation.projectedPercentage}%
              </span>
              <span className="text-xs text-[#5A5E65]">
                ({simulation.projectedAttended} / {simulation.projectedTotal} projected)
              </span>
            </div>

            <div className={`p-3 rounded-lg border text-xs font-medium ${
              isProjectedSafe 
                ? 'bg-[#EBF7EE] text-[#1E7E34] border-[#C3E6CB]'
                : isProjectedWarning
                ? 'bg-[#FEF9E7] text-[#B7791F] border-[#FCEEC0]'
                : 'bg-[#FFF8F7] text-[#D9381E] border-[#FADBD8]'
            }`}>
              {isProjectedSafe ? (
                <span>
                  Outcome: Your attendance remains at {simulation.projectedPercentage}%, comfortably above your {selectedSubject.targetAttendance}% requirement.
                </span>
              ) : (
                <span>
                  Warning: Skipping {skipCount} {skipCount === 1 ? 'class' : 'classes'} drops your attendance to {simulation.projectedPercentage}%, below your {selectedSubject.targetAttendance}% requirement!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sliders & Controls */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Skip slider */}
            <div className="p-4 rounded-xl border border-[#E8E7E2] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#1E2022]">
                  Upcoming Classes to Skip / Bunk
                </label>
                <span className="text-sm font-bold font-mono text-[#D9381E] bg-[#FFF1F0] px-2 py-0.5 rounded border border-[#FADBD8]">
                  {skipCount} {skipCount === 1 ? 'class' : 'classes'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={skipCount}
                onChange={(e) => setSkipCount(Number(e.target.value))}
                className="w-full h-2 bg-[#E8E7E2] rounded-lg appearance-none cursor-pointer accent-[#FF6347]"
              />
              <div className="flex justify-between text-[10px] text-[#848A94]">
                <span>0</span>
                <span>5</span>
                <span>10 classes</span>
              </div>
            </div>

            {/* Attend slider */}
            <div className="p-4 rounded-xl border border-[#E8E7E2] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#1E2022]">
                  Upcoming Classes to Attend
                </label>
                <span className="text-sm font-bold font-mono text-[#1E7E34] bg-[#EBF7EE] px-2 py-0.5 rounded border border-[#C3E6CB]">
                  {attendCount} {attendCount === 1 ? 'class' : 'classes'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                value={attendCount}
                onChange={(e) => setAttendCount(Number(e.target.value))}
                className="w-full h-2 bg-[#E8E7E2] rounded-lg appearance-none cursor-pointer accent-[#35A853]"
              />
              <div className="flex justify-between text-[10px] text-[#848A94]">
                <span>0</span>
                <span>5</span>
                <span>15 classes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Course Bunk Feasibility Table */}
      <div className="bg-white p-6 rounded-xl border border-[#E8E7E2] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#1E2022] tracking-tight">
              Semester-Wide Bunk Advisory Matrix
            </h3>
            <p className="text-xs text-[#5A5E65]">
              Summary of all subjects and maximum consecutive missable lectures
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8E7E2] text-[#848A94] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3">Faculty</th>
                <th className="py-2.5 px-3">Current %</th>
                <th className="py-2.5 px-3">Threshold</th>
                <th className="py-2.5 px-3">Max Safe Bunks</th>
                <th className="py-2.5 px-3">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E7E2]">
              {state.subjects.map((sub) => {
                const calc = calculateSubjectAttendance(sub);

                return (
                  <tr key={sub.id} className="hover:bg-[#FCFBF8] transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-[#1E2022] block">{sub.name}</span>
                      <span className="font-mono text-[10px] text-[#848A94]">{sub.code}</span>
                    </td>
                    <td className="py-3 px-3 text-[#5A5E65]">{sub.faculty}</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#1E2022]">{calc.currentPercentage}%</td>
                    <td className="py-3 px-3 font-mono text-[#5A5E65]">{sub.targetAttendance}%</td>
                    <td className="py-3 px-3 font-mono font-bold">
                      {calc.safeBunks > 0 ? (
                        <span className="text-[#1E7E34]">{calc.safeBunks} classes</span>
                      ) : (
                        <span className="text-[#D9381E]">0 (Need +{calc.classesNeededToRecover})</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={calc.status}>
                        {calc.status === 'safe' ? 'Safe to Bunk' : calc.status === 'warning' ? 'Edge' : 'Do Not Bunk'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
