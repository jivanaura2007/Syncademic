import React, { useState } from 'react';
import { 
  GraduationCap, 
  ArrowRight, 
  UserCheck, 
  CalendarDays, 
  FolderOpen, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Calculator,
  ChevronRight,
  BookOpen,
  CalendarRange
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onDirectDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  onDirectDemo
}) => {
  // Interactive mini-calculator on landing page for instant feel
  const [attended, setAttended] = useState(28);
  const [total, setTotal] = useState(32);
  const [target, setTarget] = useState(75);

  const currentPct = total > 0 ? Math.round((attended / total) * 1000) / 10 : 100;
  const targetFrac = target / 100;
  
  let safeBunks = 0;
  let classesNeeded = 0;
  let status: 'safe' | 'warning' | 'critical' = 'safe';

  if (currentPct >= target) {
    safeBunks = Math.max(0, Math.floor((attended - targetFrac * total) / targetFrac));
    status = safeBunks > 0 ? 'safe' : 'warning';
  } else {
    classesNeeded = Math.max(1, Math.ceil((targetFrac * total - attended) / (1 - targetFrac)));
    status = currentPct < target - 10 ? 'critical' : 'warning';
  }

  return (
    <div 
      className="min-h-screen relative overflow-x-hidden selection:bg-[#007FFF]/20 selection:text-[#1E2022]"
      style={{ backgroundColor: 'var(--bg-main, #FCFBF8)', color: 'var(--text-primary, #1E2022)' }}
    >
      {/* Background Grid & Ambient Layers */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-grid-pattern opacity-80" 
        aria-hidden="true" 
      />
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-ambient-radial" 
        aria-hidden="true" 
      />

      <div className="relative z-10">
        {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#FCFBF8]/90 backdrop-blur-md border-b border-[#E8E7E2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E2022] text-[#FCFBF8] flex items-center justify-center font-bold text-sm shadow-xs">
              <span className="text-[#F4C430] font-black text-base">S</span>
            </div>
            <span className="font-semibold text-base tracking-tight text-[#1E2022]">Syncademic</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={onLogin}>
              Log In
            </Button>
            <Button variant="primary" size="sm" onClick={onGetStarted} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F3EE] border border-[#E8E7E2] text-xs font-medium text-[#5A5E65] mb-6">
          <span className="w-2 h-2 rounded-full bg-[#35A853]"></span>
          A calm, practical academic workspace for college students
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1E2022] max-w-3xl mx-auto leading-[1.15]">
          Your academic life, <br />
          <span className="font-serif-academic font-normal italic text-[#007FFF]">finally in sync.</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-[#5A5E65] max-w-2xl mx-auto leading-relaxed">
          One unified workspace to track attendance, manage your timetable with replacement days, calculate safe bunks, organize smart notes, and plan your semester.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={onGetStarted} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Open Academic Workspace
          </Button>
          <Button variant="outline" size="lg" onClick={onDirectDemo}>
            Explore Preloaded Demo
          </Button>
        </div>

        {/* Live Mini Preview Tool */}
        <div className="mt-14 max-w-2xl mx-auto p-6 rounded-2xl bg-white border border-[#E8E7E2] shadow-sm text-left">
          <div className="flex items-center justify-between pb-4 border-b border-[#E8E7E2]">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#007FFF]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A5E65]">
                Live Mathematical Bunk Calculator
              </span>
            </div>
            <Badge variant={status}>
              {status === 'safe' ? `✓ ${safeBunks} Safe Bunks` : status === 'warning' ? '⚠️ At-Risk' : `⚠️ Shortage: Need ${classesNeeded}`}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 my-5">
            <div>
              <label className="block text-[11px] font-medium text-[#5A5E65] mb-1">Attended Classes</label>
              <input
                type="number"
                min="0"
                max={total}
                value={attended}
                onChange={(e) => setAttended(Math.min(total, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-sm font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5A5E65] mb-1">Total Conducted</label>
              <input
                type="number"
                min={attended}
                value={total}
                onChange={(e) => setTotal(Math.max(attended, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-sm font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5A5E65] mb-1">Threshold Target (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={target}
                onChange={(e) => setTarget(Math.min(100, Math.max(50, parseInt(e.target.value) || 75)))}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-sm font-mono font-semibold"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#FCFBF8] border border-[#E8E7E2] flex items-center justify-between text-xs">
            <div>
              <span className="text-[#5A5E65]">Current Attendance: </span>
              <span className="font-bold text-[#1E2022] font-mono text-sm ml-1">{currentPct}%</span>
            </div>
            <div className="text-right">
              {currentPct >= target ? (
                <span className="text-[#1E7E34] font-medium">
                  You can safely skip the next <strong>{safeBunks}</strong> {safeBunks === 1 ? 'class' : 'classes'}
                </span>
              ) : (
                <span className="text-[#D9381E] font-medium">
                  Must attend next <strong>{classesNeeded}</strong> {classesNeeded === 1 ? 'class' : 'classes'} to reach {target}%
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Core Academic Modules */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-[#E8E7E2]">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E2022]">
            Engineered for real college workflows
          </h2>
          <p className="text-xs sm:text-sm text-[#5A5E65] mt-2">
            No gamification slop, no meaningless XP streaks. Just pure clarity and control over your degree.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Attendance */}
          <div className="p-6 rounded-xl bg-white border border-[#E8E7E2] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#EBF7EE] text-[#1E7E34] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#1E2022]">Attendance & Bunk Tracker</h3>
            <p className="text-xs text-[#5A5E65] leading-relaxed">
              Real mathematical models calculate exact safe bunks and recovery requirements. Supports same-day marking and historical logging.
            </p>
            <ul className="text-xs text-[#5A5E65] space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#35A853]" />
                <span>Exact formula: floor((A - R*T)/R)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#35A853]" />
                <span>Low-attendance shortage warnings</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Timetable & Replacement Days */}
          <div className="p-6 rounded-xl bg-white border border-[#E8E7E2] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#EBF5FF] text-[#007FFF] flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#1E2022]">Timetable & Replacement Days</h3>
            <p className="text-xs text-[#5A5E65] leading-relaxed">
              Handles the real university quirks: Saturday replacement timetables, faculty official leaves, and university holidays without skewing records.
            </p>
            <ul className="text-xs text-[#5A5E65] space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#007FFF]" />
                <span>Replacement-day schedule swapping</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#007FFF]" />
                <span>Faculty on leave lecture tracking</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Smart Notes & Google Drive */}
          <div className="p-6 rounded-xl bg-white border border-[#E8E7E2] space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#FEF9E7] text-[#975A16] flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#1E2022]">Smart Notes & Google Drive Vault</h3>
            <p className="text-xs text-[#5A5E65] leading-relaxed">
              Organize lecture PDFs, assignments, PPTs, and past question papers by semester and subject. Direct cloud synchronization with Google Drive.
            </p>
            <ul className="text-xs text-[#5A5E65] space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F4C430]" />
                <span>Categorized Subject Folders & PYQs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F4C430]" />
                <span>In-app file viewer & Google Drive sync</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#AF1F72]/30 py-8 px-4 sm:px-6 bg-[#7A1354]/40 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#F472B6] gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Syncademic</span>
            <span>— Practical Academic Workspace</span>
          </div>
          <div>
            <span>Built for college students with high productivity & mathematical rigor.</span>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};
