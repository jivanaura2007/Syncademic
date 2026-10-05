import { AppState, Subject, AttendanceRecord, TimetableSlot, ReplacementDay, UniversityHoliday, FacultyLeave, AcademicNote, AcademicEvent, AISettings, GoogleDriveSettings, StudentProfile, ExtractionMetricRecord, ExtractionAnalyticsSummary, FormatBenchmarkStat, DocumentFormat, SemesterMilestone } from '../types';
import { cleanInitialAppState, sampleDemoAppState, initialHolidays, initialExtractionMetrics, initialSemesterMilestones } from '../utils/sampleData';
import { api, setAuthToken, clearAuthToken, getAuthToken, registerUnauthorizedHandler } from './api';

const STORAGE_KEY = 'syncademic_academic_workspace_v1';
const LISTENERS: Array<() => void> = [];

export function getStoredState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const token = getAuthToken();

    // If no token exists, the user is unauthenticated: state MUST be clean and not authenticated
    if (!token) {
      return {
        ...cleanInitialAppState,
        isAuthenticated: false
      };
    }

    if (!raw) {
      return {
        ...cleanInitialAppState,
        extractionMetrics: initialExtractionMetrics,
        semesterMilestones: initialSemesterMilestones,
        isAuthenticated: true
      };
    }

    const parsed = JSON.parse(raw);
    return {
      ...cleanInitialAppState,
      ...parsed,
      profile: { ...cleanInitialAppState.profile, ...(parsed.profile || {}) },
      aiSettings: { ...cleanInitialAppState.aiSettings, ...(parsed.aiSettings || {}) },
      googleDriveSettings: { ...cleanInitialAppState.googleDriveSettings, ...(parsed.googleDriveSettings || {}) },
      extractionMetrics: Array.isArray(parsed.extractionMetrics) ? parsed.extractionMetrics : initialExtractionMetrics,
      semesterMilestones: Array.isArray(parsed.semesterMilestones) && parsed.semesterMilestones.length > 0
        ? parsed.semesterMilestones
        : initialSemesterMilestones,
      isAuthenticated: true
    };
  } catch (err) {
    console.error('Error loading Syncademic state from localStorage:', err);
    return {
      ...cleanInitialAppState,
      isAuthenticated: false
    };
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notifyListeners();
  } catch (err) {
    console.error('Error saving Syncademic state to localStorage:', err);
  }
}

export function subscribeToState(listener: (state: AppState) => void): () => void {
  const handler = () => listener(getStoredState());
  LISTENERS.push(handler);
  return () => {
    const idx = LISTENERS.indexOf(handler);
    if (idx !== -1) {
      LISTENERS.splice(idx, 1);
    }
  };
}

export function subscribeToStateChanges(listener: () => void): () => void {
  LISTENERS.push(listener);
  return () => {
    const idx = LISTENERS.indexOf(listener);
    if (idx !== -1) {
      LISTENERS.splice(idx, 1);
    }
  };
}

function notifyListeners() {
  for (const listener of LISTENERS) {
    try {
      listener();
    } catch (e) {
      console.error('State listener error:', e);
    }
  }
}

// =================== AUTHENTICATION & SESSION LIFECYCLE ===================

/**
 * Cleanly resets the entire authenticated session:
 * 1. Clears token
 * 2. Clears user-specific cache and stored state
 * 3. Notifies all React listeners with a clean unauthenticated state
 */
export function performLogout(): void {
  clearAuthToken();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Storage removal notice:', e);
  }

  const cleanState: AppState = {
    ...cleanInitialAppState,
    isAuthenticated: false
  };

  notifyListeners();
}

/**
 * Sets an active authenticated session for a user
 */
export function setAuthenticatedSession(token: string, userState: AppState): void {
  setAuthToken(token);
  const hydratedState: AppState = {
    ...cleanInitialAppState,
    ...userState,
    isAuthenticated: true
  };
  saveState(hydratedState);
}

