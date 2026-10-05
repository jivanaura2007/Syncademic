import React from 'react';
import {
  LayoutDashboard,
  UserCheck,
  CalendarDays,
  ShieldCheck,
  FolderOpen,
  CalendarRange,
  Sparkles,
  Settings as SettingsIcon,
  HelpCircle,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { calculateOverallAttendance } from '../../utils/attendanceMath';
import { Subject } from '../../types';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  subjects: Subject[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  subjects
}) => {
  const overall = calculateOverallAttendance(subjects);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: UserCheck,
      badge: overall.criticalSubjectsCount > 0 ? `${overall.criticalSubjectsCount} alert` : null,
      badgeType: overall.criticalSubjectsCount > 0 ? 'critical' : null
    },
    {
      id: 'timetable',
      label: 'Timetable',
      icon: CalendarDays,
      badge: null
    },
    {
      id: 'bunk-planner',
      label: 'Bunk Planner',
      icon: ShieldCheck,
      badge: null
    },
    {
      id: 'notes',
      label: 'Smart Notes',
      icon: FolderOpen,
      badge: null
    },
    {
      id: 'planner',
      label: 'Semester Planner',
      icon: CalendarRange,
      badge: null
    },
    {
      id: 'ai-assistant',
      label: 'AI Study Copilot',
      icon: Sparkles,
      badge: 'Gemini'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      badge: null
    },
    {
      id: 'admin',
      label: 'Admin Reset',
      icon: ShieldAlert,
      badge: 'Admin',
      badgeType: 'admin'
    }
  ];

  return (
    <aside className="w-60 bg-[#FCFBF8] border-r border-[#E8E7E2] flex flex-col justify-between shrink-0 min-h-[calc(100vh-3.5rem)] select-none">
      <div className="p-3.5 space-y-1">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#848A94]">
          Academic Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-[#1E2022] text-[#FCFBF8] shadow-xs'
                  : 'text-[#5A5E65] hover:text-[#1E2022] hover:bg-[#F4F3EE]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-[#F4C430]'
                      : 'text-[#848A94] group-hover:text-[#1E2022]'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : item.badgeType === 'critical'
                      ? 'bg-[#FDF2F0] text-[#D9381E] border border-[#FADBD8]'
                      : item.badgeType === 'admin'
                      ? 'bg-[#FEF9E7] text-[#975A16] border border-[#FCEEC0] font-bold'
                      : 'bg-[#FEF9E7] text-[#975A16] border border-[#FCEEC0]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Academic Status Card */}
      <div className="p-3.5 border-t border-[#E8E7E2] m-2 rounded-xl bg-[#F7F6F1]/80 border border-[#E8E7E2]">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-[#5A5E65] font-medium">Course Compliance</span>
          <span className={`font-bold font-mono ${overall.subjectsAboveThreshold === subjects.length ? 'text-[#1E7E34]' : 'text-[#D9381E]'}`}>
            {overall.subjectsAboveThreshold}/{subjects.length} Safe
          </span>
        </div>
        
        {/* Minimal Progress Line */}
        <div className="w-full h-1.5 bg-[#E8E7E2] rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              overall.subjectsAboveThreshold === subjects.length
                ? 'bg-[#35A853]'
                : overall.criticalSubjectsCount > 0
                ? 'bg-[#D9381E]'
                : 'bg-[#F4C430]'
            }`}
            style={{ width: `${subjects.length > 0 ? (overall.subjectsAboveThreshold / subjects.length) * 100 : 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#848A94]">
          <span>Critical: 75% per course</span>
          <span>{overall.subjectsBelowThreshold > 0 ? `${overall.subjectsBelowThreshold} at risk` : 'All compliant'}</span>
        </div>
      </div>
    </aside>
  );
};
