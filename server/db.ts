import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import initSqlJs, { Database } from 'sql.js';
import { initialAppState } from '../src/utils/sampleData';
import {
  AppState,
  Subject,
  AttendanceRecord,
  TimetableSlot,
  ReplacementDay,
  FacultyLeave,
  AcademicNote,
  AcademicEvent,
  StudentProfile,
  GoogleDriveSettings,
  DayOfWeek,
  AttendanceStatus,
  NoteCategory,
  NoteFileType,
  AcademicEventType,
  EventPriority
} from '../src/types';

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  state: AppState;
}

const DB_FILE_PATH = path.join(process.cwd(), 'syncademic.sqlite');

class SqliteDatabaseStore {
  private db: Database | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init() {
    const SQL = await initSqlJs();
    let loaded = false;

    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        const fileBuffer = fs.readFileSync(DB_FILE_PATH);
        if (fileBuffer.length > 0) {
          this.db = new SQL.Database(fileBuffer);
          // Verify with a test query to ensure the disk image is valid
          this.db.exec('SELECT 1;');
          loaded = true;
        }
      } catch (err) {
        console.warn('SQLite database file was malformed or corrupted. Rebuilding fresh database:', err);
        try {
          fs.unlinkSync(DB_FILE_PATH);
        } catch {
          // ignore
        }
      }
    }

    if (!loaded) {
      this.db = new SQL.Database();
    }

    this.createTables();
    this.seedDemoUser();
    this.saveToFile();
  }

  public async ready(): Promise<void> {
    await this.initPromise;
  }

  private saveToFile() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tempPath = `${DB_FILE_PATH}.tmp`;
      fs.writeFileSync(tempPath, buffer);
      fs.renameSync(tempPath, DB_FILE_PATH);
    } catch (e) {
      console.error('Error saving SQLite database to disk:', e);
    }
  }

  private createTables() {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        university TEXT DEFAULT 'Institute of Technology',
        department TEXT DEFAULT 'Computer Science & Engineering',
        semester INTEGER DEFAULT 4,
        section TEXT DEFAULT 'Section A',
        roll_number TEXT DEFAULT 'CS-2024-089',
        default_attendance_threshold INTEGER DEFAULT 75,
        semester_start_date TEXT DEFAULT '2026-01-05',
        semester_end_date TEXT DEFAULT '2026-05-30',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        faculty TEXT DEFAULT 'Faculty Member',
        credits INTEGER DEFAULT 3,
        target_attendance INTEGER DEFAULT 75,
        attended_classes INTEGER DEFAULT 0,
        total_classes INTEGER DEFAULT 0,
        color TEXT DEFAULT '#007FFF',
        room TEXT DEFAULT 'Room 301',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        status TEXT NOT NULL,
        note TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS timetable_slots (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        room TEXT DEFAULT 'Room 301',
        faculty TEXT DEFAULT 'Faculty Member',
        type TEXT DEFAULT 'lecture',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS replacement_days (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        operates_as_day_of_week INTEGER NOT NULL,
        reason TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS faculty_leaves (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        faculty_name TEXT NOT NULL,
        subject_id TEXT,
        date TEXT NOT NULL,
        reason TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS academic_notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        semester INTEGER DEFAULT 4,
        category TEXT DEFAULT 'notes',
        content_text TEXT,
        gdrive_url TEXT,
        gdrive_id TEXT,
        file_type TEXT DEFAULT 'text',
        tags TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS academic_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        end_date TEXT,
        time TEXT,
        type TEXT DEFAULT 'assignment',
        subject_id TEXT,
        description TEXT,
        priority TEXT DEFAULT 'medium',
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS googledrive_tokens (
        user_id TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        account_email TEXT,
        account_name TEXT,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password + 'syncademic_salt_2026').digest('hex');
  }

  private seedDemoUser() {
    if (!this.db) return;

    const demoEmail = 'aarav.sharma@university.edu';
    const stmt = this.db.prepare('SELECT id FROM users WHERE email = :email');
    stmt.bind({ ':email': demoEmail });
    const exists = stmt.step();
    stmt.free();

    if (!exists) {
      const demoId = 'user-demo-1';
      const passwordHash = this.hashPassword('password123');
      const now = new Date().toISOString();

      this.db.run(`
        INSERT INTO users (id, email, password_hash, name, university, department, semester, section, roll_number, default_attendance_threshold, semester_start_date, semester_end_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        demoId,
        demoEmail,
        passwordHash,
        'Aarav Sharma',
        'National Institute of Technology',
        'Computer Science & Engineering',
        4,
        'Section B',
        'CS22B042',
        75,
        '2026-01-05',
        '2026-05-30',
        now
      ]);

      // Seed subjects
      for (const s of initialAppState.subjects) {
        this.db.run(`
          INSERT OR REPLACE INTO subjects (id, user_id, name, code, faculty, credits, target_attendance, attended_classes, total_classes, color, room)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          s.id,
          demoId,
          s.name,
          s.code,
          s.faculty,
          s.credits,
          s.targetAttendance,
          s.attendedClasses,
          s.totalClasses,
          s.color,
          s.room
        ]);
      }

      // Seed timetable
      for (const t of initialAppState.timetableSlots) {
        this.db.run(`
          INSERT OR REPLACE INTO timetable_slots (id, user_id, day_of_week, start_time, end_time, subject_id, room, faculty, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          t.id,
          demoId,
          t.dayOfWeek,
          t.startTime,
          t.endTime,
          t.subjectId,
          t.room,
          t.faculty,
          t.type
        ]);
      }

      // Seed notes
      for (const n of initialAppState.notes) {
        this.db.run(`
          INSERT OR REPLACE INTO academic_notes (id, user_id, title, subject_id, semester, category, content_text, gdrive_url, gdrive_id, file_type, tags, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          n.id,
          demoId,
          n.title,
          n.subjectId,
          n.semester,
          n.category,
          n.contentText || '',
          n.gdriveUrl || null,
          n.gdriveId || null,
          n.fileType,
          JSON.stringify(n.tags),
          n.createdAt,
          n.updatedAt
        ]);
      }

      // Seed events
      for (const e of initialAppState.events) {
        this.db.run(`
          INSERT OR REPLACE INTO academic_events (id, user_id, title, date, end_date, time, type, subject_id, description, priority, completed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          e.id,
          demoId,
          e.title,
          e.date,
          e.endDate || null,
          e.time || null,
          e.type,
          e.subjectId || null,
          e.description || null,
          e.priority,
          e.completed ? 1 : 0
        ]);
      }
    }
  }

  public findUserByEmail(email: string): UserAccount | undefined {
    if (!this.db) return undefined;
    const stmt = this.db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(:email)');
    stmt.bind({ ':email': email.trim() });

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
        state: this.getUserState(row.id)
      };
    }
    stmt.free();
    return undefined;
  }

  public findUserById(id: string): UserAccount | undefined {
    if (!this.db) return undefined;
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = :id');
    stmt.bind({ ':id': id });

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
        state: this.getUserState(row.id)
      };
    }
    stmt.free();
    return undefined;
  }

  public createUser(email: string, passwordPlain: string, profile: Partial<StudentProfile>): UserAccount {
    if (!this.db) throw new Error('Database not initialized');
    const existing = this.findUserByEmail(email);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const id = 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const passwordHash = this.hashPassword(passwordPlain);
    const now = new Date().toISOString();

    const name = profile.name || 'Student';
    const university = profile.university || 'Institute of Technology';
    const department = profile.department || 'Computer Science & Engineering';
    const semester = profile.semester || 4;
    const section = profile.section || 'A';
    const rollNumber = profile.rollNumber || 'CS-2024-089';
    const threshold = profile.defaultAttendanceThreshold || 75;

    this.db.run(`
      INSERT INTO users (id, email, password_hash, name, university, department, semester, section, roll_number, default_attendance_threshold, semester_start_date, semester_end_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      email.toLowerCase(),
      passwordHash,
      name,
      university,
      department,
      semester,
      section,
      rollNumber,
      threshold,
      '2026-01-05',
      '2026-05-30',
      now
    ]);

    this.saveToFile();
    return this.findUserById(id)!;
  }

  public verifyCredentials(email: string, passwordPlain: string): UserAccount | null {
    const user = this.findUserByEmail(email);
    if (!user) return null;

    const hash = this.hashPassword(passwordPlain);
    if (user.passwordHash === hash) {
      return user;
    }
    return null;
  }

  public getUserState(userId: string): AppState {
    if (!this.db) return initialAppState;

    // Load profile
    const userStmt = this.db.prepare('SELECT * FROM users WHERE id = :id');
    userStmt.bind({ ':id': userId });
    let profile: StudentProfile = initialAppState.profile;
    let semesterStartDate = '2026-01-05';
    let semesterEndDate = '2026-05-30';
    if (userStmt.step()) {
      const u = userStmt.getAsObject() as any;
      profile = {
        name: u.name,
        email: u.email,
        university: u.university,
        department: u.department,
        semester: u.semester,
        section: u.section,
        rollNumber: u.roll_number,
        defaultAttendanceThreshold: u.default_attendance_threshold
      };
      semesterStartDate = u.semester_start_date;
      semesterEndDate = u.semester_end_date;
    }
    userStmt.free();

    // Load subjects
    const subStmt = this.db.prepare('SELECT * FROM subjects WHERE user_id = :uid');
    subStmt.bind({ ':uid': userId });
    const subjects: Subject[] = [];
    while (subStmt.step()) {
      const s = subStmt.getAsObject() as any;
      subjects.push({
        id: s.id,
        name: s.name,
        code: s.code,
        faculty: s.faculty,
        credits: s.credits,
        targetAttendance: s.target_attendance,
        attendedClasses: s.attended_classes,
        totalClasses: s.total_classes,
        color: s.color,
        room: s.room
      });
    }
    subStmt.free();

    // Load attendance records
    const attStmt = this.db.prepare('SELECT * FROM attendance_records WHERE user_id = :uid');
    attStmt.bind({ ':uid': userId });
    const attendanceRecords: AttendanceRecord[] = [];
    while (attStmt.step()) {
      const a = attStmt.getAsObject() as any;
      attendanceRecords.push({
        id: a.id,
        subjectId: a.subject_id,
        date: a.date,
        timeSlot: a.time_slot,
        status: a.status as AttendanceStatus,
        note: a.note || undefined,
        updatedAt: a.updated_at
      });
    }
    attStmt.free();

    // Load timetable
    const ttStmt = this.db.prepare('SELECT * FROM timetable_slots WHERE user_id = :uid');
    ttStmt.bind({ ':uid': userId });
    const timetableSlots: TimetableSlot[] = [];
    while (ttStmt.step()) {
      const t = ttStmt.getAsObject() as any;
      timetableSlots.push({
        id: t.id,
        dayOfWeek: t.day_of_week as DayOfWeek,
        startTime: t.start_time,
        endTime: t.end_time,
        subjectId: t.subject_id,
        room: t.room,
        faculty: t.faculty || 'Faculty Member',
        type: t.type as 'lecture' | 'lab' | 'tutorial'
      });
    }
    ttStmt.free();

    // Load replacement days
    const repStmt = this.db.prepare('SELECT * FROM replacement_days WHERE user_id = :uid');
    repStmt.bind({ ':uid': userId });
    const replacementDays: ReplacementDay[] = [];
    while (repStmt.step()) {
      const r = repStmt.getAsObject() as any;
      replacementDays.push({
        id: r.id,
        date: r.date,
        operatesAsDayOfWeek: r.operates_as_day_of_week as DayOfWeek,
        reason: r.reason
      });
    }
    repStmt.free();

    // Load faculty leaves
    const flStmt = this.db.prepare('SELECT * FROM faculty_leaves WHERE user_id = :uid');
    flStmt.bind({ ':uid': userId });
    const facultyLeaves: FacultyLeave[] = [];
    while (flStmt.step()) {
      const f = flStmt.getAsObject() as any;
      facultyLeaves.push({
        id: f.id,
        facultyName: f.faculty_name,
        subjectId: f.subject_id || undefined,
        date: f.date,
        reason: f.reason || undefined
      });
    }
    flStmt.free();

    // Load notes
    const noteStmt = this.db.prepare('SELECT * FROM academic_notes WHERE user_id = :uid');
    noteStmt.bind({ ':uid': userId });
    const notes: AcademicNote[] = [];
    while (noteStmt.step()) {
      const n = noteStmt.getAsObject() as any;
      let tags: string[] = [];
      try {
        tags = JSON.parse(n.tags || '[]');
      } catch {}
      notes.push({
        id: n.id,
        title: n.title,
        subjectId: n.subject_id,
        semester: n.semester || 4,
        category: (n.category || 'notes') as NoteCategory,
        contentText: n.content_text || undefined,
        gdriveUrl: n.gdrive_url || undefined,
        gdriveId: n.gdrive_id || undefined,
        fileType: (n.file_type || 'text') as NoteFileType,
        tags,
        createdAt: n.created_at,
        updatedAt: n.updated_at
      });
    }
    noteStmt.free();

    // Load events
    const evStmt = this.db.prepare('SELECT * FROM academic_events WHERE user_id = :uid');
    evStmt.bind({ ':uid': userId });
    const events: AcademicEvent[] = [];
    while (evStmt.step()) {
      const e = evStmt.getAsObject() as any;
      events.push({
        id: e.id,
        title: e.title,
        date: e.date,
        endDate: e.end_date || undefined,
        time: e.time || undefined,
        type: (e.type || 'assignment') as AcademicEventType,
        subjectId: e.subject_id || undefined,
        description: e.description || undefined,
        priority: (e.priority || 'medium') as EventPriority,
        completed: Boolean(e.completed)
      });
    }
    evStmt.free();

    // Check Google Drive connection
    const gdStmt = this.db.prepare('SELECT account_email, account_name, created_at FROM googledrive_tokens WHERE user_id = :uid');
    gdStmt.bind({ ':uid': userId });
    let googleDriveSettings: GoogleDriveSettings = {
      connected: false,
      rootFolder: 'Syncademic Vault',
      autoSync: false
    };
    if (gdStmt.step()) {
      const gd = gdStmt.getAsObject() as any;
      googleDriveSettings = {
        connected: true,
        accountEmail: gd.account_email || undefined,
        accountName: gd.account_name || undefined,
        rootFolder: 'Syncademic Vault',
        autoSync: true,
        lastSynced: gd.created_at || undefined
      };
    }
    gdStmt.free();

    return {
      isAuthenticated: true,
      profile,
      subjects,
      attendanceRecords,
      timetableSlots,
      replacementDays,
      facultyLeaves,
      holidays: [],
      notes,
      events,
      semesterStartDate,
      semesterEndDate,
      aiSettings: {
        provider: 'gemini',
        model: 'gemini-2.5-flash'
      },
      googleDriveSettings
    };
  }

  public updateUserState(userId: string, newState: Partial<AppState>): AppState {
    if (!this.db) throw new Error('Database not initialized');

    if (newState.profile) {
      const p = newState.profile;
      this.db.run(`
        UPDATE users
        SET name = COALESCE(?, name),
            university = COALESCE(?, university),
            department = COALESCE(?, department),
            semester = COALESCE(?, semester),
            section = COALESCE(?, section),
            roll_number = COALESCE(?, roll_number),
            default_attendance_threshold = COALESCE(?, default_attendance_threshold)
        WHERE id = ?
      `, [
        p.name || null,
        p.university || null,
        p.department || null,
        p.semester || null,
        p.section || null,
        p.rollNumber || null,
        p.defaultAttendanceThreshold || null,
        userId
      ]);
    }

    if (newState.semesterStartDate || newState.semesterEndDate) {
      this.db.run(`
        UPDATE users
        SET semester_start_date = COALESCE(?, semester_start_date),
            semester_end_date = COALESCE(?, semester_end_date)
        WHERE id = ?
      `, [
        newState.semesterStartDate || null,
        newState.semesterEndDate || null,
        userId
      ]);
    }

    if (newState.subjects) {
      this.db.run('DELETE FROM subjects WHERE user_id = ?', [userId]);
      for (const s of newState.subjects) {
        this.db.run(`
          INSERT INTO subjects (id, user_id, name, code, faculty, credits, target_attendance, attended_classes, total_classes, color, room)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          s.id,
          userId,
          s.name,
          s.code,
          s.faculty,
          s.credits,
          s.targetAttendance,
          s.attendedClasses,
          s.totalClasses,
          s.color,
          s.room
        ]);
      }
    }

    if (newState.attendanceRecords) {
      this.db.run('DELETE FROM attendance_records WHERE user_id = ?', [userId]);
      for (const a of newState.attendanceRecords) {
        this.db.run(`
          INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, note, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          a.id,
          userId,
          a.subjectId,
          a.date,
          a.timeSlot,
          a.status,
          a.note || null,
          a.updatedAt
        ]);
      }
    }

    if (newState.timetableSlots) {
      this.db.run('DELETE FROM timetable_slots WHERE user_id = ?', [userId]);
      for (const t of newState.timetableSlots) {
        this.db.run(`
          INSERT INTO timetable_slots (id, user_id, day_of_week, start_time, end_time, subject_id, room, faculty, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          t.id,
          userId,
          t.dayOfWeek,
          t.startTime,
          t.endTime,
          t.subjectId,
          t.room,
          t.faculty,
          t.type
        ]);
      }
    }

    if (newState.replacementDays) {
      this.db.run('DELETE FROM replacement_days WHERE user_id = ?', [userId]);
      for (const r of newState.replacementDays) {
        this.db.run(`
          INSERT INTO replacement_days (id, user_id, date, operates_as_day_of_week, reason)
          VALUES (?, ?, ?, ?, ?)
        `, [
          r.id,
          userId,
          r.date,
          r.operatesAsDayOfWeek,
          r.reason
        ]);
      }
    }

    if (newState.facultyLeaves) {
      this.db.run('DELETE FROM faculty_leaves WHERE user_id = ?', [userId]);
      for (const f of newState.facultyLeaves) {
        this.db.run(`
          INSERT INTO faculty_leaves (id, user_id, faculty_name, subject_id, date, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          f.id,
          userId,
          f.facultyName,
          f.subjectId || null,
          f.date,
          f.reason || null
        ]);
      }
    }

    if (newState.notes) {
      this.db.run('DELETE FROM academic_notes WHERE user_id = ?', [userId]);
      for (const n of newState.notes) {
        this.db.run(`
          INSERT INTO academic_notes (id, user_id, title, subject_id, semester, category, content_text, gdrive_url, gdrive_id, file_type, tags, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          n.id,
          userId,
          n.title,
          n.subjectId,
          n.semester || 4,
          n.category,
          n.contentText || null,
          n.gdriveUrl || null,
          n.gdriveId || null,
          n.fileType,
          JSON.stringify(n.tags || []),
          n.createdAt,
          n.updatedAt
        ]);
      }
    }

    if (newState.events) {
      this.db.run('DELETE FROM academic_events WHERE user_id = ?', [userId]);
      for (const e of newState.events) {
        this.db.run(`
          INSERT INTO academic_events (id, user_id, title, date, end_date, time, type, subject_id, description, priority, completed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          e.id,
          userId,
          e.title,
          e.date,
          e.endDate || null,
          e.time || null,
          e.type,
          e.subjectId || null,
          e.description || null,
          e.priority,
          e.completed ? 1 : 0
        ]);
      }
    }

    this.saveToFile();
    return this.getUserState(userId);
  }

  public resetUserState(userId: string): AppState {
    if (!this.db) throw new Error('Database not initialized');

    // Clean user records
    this.db.run('DELETE FROM subjects WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM attendance_records WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM timetable_slots WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM replacement_days WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM faculty_leaves WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM academic_notes WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM academic_events WHERE user_id = ?', [userId]);

    this.saveToFile();
    return this.getUserState(userId);
  }

  public saveGoogleDriveToken(userId: string, data: {
    accessToken: string;
    refreshToken?: string;
    accountEmail?: string;
    accountName?: string;
    expiresIn: number;
  }): void {
    if (!this.db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    const expiresAt = Date.now() + (data.expiresIn * 1000);

    this.db.run(`
      INSERT OR REPLACE INTO googledrive_tokens (user_id, access_token, refresh_token, account_email, account_name, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      data.accessToken,
      data.refreshToken || null,
      data.accountEmail || null,
      data.accountName || null,
      expiresAt,
      now
    ]);

    this.saveToFile();
  }

  public getGoogleDriveToken(userId: string): { accessToken: string; refreshToken?: string; accountEmail?: string; accountName?: string; expiresAt: number } | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM googledrive_tokens WHERE user_id = :uid');
    stmt.bind({ ':uid': userId });
    let result = null;
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      result = {
        accessToken: row.access_token,
        refreshToken: row.refresh_token || undefined,
        accountEmail: row.account_email || undefined,
        accountName: row.account_name || undefined,
        expiresAt: row.expires_at
      };
    }
    stmt.free();
    return result;
  }

  public deleteGoogleDriveToken(userId: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM googledrive_tokens WHERE user_id = ?', [userId]);
    this.saveToFile();
  }
}

export const db = new SqliteDatabaseStore();