/**
 * Automatically hook into 401 Unauthorized API responses
 */
registerUnauthorizedHandler(() => {
  performLogout();
});

// =================== SERVER SYNC ===================

export async function syncWithServer(): Promise<AppState | null> {
  const token = getAuthToken();
  if (!token) {
    // If unauthenticated, ensure no cached user data is active
    performLogout();
    return null;
  }

  try {
    const res = await api.auth.getMe();
    if (res && res.state) {
      const syncedState: AppState = {
        ...cleanInitialAppState,
        ...res.state,
        isAuthenticated: true
      };
      saveState(syncedState);
      return syncedState;
    }
    return null;
  } catch (err: any) {
    console.warn('Server session validation error:', err.message);
    performLogout();
    return null;
  }
}

export function setAuthenticated(isAuth: boolean): void {
  if (!isAuth) {
    performLogout();
  } else {
    const current = getStoredState();
    saveState({ ...current, isAuthenticated: true });
  }
}

export function updateProfile(profile: Partial<StudentProfile>): void {
  const current = getStoredState();
  const updatedState = {
    ...current,
    profile: { ...current.profile, ...profile }
  };
  saveState(updatedState);

  // Sync to Backend
  api.auth.updateProfile(profile).catch(err => {
    console.warn('Backend profile sync note:', err.message);
  });
}

// =================== SUBJECTS CRUD ===================

export function addSubject(subject: Omit<Subject, 'id'>): Subject {
  const current = getStoredState();
  const newSubject: Subject = {
    ...subject,
    id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
  };
  saveState({
    ...current,
    subjects: [...current.subjects, newSubject]
  });

  // Sync to Backend
  api.subjects.create(subject).catch(err => {
    console.warn('Backend subject create sync note:', err.message);
  });

  return newSubject;
}

export function updateSubject(subjectId: string, updates: Partial<Subject>): void {
  const current = getStoredState();
  saveState({
    ...current,
    subjects: current.subjects.map(s => s.id === subjectId ? { ...s, ...updates } : s)
  });

  // Sync to Backend
  api.subjects.update(subjectId, updates).catch(err => {
    console.warn('Backend subject update sync note:', err.message);
  });
}

export function deleteSubject(subjectId: string): void {
  const current = getStoredState();
  saveState({
    ...current,
    subjects: current.subjects.filter(s => s.id !== subjectId),
    attendanceRecords: current.attendanceRecords.filter(r => r.subjectId !== subjectId),
    timetableSlots: current.timetableSlots.filter(t => t.subjectId !== subjectId),
    notes: current.notes.filter(n => n.subjectId !== subjectId),
    events: current.events.filter(e => e.subjectId !== subjectId)
  });

  // Sync to Backend
  api.subjects.delete(subjectId).catch(err => {
    console.warn('Backend subject delete sync note:', err.message);
  });
}

// =================== ATTENDANCE CRUD & MARKING ===================

