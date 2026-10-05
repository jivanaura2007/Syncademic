import React, { useState } from 'react';
import { 
  User, 
  Settings as SettingsIcon, 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  Building, 
  BookOpen, 
  Check, 
  Trash2,
  Lock,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { AppState } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { 
  updateProfile, 
  updateSemesterDates, 
  exportAppStateAsJson, 
  importAppStateFromJson, 
  resetToCleanWorkspace,
  loadDemoSampleData 
} from '../../services/storage';
import { useToast } from '../../components/common/Toast';
import { AdminResetConsole } from '../../components/admin/AdminResetConsole';

interface SettingsPageProps {
  state: AppState;
  onLogout: () => void;
  initialTab?: 'admin' | 'profile' | 'backup';
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ state, onLogout, initialTab = 'admin' }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'admin' | 'profile' | 'backup'>(initialTab);

  // Profile Form
  const [name, setName] = useState(state.profile.name);
  const [email, setEmail] = useState(state.profile.email);
  const [university, setUniversity] = useState(state.profile.university);
  const [department, setDepartment] = useState(state.profile.department);
  const [semester, setSemester] = useState(state.profile.semester);
  const [section, setSection] = useState(state.profile.section);
  const [rollNumber, setRollNumber] = useState(state.profile.rollNumber);
  const [threshold, setThreshold] = useState(state.profile.defaultAttendanceThreshold);

  // Semester Dates
  const [startDate, setStartDate] = useState(state.semesterStartDate);
  const [endDate, setEndDate] = useState(state.semesterEndDate);

  // Confirm Modals
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim(),
      email: email.trim(),
      university: university.trim(),
      department: department.trim(),
      semester: Number(semester),
      section: section.trim(),
      rollNumber: rollNumber.trim(),
      defaultAttendanceThreshold: Number(threshold)
    });
    updateSemesterDates(startDate, endDate);
    showToast('Academic profile updated successfully', 'success');
  };

  const handleExportData = () => {
    const jsonStr = exportAppStateAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncademic-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Workspace exported successfully as JSON', 'success');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importAppStateFromJson(content);
      if (success) {
        showToast('Workspace imported successfully', 'success');
      } else {
        showToast('Failed to import: Invalid JSON schema', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleData = () => {
    loadDemoSampleData();
    showToast('Loaded sample engineering dataset (6 courses, notes & timetable)', 'info');
    setIsResetConfirmOpen(false);
  };

  const handleClearAllData = () => {
    resetToCleanWorkspace();
    showToast('Cleared workspace data to clean state', 'info');
    setIsClearAllConfirmOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E7E2]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2022]">
            Workspace Settings
          </h1>
          <p className="text-xs text-[#5A5E65] mt-1">
            Manage your academic identity, attendance thresholds, semester timetable calendar, and storage.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
        >
          Sign Out
        </Button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#F4F3EE] rounded-xl border border-[#E8E7E2] text-xs">
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'admin'
              ? 'bg-[#1E2022] text-white shadow-xs'
              : 'text-[#5A5E65] hover:text-[#1E2022] hover:bg-white/50'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-[#F4C430]" />
          Admin Reset Console
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F4C430] text-[#1E2022] font-bold uppercase">
            Admin
          </span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'profile'
              ? 'bg-white text-[#1E2022] shadow-xs'
              : 'text-[#5A5E65] hover:text-[#1E2022] hover:bg-white/50'
          }`}
        >
          <User className="w-4 h-4" />
          Student Identity & Profile
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'backup'
              ? 'bg-white text-[#1E2022] shadow-xs'
              : 'text-[#5A5E65] hover:text-[#1E2022] hover:bg-white/50'
          }`}
        >
          <Database className="w-4 h-4" />
          Data Backup & JSON
        </button>
      </div>

      {/* Tab 1: Admin Reset Console */}
      {activeTab === 'admin' && (
        <AdminResetConsole state={state} />
      )}

      {/* Tab 2: Profile & Academic Info Form */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-xl border border-[#E8E7E2] space-y-6 shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-[#1E2022] tracking-tight flex items-center gap-2">
              <User className="w-4 h-4 text-[#007FFF]" />
              Student Identity & Degree Information
            </h3>
            <p className="text-xs text-[#5A5E65] mt-0.5">
              Your university credentials and default attendance requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">University Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">University / Institute</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Department / Branch</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Current Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] focus:outline-hidden focus:border-[#007FFF]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Section</label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Roll / ID Number</label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Min. Attendance Threshold</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF] pr-7"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#848A94]">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E8E7E2]">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Semester Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Semester End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] text-[#1E2022] placeholder-[#848A94] focus:bg-white focus:outline-hidden focus:border-[#007FFF]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="sm" type="submit">
              Save Profile Settings
            </Button>
          </div>
        </form>
      )}

      {/* Tab 3: Data Backup & Workspace Management */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-xl border border-[#E8E7E2] space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-[#1E2022] tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-[#007FFF]" />
              Local Data Backup & Workspace Management
            </h3>
            <p className="text-xs text-[#5A5E65] mt-0.5">
              Export and import your entire timetable, attendance logs, notes, and profile as JSON files.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Export Academic Data (Local File) Card */}
            <div className="p-4 rounded-xl border border-[#E8E7E2] bg-[#FCFBF8] space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-[#1E2022] flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#007FFF]" />
                  Export Local JSON Backup
                </h4>
                <p className="text-[11px] text-[#5A5E65]">
                  Download a clean, portable JSON backup file directly to your device containing all semester state.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={handleExportData} className="w-full">
                Export Full Workspace (JSON)
              </Button>
            </div>

            {/* Restore / Import Data Card */}
            <div className="p-4 rounded-xl border border-[#E8E7E2] bg-[#FCFBF8] space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-[#1E2022] flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#16A34A]" />
                  Restore / Import Data
                </h4>
                <p className="text-[11px] text-[#5A5E65]">
                  Restore a previously exported Syncademic JSON backup file into your workspace.
                </p>
              </div>
              <label className="block w-full">
                <span className="sr-only">Choose backup file</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="block w-full text-xs text-[#5A5E65] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#E8E7E2] file:text-xs file:font-semibold file:bg-[#F4F3EE] file:text-[#1E2022] hover:file:bg-[#EAE8DF] cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modals */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Load Sample Engineering Dataset?"
        message="This will overwrite current courses and notes with a standard 6-course computer engineering semester dataset."
        confirmLabel="Load Sample Data"
        onConfirm={handleLoadSampleData}
        onClose={() => setIsResetConfirmOpen(false)}
        isDestructive={false}
      />

      <ConfirmModal
        isOpen={isClearAllConfirmOpen}
        title="Clear All Workspace Data?"
        message="Are you sure? This will remove all timetable slots, attendance marks, and notes, resetting the workspace to a clean state."
        confirmLabel="Clear All Data"
        isDestructive={true}
        onConfirm={handleClearAllData}
        onClose={() => setIsClearAllConfirmOpen(false)}
      />
    </div>
  );
};
