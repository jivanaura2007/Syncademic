import { AppState, Subject, AttendanceRecord, TimetableSlot, ReplacementDay, FacultyLeave, AcademicNote, AcademicEvent, StudentProfile, AISettings, GoogleDriveSettings } from '../types';

const TOKEN_STORAGE_KEY = 'syncademic_auth_token_v1';

// Session Generation Counter to prevent async race conditions during logout
let currentSessionGeneration = 1;
let unauthorizedHandler: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    unauthorizedHandler = null;
  };
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  currentSessionGeneration++;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  currentSessionGeneration++;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getSessionGeneration(): number {
  return currentSessionGeneration;
}

interface RequestOptions extends RequestInit {
  data?: any;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const requestSession = currentSessionGeneration;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
    body: options.data ? JSON.stringify(options.data) : options.body
  };

  const response = await fetch(endpoint, config);

  // Check if session changed while request was in-flight (e.g. logout happened)
  if (requestSession !== currentSessionGeneration) {
    throw new Error('Session invalidated. Request aborted.');
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      if (unauthorizedHandler) {
        try {
          unauthorizedHandler();
        } catch (e) {
          console.warn('Unauthorized handler notice:', e);
        }
      }
    }

    let errorMessage = 'An error occurred with the academic server';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = `Server error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Multimodal Universal Academic AI Extractor
  ai: {
    extractDetails: (payload: {
      fileBase64?: string;
      mimeType?: string;
      rawText?: string;
      fileName?: string;
      customKey?: string;
      targetCategory?: 'all' | 'calendar' | 'timetable' | 'notes';
    }) =>
      request<{
        success: boolean;
        docFormat: 'pdf' | 'excel' | 'csv' | 'image' | 'text';
        semesterStartDate?: string | null;
        semesterEndDate?: string | null;
        holidays: Array<{
          date: string;
          name: string;
          type: 'national' | 'university' | 'exam_break' | 'special';
          isNonAttendanceDay: boolean;
          dayOfWeekName?: string;
          description?: string;
        }>;
        events: Array<{
          title: string;
          date: string;
          type: 'exam' | 'assignment' | 'event' | 'project';
          priority: 'high' | 'medium' | 'low';
          description?: string;
        }>;
        slots: Array<{
          dayOfWeek: number;
          startTime: string;
          endTime: string;
          subjectCode: string;
          subjectName: string;
          room?: string;
          faculty?: string;
          type: 'lecture' | 'lab' | 'tutorial';
        }>;
        subjects: Array<{
          code: string;
          name: string;
          faculty: string;
          room: string;
          credits: number;
        }>;
        notes: Array<{
          title: string;
          keyPoints: string[];
          formulas?: string[];
          summary: string;
        }>;
        summary: string;
        confidenceScore: number;
      }>('/api/ai/extract-details', {
        method: 'POST',
        data: payload
      })
  },

  // Authentication
  auth: {
    login: (credentials: { email: string; passwordPlain: string; password?: string }) =>
      request<{ message: string; token: string; user: any; state: AppState }>('/api/auth/login', {
        method: 'POST',
        data: {
          email: credentials.email,
          password: credentials.passwordPlain || credentials.password
        }
      }),

    register: (userData: { email: string; passwordPlain: string; password?: string; name: string; university?: string; department?: string; semester?: number }) =>
      request<{ message: string; token: string; user: any; state: AppState }>('/api/auth/register', {
        method: 'POST',
        data: {
          email: userData.email,
          password: userData.passwordPlain || userData.password,
          name: userData.name,
          university: userData.university,
          department: userData.department,
          semester: userData.semester
        }
      }),

    getMe: () =>
      request<{ user: any; state: AppState }>('/api/auth/me'),

    updateProfile: (profile: Partial<StudentProfile>) =>
      request<{ message: string; profile: StudentProfile }>('/api/auth/profile', {
        method: 'PUT',
        data: profile
      })
  },

  // Subjects
  subjects: {
    getAll: () =>
      request<Subject[]>('/api/subjects'),

    create: (subject: Omit<Subject, 'id'>) =>
      request<Subject>('/api/subjects', {
        method: 'POST',
        data: subject
      }),

    update: (id: string, updates: Partial<Subject>) =>
      request<Subject>(`/api/subjects/${id}`, {
        method: 'PUT',
        data: updates
      }),

    delete: (id: string) =>
      request<{ message: string; subjectId: string }>(`/api/subjects/${id}`, {
        method: 'DELETE'
      })
  },

  // Attendance
  attendance: {
    getAll: () =>
      request<AttendanceRecord[]>('/api/attendance'),

    mark: (payload: { subjectId: string; date: string; timeSlot: string; status: AttendanceRecord['status']; note?: string }) =>
      request<{ record: AttendanceRecord; updatedSubject?: Subject }>('/api/attendance/mark', {
        method: 'POST',
        data: payload
      }),

    getSummary: () =>
      request<{ overallPercentage: number; totalAttended: number; totalConducted: number; subjects: any[] }>('/api/attendance/summary')
  },

  // Timetable
  timetable: {
    get: () =>
      request<{ slots: TimetableSlot[]; replacementDays: ReplacementDay[]; facultyLeaves: FacultyLeave[]; holidays: any[] }>('/api/timetable'),

    addSlot: (slot: Omit<TimetableSlot, 'id'>) =>
      request<TimetableSlot>('/api/timetable/slot', {
        method: 'POST',
        data: slot
      }),

    updateSlot: (id: string, updates: Partial<TimetableSlot>) =>
      request<TimetableSlot>(`/api/timetable/slot/${id}`, {
        method: 'PUT',
        data: updates
      }),

    deleteSlot: (id: string) =>
      request<{ message: string; slotId: string }>(`/api/timetable/slot/${id}`, {
        method: 'DELETE'
      }),

    addReplacementDay: (data: Omit<ReplacementDay, 'id'>) =>
      request<ReplacementDay>('/api/timetable/replacement-day', {
        method: 'POST',
        data: data
      }),

    deleteReplacementDay: (id: string) =>
      request<{ message: string; id: string }>(`/api/timetable/replacement-day/${id}`, {
        method: 'DELETE'
      }),

    addFacultyLeave: (data: Omit<FacultyLeave, 'id'>) =>
      request<FacultyLeave>('/api/timetable/faculty-leave', {
        method: 'POST',
        data: data
      }),

    deleteFacultyLeave: (id: string) =>
      request<{ message: string; id: string }>(`/api/timetable/faculty-leave/${id}`, {
        method: 'DELETE'
      }),

    extract: (payload: { fileBase64?: string; mimeType?: string; rawText?: string; fileName?: string; semester?: number }) =>
      request<{
        success: boolean;
        data: { semester?: number; subjects?: any[]; slots?: any[]; summary?: string };
        meta?: {
          format: import('../types').DocumentFormat;
          confidenceScore: number;
          processingTimeMs: number;
          itemsExtracted: number;
          warnings?: string[];
        };
        message?: string;
      }>('/api/timetable/extract', {
        method: 'POST',
        data: payload
      }),

    saveBulk: (payload: { slots: any[]; subjects?: any[]; mode: 'replace' | 'append' }) =>
      request<{ success: boolean; slots: TimetableSlot[]; subjects: Subject[]; count: number }>('/api/timetable/bulk', {
        method: 'POST',
        data: payload
      })
  },

  // Academic Calendar & Holidays
  calendar: {
    extract: (payload: { fileBase64?: string; mimeType?: string; rawText?: string; fileName?: string; mode?: 'calendar' | 'holidays' }) =>
      request<{
        success: boolean;
        data: {
          semesterStartDate?: string;
          semesterEndDate?: string;
          holidays?: any[];
          events?: any[];
          summary?: string;
        };
        meta?: {
          format: import('../types').DocumentFormat;
          confidenceScore: number;
          processingTimeMs: number;
          itemsExtracted: number;
          warnings?: string[];
        };
      }>('/api/events/extract-calendar', {
        method: 'POST',
        data: payload
      }),

    saveBulkHolidays: (payload: {
      holidays: any[];
      semesterStartDate?: string;
      semesterEndDate?: string;
      events?: any[];
      mode: 'replace' | 'append';
    }) =>
      request<{
        success: boolean;
        holidays: any[];
        semesterStartDate?: string;
        semesterEndDate?: string;
        events?: any[];
      }>('/api/events/bulk-holidays', {
        method: 'POST',
        data: payload
      })
  },

  // Notes
  notes: {
    getAll: (params?: { subjectId?: string; category?: string; query?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.subjectId) queryParams.set('subjectId', params.subjectId);
      if (params?.category) queryParams.set('category', params.category);
      if (params?.query) queryParams.set('query', params.query);
      const qs = queryParams.toString();
      return request<AcademicNote[]>(`/api/notes${qs ? `?${qs}` : ''}`);
    },

    create: (note: Omit<AcademicNote, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<AcademicNote>('/api/notes', {
        method: 'POST',
        data: note
      }),

    update: (id: string, updates: Partial<AcademicNote>) =>
      request<AcademicNote>(`/api/notes/${id}`, {
        method: 'PUT',
        data: updates
      }),

    delete: (id: string) =>
      request<{ message: string; noteId: string }>(`/api/notes/${id}`, {
        method: 'DELETE'
      })
  },

  // Planner Events
  events: {
    getAll: () =>
      request<AcademicEvent[]>('/api/events'),

    create: (event: Omit<AcademicEvent, 'id'>) =>
      request<AcademicEvent>('/api/events', {
        method: 'POST',
        data: event
      }),

    update: (id: string, updates: Partial<AcademicEvent>) =>
      request<AcademicEvent>(`/api/events/${id}`, {
        method: 'PUT',
        data: updates
      }),

    delete: (id: string) =>
      request<{ message: string; eventId: string }>(`/api/events/${id}`, {
        method: 'DELETE'
      })
  },

  // Settings & Workspace
  settings: {
    getState: () =>
      request<AppState>('/api/settings/state'),

    updateAI: (aiSettings: Partial<AISettings>) =>
      request<AISettings>('/api/settings/ai', {
        method: 'PUT',
        data: aiSettings
      }),

    updateSemesterDates: (dates: { startDate: string; endDate: string }) =>
      request<{ semesterStartDate: string; semesterEndDate: string }>('/api/settings/semester-dates', {
        method: 'PUT',
        data: dates
      }),

    reset: () =>
      request<{ message: string; state: AppState }>('/api/settings/reset', {
        method: 'POST'
      }),

    importWorkspace: (data: any) =>
      request<{ message: string; state: AppState }>('/api/settings/import', {
        method: 'POST',
        data
      })
  }
};