export function markClassAttendance(
  subjectId: string,
  date: string,
  timeSlot: string,
  status: AttendanceRecord['status'],
  note?: string
): void {
  const current = getStoredState();
  const existingIdx = current.attendanceRecords.findIndex(
    r => r.subjectId === subjectId && r.date === date && r.timeSlot === timeSlot
  );

  let updatedRecords = [...current.attendanceRecords];
  let prevStatus: AttendanceRecord['status'] | null = null;

  if (existingIdx !== -1) {
    prevStatus = updatedRecords[existingIdx].status;
    updatedRecords[existingIdx] = {
      ...updatedRecords[existingIdx],
      status,
      note: note !== undefined ? note : updatedRecords[existingIdx].note,
      updatedAt: new Date().toISOString()
    };
  } else {
    updatedRecords.push({
      id: 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      subjectId,
      date,
      timeSlot,
      status,
      note,
      updatedAt: new Date().toISOString()
    });
  }

  // Update Subject attended / total counts
  const targetSubject = current.subjects.find(s => s.id === subjectId);
  let updatedSubjects = current.subjects;

  if (targetSubject) {
    let deltaAttended = 0;
    let deltaTotal = 0;

    if (prevStatus === null) {
      if (status === 'present') {
        deltaAttended = 1;
        deltaTotal = 1;
      } else if (status === 'absent') {
        deltaTotal = 1;
      }
    } else if (prevStatus !== status) {
      if (prevStatus === 'present') {
        deltaAttended -= 1;
        deltaTotal -= 1;
      } else if (prevStatus === 'absent') {
        deltaTotal -= 1;
      }

      if (status === 'present') {
        deltaAttended += 1;
        deltaTotal += 1;
      } else if (status === 'absent') {
        deltaTotal += 1;
      }
    }

    if (deltaAttended !== 0 || deltaTotal !== 0) {
      const newAttended = Math.max(0, targetSubject.attendedClasses + deltaAttended);
      const newTotal = Math.max(newAttended, targetSubject.totalClasses + deltaTotal);
      updatedSubjects = current.subjects.map(s =>
        s.id === subjectId ? { ...s, attendedClasses: newAttended, totalClasses: newTotal } : s
      );
    }
  }

  saveState({
    ...current,
    attendanceRecords: updatedRecords,
    subjects: updatedSubjects
  });

  // Sync to Backend
  api.attendance.mark({
    subjectId,
    date,
    timeSlot,
    status,
    note
  }).catch(err => {
    console.warn('Backend attendance mark sync note:', err.message);
  });
}

// =================== TIMETABLE CRUD ===================

export function addTimetableSlot(slot: Omit<TimetableSlot, 'id'>): TimetableSlot {
  const current = getStoredState();
  const newSlot: TimetableSlot = {
    ...slot,
    id: 'slot-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
  };
  saveState({
    ...current,
    timetableSlots: [...current.timetableSlots, newSlot]
  });

  // Sync to Backend
  api.timetable.addSlot(slot).catch(err => {
    console.warn('Backend timetable slot create sync note:', err.message);
  });

  return newSlot;
}

export function updateTimetableSlot(slotId: string, updates: Partial<TimetableSlot>): void {
  const current = getStoredState();
  saveState({
    ...current,
    timetableSlots: current.timetableSlots.map(s => s.id === slotId ? { ...s, ...updates } : s)
  });

  // Sync to Backend
  api.timetable.updateSlot(slotId, updates).catch(err => {
    console.warn('Backend timetable slot update sync note:', err.message);
  });
}

export function deleteTimetableSlot(slotId: string): void {
  const current = getStoredState();
  saveState({
    ...current,
    timetableSlots: current.timetableSlots.filter(s => s.id !== slotId)
  });

  // Sync to Backend
  api.timetable.deleteSlot(slotId).catch(err => {
    console.warn('Backend timetable slot delete sync note:', err.message);
  });
}

export function addReplacementDay(day: Omit<ReplacementDay, 'id'>): ReplacementDay {
  const current = getStoredState();
  const newDay: ReplacementDay = {
    ...day,
    id: 'rep-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
  };
  saveState({
    ...current,
    replacementDays: [...current.replacementDays, newDay]
  });

  api.timetable.addReplacementDay(day).catch(err => {
    console.warn('Backend replacement day sync note:', err.message);
  });

  return newDay;
}

export function deleteReplacementDay(dayId: string): void {
  const current = getStoredState();
  saveState({
    ...current,
    replacementDays: current.replacementDays.filter(d => d.id !== dayId)
  });

  api.timetable.deleteReplacementDay(dayId).catch(err => {
    console.warn('Backend delete replacement day sync note:', err.message);
  });
}

export function addFacultyLeave(leave: Omit<FacultyLeave, 'id'>): FacultyLeave {
  const current = getStoredState();
  const newLeave: FacultyLeave = {
    ...leave,
    id: 'fl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
  };
  saveState({
    ...current,
    facultyLeaves: [...current.facultyLeaves, newLeave]
  });

  api.timetable.addFacultyLeave(leave).catch(err => {
    console.warn('Backend faculty leave sync note:', err.message);
  });

  return newLeave;
}

