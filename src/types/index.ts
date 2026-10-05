export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

export type AttendanceStatus = 'present' | 'absent' | 'faculty_leave' | 'holiday' | 'cancelled';

export interface Subject {
  id: string;
  code: string;
  name: string;
  faculty: string;
  room: string;
  credits: number;
  color: string; // Hex or color token for minimal identification
  targetAttendance: number; // Percentage, e.g. 75 or 80
  totalClasses: number;
  attendedClasses: number;
  syllabus?: string;
  notesCount?: number;
  targetGrade?: string; // e.g. "A+", "A", "85%"
  targetScore?: number; // e.g. 90
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:00 - 10:00"
  status: AttendanceStatus;
  note?: string;
  updatedAt: string;
}

export interface TimetableSlot {
  id: string;
  dayOfWeek: DayOfWeek; // 1 to 6
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  subjectId: string;
  room: string;
  faculty: string;
  type: 'lecture' | 'lab' | 'tutorial';
}

export interface ReplacementDay {
  id: string;
  date: string; // YYYY-MM-DD
  operatesAsDayOfWeek: DayOfWeek; // The timetable day it will follow
  reason: string; // e.g. "Replacement for Monday Holiday (Eid)"
}

export interface UniversityHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'university' | 'national' | 'exam_break' | 'special';
  description?: string;
  isNonAttendanceDay?: boolean; // Flagged as non-attendance day (exempt from attendance calculations)
  dayOfWeekName?: string; // e.g. "Monday", "Friday"
}

export interface FacultyLeave {
  id: string;
  facultyName: string;
  subjectId?: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string;
  reason?: string;
}

export type NoteCategory = 'notes' | 'assignments' | 'presentations' | 'pyqs' | 'lab_manuals' | 'other';
export type NoteFileType = 'pdf' | 'pptx' | 'docx' | 'xlsx' | 'image' | 'text' | 'link';

export interface AcademicNote {
  id: string;
  title: string;
  description?: string;
  subjectId: string;
  semester: number;
  category: NoteCategory;
  fileType: NoteFileType;
  fileSize?: string;
  fileUrl?: string; // base64 or blob or external link
  fileName?: string;
  contentText?: string; // For markdown or written notes
  isWrittenNote?: boolean;
  gdriveId?: string;
  gdriveUrl?: string;
  gdriveFolderId?: string;
  gdriveFolderName?: string;
  lastSyncedToDrive?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type AcademicEventType = 'exam' | 'assignment' | 'holiday' | 'event' | 'project';
export type EventPriority = 'low' | 'medium' | 'high';

export interface AcademicEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  time?: string;
  type: AcademicEventType;
  subjectId?: string;
  description?: string;
  priority: EventPriority;
  completed: boolean;
  isNonAttendanceDay?: boolean; // Flagged as non-attendance day when type is holiday
}

export interface BunkCalculation {
  subjectId: string;
  currentPercentage: number;
  requiredPercentage: number;
  safeBunks: number;
  classesNeededToRecover: number;
  status: 'safe' | 'warning' | 'critical';
  summaryText: string;
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter';

export interface AISettings {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  customPromptPrefix?: string;
}

export interface GoogleDriveSettings {
  connected: boolean;
  accountEmail?: string;
  accountName?: string;
  rootFolder?: string;
  autoSync: boolean;
  lastSynced?: string;
  attendanceSpreadsheetId?: string;
  attendanceSpreadsheetUrl?: string;
  lastAttendanceSync?: string;
  lastNotesSync?: string;
}

export interface StudentProfile {
  name: string;
  email: string;
  university: string;
  department: string;
  semester: number;
  section: string;
  rollNumber: string;
  defaultAttendanceThreshold: number; // e.g. 75
}

export type DocumentFormat = 'pdf' | 'excel' | 'csv' | 'image' | 'text';
export type ExtractionTarget = 'timetable' | 'academic_calendar' | 'holiday_list';

export interface ExtractionMetricRecord {
  id: string;
  fileName: string;
  format: DocumentFormat;
  target: ExtractionTarget;
  timestamp: string; // ISO string
  success: boolean;
  confidenceScore: number; // 0 to 100 percentage
  itemsExtracted: number; // e.g. number of slots, holidays, or events
  processingTimeMs: number;
  fileSize?: string;
  notes?: string;
  warnings?: string[];
  detectedFields?: {
    slotsCount?: number;
    subjectsCount?: number;
    holidaysCount?: number;
    eventsCount?: number;
    hasDateRanges?: boolean;
    hasFacultyNames?: boolean;
    hasRoomNumbers?: boolean;
  };
}

export interface FormatBenchmarkStat {
  format: DocumentFormat;
  label: string;
  extensionLabel: string;
  totalProcessed: number;
  successRate: number; // 0 to 100 percentage
  avgConfidenceScore: number; // 0 to 100 percentage
  reliabilityTier: 'optimal' | 'recommended' | 'acceptable' | 'caution';
  bestFor: string;
  feedbackTip: string;
  sampleLatencyMs: number;
}

export interface ExtractionAnalyticsSummary {
  totalProcessed: number;
  totalSuccessful: number;
  overallSuccessRate: number;
  avgConfidenceScore: number;
  totalEntitiesExtracted: number;
  bestFormat: DocumentFormat;
  formatStats: FormatBenchmarkStat[];
  recentRecords: ExtractionMetricRecord[];
}

export type MilestoneCategory = 'exam' | 'assignment' | 'project' | 'attendance' | 'academic' | 'other';
export type MilestonePriority = 'low' | 'medium' | 'high';

export interface SemesterMilestone {
  id: string;
  title: string;
  category: MilestoneCategory;
  targetDate: string; // YYYY-MM-DD
  subjectId?: string; // Optional reference to a specific subject
  targetMetric?: string; // e.g. "Score >= 85%", "75% Compliance", "Final Submission"
  priority: MilestonePriority;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface AppState {
  profile: StudentProfile;
  subjects: Subject[];
  attendanceRecords: AttendanceRecord[];
  timetableSlots: TimetableSlot[];
  replacementDays: ReplacementDay[];
  holidays: UniversityHoliday[];
  facultyLeaves: FacultyLeave[];
  notes: AcademicNote[];
  events: AcademicEvent[];
  aiSettings: AISettings;
  googleDriveSettings: GoogleDriveSettings;
  isAuthenticated: boolean;
  semesterStartDate: string; // YYYY-MM-DD
  semesterEndDate: string; // YYYY-MM-DD
  extractionMetrics?: ExtractionMetricRecord[];
  semesterMilestones?: SemesterMilestone[];
}
