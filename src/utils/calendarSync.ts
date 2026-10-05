import { AppState, TimetableSlot, Subject, DayOfWeek } from '../types';

export interface ParsedCalendarSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  subjectCode: string;
  subjectName: string;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  room: string;
  faculty: string;
  type: 'lecture' | 'lab' | 'tutorial';
  originalEventTitle?: string;
  selected: boolean;
}

export interface CalendarParseResult {
  slots: ParsedCalendarSlot[];
  detectedSemesterStart?: string;
  detectedSemesterEnd?: string;
  totalEventsFound: number;
  format: 'ics' | 'csv' | 'json';
  warnings: string[];
}

const DAY_MAP_FROM_STR: Record<string, DayOfWeek> = {
  MO: 1, MON: 1, MONDAY: 1,
  TU: 2, TUE: 2, TUESDAY: 2,
  WE: 3, WED: 3, WEDNESDAY: 3,
  TH: 4, THU: 4, THURSDAY: 4,
  FR: 5, FRI: 5, FRIDAY: 5,
  SA: 6, SAT: 6, SATURDAY: 6
};

const DAY_CODE_TO_RRULE: Record<DayOfWeek, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA'
};

/**
 * Returns the next date (YYYY-MM-DD) that falls on targetDayOfWeek, starting from baseDate
 */