export function deleteFacultyLeave(leaveId: string): void {
  const current = getStoredState();
  saveState({
    ...current,
    facultyLeaves: current.facultyLeaves.filter(l => l.id !== leaveId)
  });

  api.timetable.deleteFacultyLeave(leaveId).catch(err => {
    console.warn('Backend delete faculty leave sync note:', err.message);
  });
}

// =================== NOTES CRUD ===================

export function addNote(note: Omit<AcademicNote, 'id' | 'createdAt' | 'updatedAt'>): AcademicNote {
  const current = getStoredState();
  const now = new Date().toISOString();
  const newNote: AcademicNote = {
    ...note,
    id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    createdAt: now,
    updatedAt: now
  };
  
  // Increment subject note count
  const updatedSubjects = current.subjects.map(s =>
    s.id === note.subjectId ? { ...s, notesCount: (s.notesCount || 0) + 1 } : s
  );

  saveState({
    ...current,
    notes: [newNote, ...current.notes],
    subjects: updatedSubjects
  });

  api.notes.create(note).catch(err => {
    console.warn('Backend note create sync note:', err.message);
  });

  return newNote;
}

export function updateNote(noteId: string, updates: Partial<AcademicNote>): void {
  const current = getStoredState();
  saveState({
    ...current,
    notes: current.notes.map(n => n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)
  });

  api.notes.update(noteId, updates).catch(err => {
    console.warn('Backend note update sync note:', err.message);
  });
}

export function deleteNote(noteId: string): void {
  const current = getStoredState();
  const targetNote = current.notes.find(n => n.id === noteId);

  let updatedSubjects = current.subjects;
  if (targetNote) {
    updatedSubjects = current.subjects.map(s =>
      s.id === targetNote.subjectId ? { ...s, notesCount: Math.max(0, (s.notesCount || 1) - 1) } : s
    );
  }

  saveState({
    ...current,
    notes: current.notes.filter(n => n.id !== noteId),
    subjects: updatedSubjects
  });

  api.notes.delete(noteId).catch(err => {
    console.warn('Backend note delete sync note:', err.message);
  });
}

// =================== PLANNER EVENTS CRUD ===================

export function addEvent(event: Omit<AcademicEvent, 'id'>): AcademicEvent {
  const current = getStoredState();
  const newEvent: AcademicEvent = {
    ...event,
    id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
  };
  saveState({
    ...current,
    events: [...current.events, newEvent]
  });

  api.events.create(event).catch(err => {
    console.warn('Backend event create sync note:', err.message);
  });

  return newEvent;
}

export function updateEvent(eventId: string, updates: Partial<AcademicEvent>): void {
  const current = getStoredState();
  saveState({
    ...current,
    events: current.events.map(e => e.id === eventId ? { ...e, ...updates } : e)
  });

  api.events.update(eventId, updates).catch(err => {
    console.warn('Backend event update sync note:', err.message);
  });
}

export function deleteEvent(eventId: string): void {
  const current = getStoredState();
  saveState({
    ...current,
    events: current.events.filter(e => e.id !== eventId)
  });

  api.events.delete(eventId).catch(err => {
    console.warn('Backend event delete sync note:', err.message);
  });
}

// =================== HOLIDAYS CRUD ===================

export function addHoliday(holiday: Omit<UniversityHoliday, 'id'>): UniversityHoliday {
  const current = getStoredState();
  const newHoliday: UniversityHoliday = {
    ...holiday,
    id: 'hol-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
  };
  const updatedHolidays = [...current.holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date));
  saveState({
    ...current,
    holidays: updatedHolidays
  });
  return newHoliday;
}

export function deleteHoliday(holidayId: string): void {
  const current = getStoredState();
  saveState({
    ...current,
    holidays: current.holidays.filter(h => h.id !== holidayId)
  });
}

