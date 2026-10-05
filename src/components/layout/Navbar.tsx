import React, { useState } from 'react';
import { 
  GraduationCap, 
  Calendar as CalendarIcon, 
  Sparkles, 
  User, 
  LogOut, 
  Settings as SettingsIcon, 
  CheckSquare, 
  Menu, 
  X,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { AppState } from '../../types';
import { calculateOverallAttendance } from '../../utils/attendanceMath';
import { Badge } from '../common/Badge';

interface NavbarProps {
  state: AppState;
  currentRoute: string;
  onNavigate: (route: string) => void;
  onLogout: () => void;
  onOpenQuickMarkModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  state,
  currentRoute,
  onNavigate,
  onLogout,
  onOpenQuickMarkModal
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const overall = calculateOverallAttendance(state.subjects);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const getAttendanceBadge = () => {
    if (overall.status === 'safe') {
      return (
        <Badge variant="safe" size="sm" className="hidden sm:inline-flex">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1E7E34] mr-1.5"></span>
          Overall {overall.overallPercentage}%
        </Badge>
      );
    }
    if (overall.status === 'warning') {
      return (
        <Badge variant="warning" size="sm" className="hidden sm:inline-flex">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B7791F] mr-1.5"></span>
          Overall {overall.overallPercentage}%
        </Badge>
      );
    }
    return (
      <Badge variant="critical" size="sm" className="hidden sm:inline-flex">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D9381E] mr-1.5"></span>
        Overall {overall.overallPercentage}% (Shortage)
      </Badge>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#E8E7E2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Brand / Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-hidden"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1E2022] text-[#FCFBF8] flex items-center justify-center font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
                <span className="text-[#F4C430] font-black text-base">S</span>
              </div>
              <div>
                <span className="font-semibold text-[#1E2022] tracking-tight text-base flex items-center gap-1.5">
                  Syncademic
                  <span className="text-[10px] uppercase font-mono font-medium px-1.5 py-0.5 rounded bg-[#F4F3EE] text-[#5A5E65] border border-[#E8E7E2]">
                    Sem {state.profile.semester}
                  </span>
                </span>
              </div>
            </button>

            <div className="hidden md:flex items-center ml-4 pl-4 border-l border-[#E8E7E2] text-xs text-[#5A5E65] gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-[#848A94]" />
              <span>{today}</span>
            </div>
          </div>

          {/* Center: Live Status info */}
          <div className="hidden lg:flex items-center gap-3">
            {getAttendanceBadge()}
            {state.googleDriveSettings.connected && (
              <span className="text-[11px] text-[#5A5E65] flex items-center gap-1 bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#E8E7E2]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                Google Drive Active
              </span>
            )}
          </div>

          {/* Right: Quick actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onOpenQuickMarkModal && (
              <button
                onClick={onOpenQuickMarkModal}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-[#F4F3EE] text-[#1E2022] hover:bg-[#EAE8DF] border border-[#E8E7E2] transition-colors"
                title="Mark today's attendance"
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#007FFF]" />
                <span>Mark Attendance</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('ai-assistant')}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-[#FEF9E7] text-[#975A16] hover:bg-[#FCEEC0] border border-[#FCEEC0] transition-colors"
              title="Open AI Academic Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F4C430]" />
              <span className="hidden sm:inline">AI Study Copilot</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#F4F3EE] text-[#1E2022] transition-colors border border-transparent hover:border-[#E8E7E2]"
              >
                <div className="w-7 h-7 rounded-full bg-[#EAE8DF] text-[#1E2022] font-medium text-xs flex items-center justify-center border border-[#D5D3CB]">
                  {state.profile.name.charAt(0)}
                </div>
                <span className="hidden md:inline text-xs font-medium max-w-[100px] truncate text-[#1E2022]">
                  {state.profile.name.split(' ')[0]}
                </span>
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-[#E8E7E2] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setProfileOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-[#E8E7E2]">
                    <p className="text-xs font-semibold text-[#1E2022] truncate">{state.profile.name}</p>
                    <p className="text-[11px] text-[#5A5E65] truncate">{state.profile.email}</p>
                    <p className="text-[10px] text-[#848A94] mt-0.5">{state.profile.university} • {state.profile.department}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => onNavigate('settings')}
                      className="w-full px-4 py-2 text-left text-xs text-[#1E2022] hover:bg-[#F4F3EE] flex items-center gap-2.5"
                    >
                      <SettingsIcon className="w-4 h-4 text-[#5A5E65]" />
                      <span>Academic & AI Settings</span>
                    </button>
                    <button
                      onClick={() => onNavigate('bunk-planner')}
                      className="w-full px-4 py-2 text-left text-xs text-[#1E2022] hover:bg-[#F4F3EE] flex items-center gap-2.5"
                    >
                      <GraduationCap className="w-4 h-4 text-[#5A5E65]" />
                      <span>Bunk Safety Simulator</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#E8E7E2]">
                    <button
                      onClick={onLogout}
                      className="w-full px-4 py-2 text-left text-xs text-[#D9381E] hover:bg-[#FFF1F0] flex items-center gap-2.5"
                    >
                      <LogOut className="w-4 h-4 text-[#D9381E]" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-[#5A5E65] hover:text-[#1E2022] hover:bg-[#F4F3EE]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-2 pb-4 border-b border-[#E8E7E2] bg-[#FCFBF8] space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'attendance', label: 'Attendance Tracker' },
            { id: 'timetable', label: 'Timetable & Schedule' },
            { id: 'bunk-planner', label: 'Bunk Planner' },
            { id: 'notes', label: 'Smart Notes' },
            { id: 'planner', label: 'Semester Planner' },
            { id: 'ai-assistant', label: 'AI Study Assistant' },
            { id: 'settings', label: 'Settings' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                currentRoute === item.id
                  ? 'bg-[#1E2022] text-white'
                  : 'text-[#5A5E65] hover:bg-[#F4F3EE] hover:text-[#1E2022]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