function getNextDateForDayOfWeek(baseDate: Date, targetDayOfWeek: DayOfWeek): Date {
  const result = new Date(baseDate);
  const currentDay = result.getDay(); // 0 is Sun, 1 is Mon ... 6 is Sat
  const currentMapped = currentDay === 0 ? 7 : currentDay;
  let diff = targetDayOfWeek - currentMapped;
  if (diff < 0) {
    diff += 7;
  }
  result.setDate(result.getDate() + diff);
  return result;
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatIcsDateTime(date: Date, timeStr: string): string {
  const [hh, mm] = timeStr.split(':').map(Number);
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hours = padZero(hh || 9);
  const minutes = padZero(mm || 0);
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function formatIcsDate(date: Date): string {
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  return `${year}${month}${day}`;
}

/**
 * Generates an RFC 5545 compliant .ICS iCalendar file format for Google Calendar
 */
export function generateGoogleCalendarIcs(state: AppState): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const startDate = state.semesterStartDate 
    ? new Date(state.semesterStartDate + 'T00:00:00') 
    : new Date();
  
  const endDate = state.semesterEndDate
    ? new Date(state.semesterEndDate + 'T23:59:59')
    : new Date(startDate.getTime() + 120 * 24 * 60 * 60 * 1000); // 120 days default

  const untilDateStr = `${formatIcsDate(endDate)}T235959Z`;

  const subjectsMap = new Map<string, Subject>(state.subjects.map(s => [s.id, s]));

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Syncademic//Academic Timetable//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Academic Timetable - Semester ${state.profile.semester}`,
    'X-WR-TIMEZONE:UTC',
    'X-WR-CALDESC:Semester academic class timetable exported from Syncademic'
  ];

  state.timetableSlots.forEach((slot, index) => {
    const subject = subjectsMap.get(slot.subjectId);
    const subName = subject?.name || 'Class';
    const subCode = subject?.code || 'CRS';
    const faculty = slot.faculty || subject?.faculty || 'Faculty';
    const room = slot.room || subject?.room || 'Lecture Hall';
    const type = slot.type ? slot.type.toUpperCase() : 'LECTURE';

    // Calculate the first occurrence on or after semester start
    const firstClassDate = getNextDateForDayOfWeek(startDate, slot.dayOfWeek);
    const dtStart = formatIcsDateTime(firstClassDate, slot.startTime);
    const dtEnd = formatIcsDateTime(firstClassDate, slot.endTime);
    const rruleDay = DAY_CODE_TO_RRULE[slot.dayOfWeek] || 'MO';

    const cleanSummary = `[${subCode}] ${subName} (${type})`;
    const cleanDescription = [
      `Course: ${subName} (${subCode})`,
      `Instructor: ${faculty}`,
      `Room / Venue: ${room}`,
      `Class Type: ${type}`,
      `Credits: ${subject?.credits || 4}`,
      `Minimum Attendance Threshold: ${subject?.targetAttendance || 75}%`,
      'Exported from Syncademic Academic Workspace'
    ].join('\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:syncademic-slot-${slot.id}-${index}@syncademic.app`);
    lines.push(`DTSTAMP:${timestamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${untilDateStr};BYDAY=${rruleDay}`);
    lines.push(`SUMMARY:${cleanSummary}`);
    lines.push(`LOCATION:${room}`);
    lines.push(`DESCRIPTION:${cleanDescription}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('CATEGORIES:EDUCATION,CLASSES,ACADEMIC');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Generates Google Calendar CSV Import Format
 * Google Calendar accepts: Subject, Start Date, Start Time, End Date, End Time, All Day Event, Description, Location, Private
 */
export function generateGoogleCalendarCsv(state: AppState): string {
  const startDate = state.semesterStartDate 
    ? new Date(state.semesterStartDate + 'T00:00:00') 
    : new Date();
  
  const endDate = state.semesterEndDate
    ? new Date(state.semesterEndDate + 'T23:59:59')
    : new Date(startDate.getTime() + 84 * 24 * 60 * 60 * 1000); // 12 weeks

  const subjectsMap = new Map<string, Subject>(state.subjects.map(s => [s.id, s]));

  const rows: string[] = [
    'Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description,Location,Private'
  ];

  // Generate instances for each week of the semester
  const curr = new Date(startDate);
  while (curr <= endDate) {
    const jsDay = curr.getDay(); // 0=Sun, 1=Mon...6=Sat
    if (jsDay >= 1 && jsDay <= 6) {
      const daySlots = state.timetableSlots.filter(s => s.dayOfWeek === jsDay);
      const dateStr = curr.toISOString().split('T')[0]; // YYYY-MM-DD
      // Convert to MM/DD/YYYY for Google Calendar CSV
      const [y, m, d] = dateStr.split('-');
      const gDate = `${m}/${d}/${y}`;

      daySlots.forEach(slot => {
        const sub = subjectsMap.get(slot.subjectId);
        const title = `"${(sub?.code || 'CRS')}: ${(sub?.name || 'Class')} (${slot.type || 'Lecture'})"`;
        const startTime = formatTimeTo12Hour(slot.startTime);
        const endTime = formatTimeTo12Hour(slot.endTime);
        const desc = `"Faculty: ${slot.faculty || sub?.faculty || ''} | Room: ${slot.room || ''}"`;
        const loc = `"${slot.room || ''}"`;
        rows.push(`${title},${gDate},${startTime},${gDate},${endTime},False,${desc},${loc},False`);
      });
    }
    curr.setDate(curr.getDate() + 1);
  }

  return rows.join('\r\n');
}

function formatTimeTo12Hour(time24: string): string {
  if (!time24) return '09:00 AM';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const hFormatted = h < 10 ? `0${h}` : `${h}`;
  return `${hFormatted}:${m} ${ampm}`;
}

/**
 * Generates direct one-click Google Calendar web event creation URL
 */
export function generateClassGoogleCalendarUrl(
  slot: TimetableSlot,
  subject: Subject,
  semesterStartDate?: string,
  semesterEndDate?: string
): string {
  const startDate = semesterStartDate 
    ? new Date(semesterStartDate + 'T00:00:00') 
    : new Date();

  const endDate = semesterEndDate
    ? new Date(semesterEndDate + 'T23:59:59')
    : new Date(startDate.getTime() + 120 * 24 * 60 * 60 * 1000);

  const firstDate = getNextDateForDayOfWeek(startDate, slot.dayOfWeek);
  const dtStart = formatIcsDateTime(firstDate, slot.startTime);
  const dtEnd = formatIcsDateTime(firstDate, slot.endTime);
  const until = `${formatIcsDate(endDate)}T235959Z`;
  const rruleDay = DAY_CODE_TO_RRULE[slot.dayOfWeek] || 'MO';

  const text = encodeURIComponent(`[${subject.code}] ${subject.name} (${slot.type.toUpperCase()})`);
  const dates = `${dtStart}/${dtEnd}`;
  const details = encodeURIComponent(
    `Course: ${subject.name} (${subject.code})\nFaculty: ${slot.faculty || subject.faculty}\nRoom: ${slot.room}\nCredits: ${subject.credits}\nThreshold: ${subject.targetAttendance}%\nExported from Syncademic`
  );
  const location = encodeURIComponent(slot.room || subject.room || '');
  const recur = encodeURIComponent(`RRULE:FREQ=WEEKLY;UNTIL=${until};BYDAY=${rruleDay}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}&recur=${recur}`;
}

/**
 * Robust .ICS / iCalendar line unfolder for multi-line headers
 */
function unfoldIcsLines(rawIcs: string): string[] {
  const rawLines = rawIcs.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfolded: string[] = [];

  for (const line of rawLines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (unfolded.length > 0) {
        unfolded[unfolded.length - 1] += line.slice(1);
      }
    } else {
      unfolded.push(line.trim());
    }
  }

  return unfolded;
}

/**
 * Extracts and parses university calendar files (.ics, .csv, .json)
 */
export function parseUniversityCalendarFile(content: string, fileName: string): CalendarParseResult {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.ics') || lowerName.endsWith('.ical') || content.includes('BEGIN:VCALENDAR')) {
    return parseIcsCalendar(content);
  } else if (lowerName.endsWith('.csv') || content.includes('Subject,Start Date') || content.includes('Start Time')) {
    return parseCsvCalendar(content);
  } else if (lowerName.endsWith('.json')) {
    return parseJsonCalendar(content);
  }

  // Fallback to ICS parser if it contains VEVENT
  if (content.includes('BEGIN:VEVENT')) {
    return parseIcsCalendar(content);
  }

  return parseCsvCalendar(content);
}

function parseIcsCalendar(icsContent: string): CalendarParseResult {
  const lines = unfoldIcsLines(icsContent);
  const slots: ParsedCalendarSlot[] = [];
  const warnings: string[] = [];

  let inEvent = false;
  let currentEvent: Record<string, string> = {};
  let totalEventsFound = 0;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      totalEventsFound++;
      continue;
    }

    if (line === 'END:VEVENT') {
      inEvent = false;
      const parsedSlot = convertEventToSlot(currentEvent, slots.length);
      if (parsedSlot) {
        // Prevent duplicate day & time slot for the same code
        const isDuplicate = slots.some(
          s => s.dayOfWeek === parsedSlot.dayOfWeek && 
               s.startTime === parsedSlot.startTime && 
               s.subjectCode === parsedSlot.subjectCode
        );
        if (!isDuplicate) {
          slots.push(parsedSlot);
        }
      }
      continue;
    }

    if (inEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const fullKey = line.slice(0, colonIdx);
        const val = line.slice(colonIdx + 1).trim();
        // Remove parameters like DTSTART;TZID=... -> DTSTART
        const cleanKey = fullKey.split(';')[0].toUpperCase();
        currentEvent[cleanKey] = val;
        // Keep parameters if RRULE or TZID
        if (fullKey.includes(';')) {
          currentEvent[`${cleanKey}_PARAMS`] = fullKey;
        }
      }
    }
  }

  return {
    slots,
    totalEventsFound,
    format: 'ics',
    warnings
  };
}

function convertEventToSlot(event: Record<string, string>, index: number): ParsedCalendarSlot | null {
  const summary = event.SUMMARY || event.DESCRIPTION || '';
  if (!summary) return null;

  // Extract start and end times
  const dtStart = event.DTSTART || '';
  const dtEnd = event.DTEND || '';

  let startTime = '09:00';
  let endTime = '10:00';
  let detectedDay: DayOfWeek = 1;

  if (dtStart) {
    const timeMatch = dtStart.match(/T(\d{2})(\d{2})/);
    if (timeMatch) {
      startTime = `${timeMatch[1]}:${timeMatch[2]}`;
    }
    const dateMatch = dtStart.match(/(\d{4})(\d{2})(\d{2})/);
    if (dateMatch) {
      const parsedDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T12:00:00Z`);
      const jsDay = parsedDate.getUTCDay();
      if (jsDay >= 1 && jsDay <= 6) {
        detectedDay = jsDay as DayOfWeek;
      }
    }
  }

  if (dtEnd) {
    const timeMatch = dtEnd.match(/T(\d{2})(\d{2})/);
    if (timeMatch) {
      endTime = `${timeMatch[1]}:${timeMatch[2]}`;
    }
  }

  // Check RRULE for BYDAY override
  const rrule = event.RRULE || '';
  if (rrule) {
    const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/i);
    if (byDayMatch) {
      const firstDay = byDayMatch[1].split(',')[0].toUpperCase();
      if (DAY_MAP_FROM_STR[firstDay]) {
        detectedDay = DAY_MAP_FROM_STR[firstDay];
      }
    }
  }

  // Parse Subject Code and Name from Summary
  let subjectCode = 'COURSE';
  let subjectName = summary;
  let room = event.LOCATION || 'LH-101';
  let faculty = 'Faculty';

  // Common patterns: "[CS301] Data Structures", "CS301 - Operating Systems", "Database Systems (CS302)"
  const codeBracketMatch = summary.match(/\[([A-Z0-9_-]{3,8})\]\s*(.*)/i);
  const codeDashMatch = summary.match(/^([A-Z0-9_-]{3,8})\s*[-:]\s*(.*)/i);
  const codeParenMatch = summary.match(/(.*?)\s*\(([A-Z0-9_-]{3,8})\)/i);

  if (codeBracketMatch) {
    subjectCode = codeBracketMatch[1].toUpperCase();
    subjectName = codeBracketMatch[2].trim() || subjectCode;
  } else if (codeDashMatch) {
    subjectCode = codeDashMatch[1].toUpperCase();
    subjectName = codeDashMatch[2].trim() || subjectCode;
  } else if (codeParenMatch) {
    subjectCode = codeParenMatch[2].toUpperCase();
    subjectName = codeParenMatch[1].trim() || subjectCode;
  } else {
    // Generate code from first 3-4 letters
    const words = summary.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      subjectCode = (words.map(w => w[0]).join('').slice(0, 4) + '101').toUpperCase();
    } else {
      subjectCode = summary.slice(0, 5).toUpperCase();
    }
  }

  // Check description for faculty
  const desc = event.DESCRIPTION || '';
  const facultyMatch = desc.match(/(?:Faculty|Instructor|Professor|Prof\.|Dr\.)[:\s]+([A-Za-z\s.]+)/i);
  if (facultyMatch) {
    faculty = facultyMatch[1].split('\\n')[0].split('\n')[0].trim();
  }

  // Detect type (lab vs lecture vs tutorial)
  let type: 'lecture' | 'lab' | 'tutorial' = 'lecture';
  const combined = (summary + ' ' + desc).toLowerCase();
  if (combined.includes('lab') || combined.includes('practical')) {
    type = 'lab';
  } else if (combined.includes('tutorial') || combined.includes('tut')) {
    type = 'tutorial';
  }

  return {
    id: `parsed-${index}-${Date.now()}`,
    dayOfWeek: detectedDay,
    subjectCode: subjectCode.slice(0, 10),
    subjectName: cleanText(subjectName),
    startTime,
    endTime,
    room: cleanText(room),
    faculty: cleanText(faculty),
    type,
    originalEventTitle: summary,
    selected: true
  };
}