export function setBulkHolidays(
  holidays: UniversityHoliday[],
  semesterDates?: { startDate?: string; endDate?: string },
  mode: 'replace' | 'append' = 'replace'
): void {
  const current = getStoredState();
  const updatedHolidays = mode === 'replace'
    ? holidays.sort((a, b) => a.date.localeCompare(b.date))
    : [...current.holidays.filter(h => !holidays.some(nh => nh.date === h.date)), ...holidays].sort((a, b) => a.date.localeCompare(b.date));

  const updatedState: AppState = {
    ...current,
    holidays: updatedHolidays
  };

  if (semesterDates?.startDate) updatedState.semesterStartDate = semesterDates.startDate;
  if (semesterDates?.endDate) updatedState.semesterEndDate = semesterDates.endDate;

  saveState(updatedState);

  api.calendar.saveBulkHolidays({
    holidays: updatedHolidays,
    semesterStartDate: semesterDates?.startDate,
    semesterEndDate: semesterDates?.endDate,
    mode
  }).catch(err => {
    console.warn('Backend holiday bulk save sync note:', err.message);
  });
}

export function setBulkTimetableSlots(
  slots: TimetableSlot[],
  newSubjects?: Subject[],
  mode: 'replace' | 'append' = 'replace'
): void {
  const current = getStoredState();
  let updatedSubjects = [...current.subjects];

  if (newSubjects && newSubjects.length > 0) {
    for (const ns of newSubjects) {
      if (!updatedSubjects.some(s => s.code.toLowerCase() === ns.code.toLowerCase() || s.id === ns.id)) {
        updatedSubjects.push(ns);
      }
    }
  }

  const updatedSlots = mode === 'replace'
    ? slots
    : [...current.timetableSlots, ...slots];

  saveState({
    ...current,
    subjects: updatedSubjects,
    timetableSlots: updatedSlots
  });

  api.timetable.saveBulk({
    slots: updatedSlots,
    subjects: updatedSubjects,
    mode
  }).catch(err => {
    console.warn('Backend timetable bulk save sync note:', err.message);
  });
}

// =================== SEMESTER MILESTONES & SUBJECT TARGETS ===================

export function addSemesterMilestone(milestone: Omit<SemesterMilestone, 'id'>): SemesterMilestone {
  const current = getStoredState();
  const newMilestone: SemesterMilestone = {
    ...milestone,
    id: 'ms-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
  };
  const updated = [...(current.semesterMilestones || []), newMilestone];
  saveState({
    ...current,
    semesterMilestones: updated
  });
  return newMilestone;
}

export function updateSemesterMilestone(id: string, updates: Partial<SemesterMilestone>): void {
  const current = getStoredState();
  const updated = (current.semesterMilestones || []).map(m => m.id === id ? { ...m, ...updates } : m);
  saveState({
    ...current,
    semesterMilestones: updated
  });
}

export function deleteSemesterMilestone(id: string): void {
  const current = getStoredState();
  const updated = (current.semesterMilestones || []).filter(m => m.id !== id);
  saveState({
    ...current,
    semesterMilestones: updated
  });
}

export function toggleSemesterMilestone(id: string): void {
  const current = getStoredState();
  const updated = (current.semesterMilestones || []).map(m => {
    if (m.id === id) {
      const completed = !m.completed;
      return {
        ...m,
        completed,
        completedAt: completed ? new Date().toISOString() : undefined
      };
    }
    return m;
  });
  saveState({
    ...current,
    semesterMilestones: updated
  });
}

export function setSubjectTarget(subjectId: string, targetAttendance: number, targetGrade?: string): void {
  const current = getStoredState();
  const updates: Partial<Subject> = { targetAttendance };
  if (targetGrade !== undefined) {
    updates.targetGrade = targetGrade;
  }
  updateSubject(subjectId, updates);
}

