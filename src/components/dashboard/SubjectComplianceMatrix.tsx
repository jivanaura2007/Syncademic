import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  Info, 
  Filter,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Subject, AppState } from '../../types';
import { calculateSubjectAttendance } from '../../utils/attendanceMath';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface SubjectComplianceMatrixProps {
  state: AppState;
  onNavigate: (route: string) => void;
  onOpenQuickMarkModal?: () => void;
}

export const SubjectComplianceMatrix: React.FC<SubjectComplianceMatrixProps> = ({
  state,
  onNavigate,
  onOpenQuickMarkModal
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'compliant'>('all');

  const subjectsWithCalc = state.subjects.map(s => {
    const calc = calculateSubjectAttendance(s);
    const criticalThreshold = s.targetAttendance || 75;
    const isCompliant = calc.currentPercentage >= criticalThreshold;
    const isCritical = calc.status === 'critical' || calc.currentPercentage < (criticalThreshold - 10);
    const isWarning = !isCritical && !isCompliant;

    return {
      subject: s,
      calc,
      criticalThreshold,
      isCompliant,
      isWarning,
      isCritical,
      diff: Math.round((calc.currentPercentage - criticalThreshold) * 10) / 10
    };
  });

  const totalSubjects = subjectsWithCalc.length;
  const compliantCount = subjectsWithCalc.filter(sc => sc.isCompliant).length;
  const criticalCount = subjectsWithCalc.filter(sc => sc.isCritical).length;
  const warningCount = subjectsWithCalc.filter(sc => sc.isWarning).length;
  const nonCompliantCount = totalSubjects - compliantCount;

  const filteredSubjects = subjectsWithCalc.filter(item => {
    if (filter === 'critical') return item.isCritical;
    if (filter === 'warning') return item.isWarning;
    if (filter === 'compliant') return item.isCompliant;
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-[#E8E7E2] overflow-hidden shadow-xs">
      {/* Header with Title and Policy Note */}
      <div className="p-5 border-b border-[#E8E7E2] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#1E2022] tracking-tight">
                Course-by-Course Attendance & Critical Thresholds
              </h2>
              {nonCompliantCount === 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  All Courses Compliant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF1F0] text-[#D9381E] border border-[#FADBD8]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {nonCompliantCount} {nonCompliantCount === 1 ? 'Course' : 'Courses'} Below Critical Threshold
                </span>
              )}
            </div>
            <p className="text-xs text-[#5A5E65] mt-1">
              Attendance is evaluated per subject and course. Each individual course must independently satisfy its critical threshold for exam eligibility.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('attendance')}
            >
              Manage Subjects
            </Button>
            {onOpenQuickMarkModal && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenQuickMarkModal}
              >
                Mark Attendance
              </Button>
            )}
          </div>
        </div>

        {/* Regulatory Alert Banner if any course is non-compliant */}
        {nonCompliantCount > 0 && (
          <div className="p-3 rounded-lg bg-[#FFF8F7] border border-[#FADBD8] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#D9381E] shrink-0 mt-0.5" />
            <div className="text-xs text-[#1E2022] space-y-0.5">
              <span className="font-semibold text-[#D9381E]">
                Critical University Mandate Warning:
              </span>
              <p className="text-[#5A5E65]">
                A high overall percentage does <strong>not</strong> waive attendance shortage in individual courses. You have{' '}
                <strong className="text-[#D9381E]">{nonCompliantCount} {nonCompliantCount === 1 ? 'subject' : 'subjects'}</strong> below critical threshold and at risk of exam debarment.
              </p>
            </div>
          </div>
        )}

        {/* Course Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1 p-1 bg-[#F4F3EE] rounded-lg border border-[#E8E7E2] text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-[#1E2022] shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#1E2022]'
              }`}
            >
              All Courses ({totalSubjects})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === 'critical'
                  ? 'bg-white text-[#D9381E] font-semibold shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#D9381E]'
              }`}
            >
              Critical Shortage ({criticalCount})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === 'warning'
                  ? 'bg-white text-[#B7791F] font-semibold shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#B7791F]'
              }`}
            >
              Near Threshold ({warningCount})
            </button>
            <button
              onClick={() => setFilter('compliant')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === 'compliant'
                  ? 'bg-white text-[#1E7E34] font-semibold shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#1E7E34]'
              }`}
            >
              Compliant ({compliantCount})
            </button>
          </div>

          <div className="text-[11px] text-[#848A94] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Black line indicates course-specific critical threshold</span>
          </div>
        </div>
      </div>

      {/* Grid of Subject Cards */}
      <div className="divide-y divide-[#E8E7E2]">
        {filteredSubjects.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5A5E65]">
            No courses found under the "{filter}" filter.
          </div>
        ) : (
          filteredSubjects.map(({ subject, calc, criticalThreshold, isCompliant, isWarning, isCritical, diff }) => {
            return (
              <div
                key={subject.id}
                className={`p-4 sm:p-5 transition-colors ${
                  isCritical
                    ? 'bg-[#FFFBFB] hover:bg-[#FFF5F5]'
                    : isWarning
                    ? 'bg-[#FEFDF9] hover:bg-[#FEF9E7]/40'
                    : 'bg-white hover:bg-[#FCFBF8]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left info: code, name, faculty */}
                  <div className="space-y-1 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#F4F3EE] border border-[#E8E7E2] text-[#1E2022]">
                        {subject.code}
                      </span>
                      <h3 className="text-sm font-bold text-[#1E2022] tracking-tight">
                        {subject.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#5A5E65]">
                      <span>{subject.faculty || 'Faculty'}</span>
                      <span>•</span>
                      <span>Room {subject.room || 'LH'}</span>
                      <span>•</span>
                      <span>{subject.credits} Credits</span>
                    </div>
                  </div>

                  {/* Center: Attendance Gauge with Critical Threshold Pin */}
                  <div className="flex-1 max-w-md space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1E2022] text-sm">
                          {calc.currentPercentage}%
                        </span>
                        <span className="text-[11px] text-[#5A5E65]">
                          ({subject.attendedClasses} / {subject.totalClasses} classes)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="text-[#5A5E65]">Critical Threshold:</span>
                        <span className="font-mono text-[#1E2022]">{criticalThreshold}%</span>
                      </div>
                    </div>

                    {/* Progress Bar with threshold indicator line */}
                    <div className="relative w-full h-3 bg-[#F4F3EE] rounded-full overflow-hidden border border-[#E8E7E2]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCritical
                            ? 'bg-[#D9381E]'
                            : isWarning
                            ? 'bg-[#B7791F]'
                            : 'bg-[#35A853]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, calc.currentPercentage))}%` }}
                      />
                      {/* Critical Threshold vertical marker */}
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-[#1E2022] z-10 -ml-0.5 shadow-xs"
                        style={{ left: `${Math.min(100, criticalThreshold)}%` }}
                        title={`Critical Threshold: ${criticalThreshold}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#848A94]">
                        {diff >= 0 ? (
                          <span className="text-[#1E7E34] font-medium">+{diff}% buffer above threshold</span>
                        ) : (
                          <span className="text-[#D9381E] font-medium">{Math.abs(diff)}% deficit below threshold</span>
                        )}
                      </span>
                      <span className="text-[10px] text-[#848A94] font-mono">
                        Target {criticalThreshold}%
                      </span>
                    </div>
                  </div>

                  {/* Right Status Badge & Recovery / Bunk Advice */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 md:min-w-[170px] text-right">
                    <div>
                      {isCompliant ? (
                        <Badge variant="safe" size="sm" className="font-semibold">
                          ✓ Compliant ({calc.safeBunks} safe {calc.safeBunks === 1 ? 'bunk' : 'bunks'})
                        </Badge>
                      ) : isCritical ? (
                        <Badge variant="critical" size="sm" className="font-semibold animate-pulse">
                          ❌ Detention Risk ({calc.classesNeededToRecover} to recover)
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm" className="font-semibold">
                          ⚠️ Shortage (Attend next {calc.classesNeededToRecover})
                        </Badge>
                      )}
                    </div>

                    <div className="text-[11px] text-[#5A5E65]">
                      {isCompliant ? (
                        <span className="text-[#1E7E34] font-medium">
                          Can miss {calc.safeBunks} more without penalty
                        </span>
                      ) : (
                        <span className="text-[#D9381E] font-medium">
                          Must attend {calc.classesNeededToRecover} consecutive {calc.classesNeededToRecover === 1 ? 'class' : 'classes'}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onNavigate('bunk-planner')}
                      className="text-[11px] font-semibold text-[#007FFF] hover:underline flex items-center gap-1"
                    >
                      Simulate bunks <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-[#FCFBF8] border-t border-[#E8E7E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5A5E65]">
        <div className="flex items-center gap-4">
          <span>
            Compliant Courses: <strong className="text-[#1E7E34] font-mono">{compliantCount} / {totalSubjects}</strong>
          </span>
          <span>•</span>
          <span>
            At Risk Courses: <strong className="text-[#D9381E] font-mono">{nonCompliantCount}</strong>
          </span>
        </div>
        <div className="text-[11px] text-[#848A94]">
          Always check your university syllabus regulations for condonation limits.
        </div>
      </div>
    </div>
  );
};