function parseCsvCalendar(csvContent: string): CalendarParseResult {
  const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  const slots: ParsedCalendarSlot[] = [];
  const warnings: string[] = [];

  if (lines.length < 2) {
    return { slots, totalEventsFound: 0, format: 'csv', warnings: ['CSV file was empty or has no header'] };
  }

  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const subjectIdx = header.findIndex(h => h.includes('subject') || h.includes('title') || h.includes('course') || h.includes('summary'));
  const dayIdx = header.findIndex(h => h.includes('day') || h.includes('weekday'));
  const dateIdx = header.findIndex(h => h.includes('date') || h.includes('start date'));
  const startTimeIdx = header.findIndex(h => h.includes('start time') || h.includes('start'));
  const endTimeIdx = header.findIndex(h => h.includes('end time') || h.includes('end'));
  const roomIdx = header.findIndex(h => h.includes('room') || h.includes('location') || h.includes('hall'));
  const facultyIdx = header.findIndex(h => h.includes('faculty') || h.includes('instructor') || h.includes('teacher'));

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;

    const summary = subjectIdx >= 0 ? cols[subjectIdx] : cols[0];
    if (!summary) continue;

    let dayOfWeek: DayOfWeek = 1;
    if (dayIdx >= 0 && cols[dayIdx]) {
      const dayStr = cols[dayIdx].toUpperCase().slice(0, 2);
      if (DAY_MAP_FROM_STR[dayStr]) {
        dayOfWeek = DAY_MAP_FROM_STR[dayStr];
      }
    } else if (dateIdx >= 0 && cols[dateIdx]) {
      const parsedDate = new Date(cols[dateIdx]);
      if (!isNaN(parsedDate.getTime())) {
        const jsDay = parsedDate.getDay();
        if (jsDay >= 1 && jsDay <= 6) dayOfWeek = jsDay as DayOfWeek;
      }
    }

    let startTime = '09:00';
    let endTime = '10:00';

    if (startTimeIdx >= 0 && cols[startTimeIdx]) {
      startTime = normalizeTimeString(cols[startTimeIdx]);
    }
    if (endTimeIdx >= 0 && cols[endTimeIdx]) {
      endTime = normalizeTimeString(cols[endTimeIdx]);
    }

    const room = roomIdx >= 0 ? cols[roomIdx] : 'Room 101';
    const faculty = facultyIdx >= 0 ? cols[facultyIdx] : 'Professor';

    slots.push({
      id: `csv-${i}-${Date.now()}`,
      dayOfWeek,
      subjectCode: summary.slice(0, 7).toUpperCase(),
      subjectName: summary,
      startTime,
      endTime,
      room: room || 'Room 101',
      faculty: faculty || 'Faculty',
      type: summary.toLowerCase().includes('lab') ? 'lab' : 'lecture',
      originalEventTitle: summary,
      selected: true
    });
  }

  return {
    slots,
    totalEventsFound: slots.length,
    format: 'csv',
    warnings
  };
}