export function setAllSubjectTargets(targetAttendance: number): void {
  const current = getStoredState();
  const updatedSubjects = current.subjects.map(s => ({
    ...s,
    targetAttendance
  }));
  saveState({
    ...current,
    subjects: updatedSubjects
  });

  // Sync to backend for each subject asynchronously
  updatedSubjects.forEach(s => {
    api.subjects.update(s.id, { targetAttendance }).catch(err => {
      console.warn(`Backend sync error updating target for ${s.code}:`, err.message);
    });
  });
}

// =================== SETTINGS & CONFIG ===================

export function updateAISettings(aiSettings: Partial<AISettings>): void {
  const current = getStoredState();
  saveState({
    ...current,
    aiSettings: { ...current.aiSettings, ...aiSettings }
  });

  api.settings.updateAI(aiSettings).catch(err => {
    console.warn('Backend AI settings sync note:', err.message);
  });
}

export function updateGoogleDriveSettings(googleDriveSettings: Partial<GoogleDriveSettings>): void {
  const current = getStoredState();
  saveState({
    ...current,
    googleDriveSettings: { ...current.googleDriveSettings, ...googleDriveSettings }
  });
}

export function updateSemesterDates(startDate: string, endDate: string): void {
  const current = getStoredState();
  saveState({
    ...current,
    semesterStartDate: startDate,
    semesterEndDate: endDate
  });

  api.settings.updateSemesterDates({ startDate, endDate }).catch(err => {
    console.warn('Backend semester dates sync note:', err.message);
  });
}

export function loadDemoSampleData(): void {
  const current = getStoredState();
  const demoState: AppState = {
    ...sampleDemoAppState,
    profile: {
      ...sampleDemoAppState.profile,
      email: current.profile.email || sampleDemoAppState.profile.email
    },
    isAuthenticated: current.isAuthenticated
  };
  saveState(demoState);
  api.settings.importWorkspace(demoState).catch(err => {
    console.warn('Backend demo import note:', err.message);
  });
}

export function resetToCleanWorkspace(): void {
  const current = getStoredState();
  const cleanState: AppState = {
    ...cleanInitialAppState,
    profile: current.profile,
    isAuthenticated: current.isAuthenticated
  };
  saveState(cleanState);
  api.settings.reset().catch(err => {
    console.warn('Backend reset note:', err.message);
  });
}

// =================== ADMIN RESET CONTROLS ===================

/**
 * Admin: Resets all attendance records and zeroes out attendance counters for all courses.
 * Retains subjects, syllabus, timetable slots, notes, and milestones intact.
 */
export function adminResetAllAttendance(): void {
  const current = getStoredState();
  const updatedSubjects = current.subjects.map(s => ({
    ...s,
    attendedClasses: 0,
    totalClasses: 0
  }));

  const updatedState: AppState = {
    ...current,
    subjects: updatedSubjects,
    attendanceRecords: []
  };

  saveState(updatedState);
  api.settings.reset().catch(err => {
    console.warn('Backend reset sync:', err.message);
  });
}

/**
 * Admin: Resets attendance for a specific subject/course.
 */
export function adminResetCourseAttendance(subjectId: string, attended: number = 0, total: number = 0): void {
  const current = getStoredState();
  const updatedSubjects = current.subjects.map(s => {
    if (s.id === subjectId) {
      return {
        ...s,
        attendedClasses: Math.max(0, Number(attended)),
        totalClasses: Math.max(Number(attended), Number(total))
      };
    }
    return s;
  });

  const updatedRecords = current.attendanceRecords.filter(r => r.subjectId !== subjectId);

  const updatedState: AppState = {
    ...current,
    subjects: updatedSubjects,
    attendanceRecords: updatedRecords
  };

  saveState(updatedState);
}

/**
 * Admin: Resets timetable schedule, replacement days, and faculty leaves.
 */
export function adminResetTimetable(): void {
  const current = getStoredState();
  const updatedState: AppState = {
    ...current,
    timetableSlots: [],
    replacementDays: [],
    facultyLeaves: []
  };
  saveState(updatedState);
}

/**
 * Admin: Resets semester milestones and targets.
 */
export function adminResetMilestones(): void {
  const current = getStoredState();
  const updatedState: AppState = {
    ...current,
    semesterMilestones: []
  };
  saveState(updatedState);
}

/**
 * Admin: Resets stored smart notes and study documents.
 */
export function adminResetNotes(): void {
  const current = getStoredState();
  const updatedState: AppState = {
    ...current,
    notes: []
  };
  saveState(updatedState);
}

/**
 * Admin: Master full reset of all workspace data to a clean initial state.
 */
export function adminMasterFullReset(): void {
  resetToCleanWorkspace();
}

/**
 * Admin: Restores the complete verified computer engineering demo curriculum.
 */
export function adminRestoreDemoCurriculum(): void {
  loadDemoSampleData();
}

export function resetToSampleData(): void {
  loadDemoSampleData();
}

export function resetToInitialSampleData(): void {
  loadDemoSampleData();
}

export function clearAllUserData(): void {
  resetToCleanWorkspace();
}

export function exportWorkspaceJSON(): string {
  return JSON.stringify(getStoredState(), null, 2);
}

export function exportAppStateAsJson(): string {
  return JSON.stringify(getStoredState(), null, 2);
}

export function importAppStateFromJson(jsonString: string): boolean {
  const res = importWorkspaceJSON(jsonString);
  return res.success;
}

export function importWorkspaceJSON(jsonString: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON file structure.' };
    }
    const validatedState: AppState = {
      ...cleanInitialAppState,
      ...parsed,
      profile: { ...cleanInitialAppState.profile, ...(parsed.profile || {}) },
      subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
      attendanceRecords: Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords : [],
      timetableSlots: Array.isArray(parsed.timetableSlots) ? parsed.timetableSlots : [],
      replacementDays: Array.isArray(parsed.replacementDays) ? parsed.replacementDays : [],
      holidays: Array.isArray(parsed.holidays) ? parsed.holidays : initialHolidays,
      facultyLeaves: Array.isArray(parsed.facultyLeaves) ? parsed.facultyLeaves : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      extractionMetrics: Array.isArray(parsed.extractionMetrics) ? parsed.extractionMetrics : initialExtractionMetrics
    };
    saveState(validatedState);
    api.settings.importWorkspace(validatedState).catch(err => {
      console.warn('Backend import note:', err.message);
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to parse JSON file.' };
  }
}

// =================== EXTRACTION METRICS & BENCHMARK ANALYTICS ===================

export function logExtractionMetric(metric: Omit<ExtractionMetricRecord, 'id' | 'timestamp'>): ExtractionMetricRecord {
  const state = getStoredState();
  const newRecord: ExtractionMetricRecord = {
    ...metric,
    id: 'met-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString()
  };
  const currentList = Array.isArray(state.extractionMetrics) ? state.extractionMetrics : [];
  const updatedList = [newRecord, ...currentList];
  saveState({
    ...state,
    extractionMetrics: updatedList
  });
  return newRecord;
}

export function clearExtractionMetrics(): void {
  const state = getStoredState();
  saveState({
    ...state,
    extractionMetrics: []
  });
}