function parseJsonCalendar(jsonContent: string): CalendarParseResult {
  try {
    const data = JSON.parse(jsonContent);
    const slots: ParsedCalendarSlot[] = [];
    const list = Array.isArray(data) ? data : data.timetableSlots || data.events || [];

    list.forEach((item: any, idx: number) => {
      slots.push({
        id: `json-${idx}-${Date.now()}`,
        dayOfWeek: (item.dayOfWeek || item.day || 1) as DayOfWeek,
        subjectCode: item.subjectCode || item.code || 'CRS',
        subjectName: item.subjectName || item.title || item.name || 'Subject',
        startTime: item.startTime || '09:00',
        endTime: item.endTime || '10:00',
        room: item.room || 'LH-101',
        faculty: item.faculty || item.instructor || 'Faculty',
        type: item.type || 'lecture',
        originalEventTitle: item.title,
        selected: true
      });
    });

    return {
      slots,
      totalEventsFound: slots.length,
      format: 'json',
      warnings: []
    };
  } catch (err: any) {
    return {
      slots: [],
      totalEventsFound: 0,
      format: 'json',
      warnings: ['Failed to parse JSON file: ' + err.message]
    };
  }
}

function normalizeTimeString(raw: string): string {
  if (!raw) return '09:00';
  // Check 12-hour format e.g. "09:00 AM" or "2:30 PM"
  const match12 = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2];
    const ampm = (match12[3] || '').toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${padZero(h)}:${m}`;
  }
  return raw.slice(0, 5);
}

function cleanText(txt: string): string {
  return txt
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}