export function computeExtractionSummary(records: ExtractionMetricRecord[] | undefined): ExtractionAnalyticsSummary {
  const list = Array.isArray(records) && records.length > 0 ? records : initialExtractionMetrics;
  const totalProcessed = list.length;
  const successfulRecords = list.filter(r => r.success);
  const totalSuccessful = successfulRecords.length;
  const overallSuccessRate = totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 1000) / 10 : 0;

  const avgConfidenceScore = totalSuccessful > 0
    ? Math.round(successfulRecords.reduce((acc, curr) => acc + curr.confidenceScore, 0) / totalSuccessful)
    : 0;

  const totalEntitiesExtracted = successfulRecords.reduce((acc, curr) => acc + (curr.itemsExtracted || 0), 0);

  const formatDefinitions: Array<{
    format: DocumentFormat;
    label: string;
    extensionLabel: string;
    bestFor: string;
    feedbackTip: string;
    benchmarkConfidence: number;
    sampleLatencyMs: number;
  }> = [
    {
      format: 'excel',
      label: 'Excel Spreadsheets',
      extensionLabel: '.xlsx, .xls',
      bestFor: 'Batch timetable grids, complete course schedules & multi-sheet calendars',
      feedbackTip: 'Highest fidelity with zero OCR noise. Structured cell values map directly into timetable periods.',
      benchmarkConfidence: 99,
      sampleLatencyMs: 980
    },
    {
      format: 'csv',
      label: 'CSV Data Files',
      extensionLabel: '.csv',
      bestFor: 'Exported schedules, clean text tables, tabular holiday lists',
      feedbackTip: 'Instant tokenization with predictable delimiter parsing. 100% deterministic entity extraction.',
      benchmarkConfidence: 98,
      sampleLatencyMs: 820
    },
    {
      format: 'pdf',
      label: 'PDF Documents & Circulars',
      extensionLabel: '.pdf',
      bestFor: 'Official university circulars, formatted PDF timetables, multi-page notices',
      feedbackTip: 'Excellent for native digital PDFs with tabular text. Scanned PDFs parsed via high-res OCR layer.',
      benchmarkConfidence: 95,
      sampleLatencyMs: 1420
    },
    {
      format: 'text',
      label: 'Pasted Text & Circulars',
      extensionLabel: 'raw text',
      bestFor: 'Dean / HOD email circulars, WhatsApp group notifications, plain text syllabus',
      feedbackTip: 'Direct prompt context bypasses OCR step. Best when dates and times are clearly written.',
      benchmarkConfidence: 92,
      sampleLatencyMs: 650
    },
    {
      format: 'image',
      label: 'Photos & Mobile Scans',
      extensionLabel: '.jpg, .png, .webp',
      bestFor: 'Noticeboard camera photos, printed timetable charts, phone screenshots',
      feedbackTip: 'Works best when photographed under even lighting with minimal perspective warp or shadow.',
      benchmarkConfidence: 87,
      sampleLatencyMs: 2150
    }
  ];

  const formatStats: FormatBenchmarkStat[] = formatDefinitions.map(def => {
    const matching = list.filter(r => r.format === def.format);
    const count = matching.length;
    const succCount = matching.filter(r => r.success).length;
    const succRate = count > 0 ? Math.round((succCount / count) * 100) : 100;
    const avgConf = succCount > 0
      ? Math.round(matching.filter(r => r.success).reduce((acc, curr) => acc + curr.confidenceScore, 0) / succCount)
      : def.benchmarkConfidence;

    let reliabilityTier: 'optimal' | 'recommended' | 'acceptable' | 'caution' = 'recommended';
    if (avgConf >= 97) reliabilityTier = 'optimal';
    else if (avgConf >= 90) reliabilityTier = 'recommended';
    else if (avgConf >= 80) reliabilityTier = 'acceptable';
    else reliabilityTier = 'caution';

    return {
      format: def.format,
      label: def.label,
      extensionLabel: def.extensionLabel,
      totalProcessed: count,
      successRate: succRate,
      avgConfidenceScore: avgConf,
      reliabilityTier,
      bestFor: def.bestFor,
      feedbackTip: def.feedbackTip,
      sampleLatencyMs: def.sampleLatencyMs
    };
  });

  const sortedFormats = [...formatStats].sort((a, b) => b.avgConfidenceScore - a.avgConfidenceScore);
  const bestFormat = sortedFormats[0]?.format || 'excel';

  return {
    totalProcessed,
    totalSuccessful,
    overallSuccessRate,
    avgConfidenceScore,
    totalEntitiesExtracted,
    bestFormat,
    formatStats,
    recentRecords: list.slice(0, 10)
  };
}
