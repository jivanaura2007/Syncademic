import { Router } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AcademicEvent, UniversityHoliday } from '../../src/types';
import { GoogleGenAI } from '@google/genai';
import {
  normalizeMimeType,
  cleanBase64Data,
  extractPdfText,
  extractJsonFromModelResponse,
  parseHolidaysAndMilestonesFromText,
  expandDateRange,
  getDayOfWeekName,
  extractDetailsFromDocument
} from '../utils/documentProcessor';

const router = Router();

// GET /api/events
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    return res.json(state.events);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch events' });
  }
});

const HOLIDAY_KEYWORD_REGEX = /\b(holiday|vacation|break|closed|closure|recess|festival|jayanti|diwali|deepavali|independence|republic|gandhi|eid|ramzan|bakrid|muharram|christmas|good\s+friday|easter|holi|dussehra|durga\s+puja|navratri|pongal|onam|makar\s+sankranti|shivaratri|janmashtami|ganesh\s+chaturthi|guru\s+nanak|buddha\s+purnima|mahavir|ambedkar|new\s+year|thanksgiving|memorial\s+day|labor\s+day|labour\s+day|bank\s+holiday|puja|autumn\s+break|winter\s+break|summer\s+vacation|summer\s+break|spring\s+break|study\s+break|non-instructional|off-day|milad|valmiki|governor|patel)\b/i;

// POST /api/events/extract-calendar (High-Precision Multimodal AI Extraction for PDF, JPEG, PNG, CSV, Excel, Text)
router.post('/extract-calendar', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const startTimeMs = Date.now();

  try {
    const { fileBase64, mimeType: rawMimeType, rawText, fileName, mode, customKey } = req.body;
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const effectiveKey = customKey || state.aiSettings?.apiKey || process.env.GEMINI_API_KEY;

    const extractionResult = await extractDetailsFromDocument({
      fileBase64,
      mimeType: rawMimeType,
      rawText,
      fileName,
      customKey: effectiveKey,
      targetCategory: 'calendar'
    });

    const processingTimeMs = Date.now() - startTimeMs;

    return res.json({
      success: true,
      data: {
        semesterStartDate: extractionResult.semesterStartDate,
        semesterEndDate: extractionResult.semesterEndDate,
        holidays: extractionResult.holidays,
        events: extractionResult.events,
        summary: extractionResult.summary
      },
      meta: {
        confidenceScore: extractionResult.confidenceScore,
        processingTimeMs,
        docFormat: extractionResult.docFormat,
        holidaysCount: extractionResult.holidays.length,
        eventsCount: extractionResult.events.length,
        warnings: extractionResult.holidays.length === 0 ? ['No holidays identified in document.'] : []
      }
    });
  } catch (err: any) {
    console.error('Fatal calendar extract error:', err);
    return res.status(500).json({ error: err.message || 'Fatal error parsing academic calendar' });
  }
});

// POST /api/events/bulk-holidays (Save extracted holidays, dates, and events)
router.post('/bulk-holidays', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const { holidays, semesterStartDate, semesterEndDate, events, mode } = req.body;

    let updatedHolidays: UniversityHoliday[] = [];
    if (Array.isArray(holidays)) {
      const formattedHolidays: UniversityHoliday[] = holidays.map((h: any, idx: number) => ({
        id: h.id || ('hol-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 5)),
        date: h.date,
        name: h.name || 'University Holiday',
        type: h.type || 'university',
        description: h.description || undefined,
        isNonAttendanceDay: true,
        dayOfWeekName: h.dayOfWeekName || getDayOfWeekName(h.date)
      }));

      updatedHolidays = mode === 'replace'
        ? formattedHolidays
        : [...state.holidays.filter(existing => !formattedHolidays.some(f => f.date === existing.date)), ...formattedHolidays];
    } else {
      updatedHolidays = state.holidays;
    }

    let updatedEvents = [...state.events];
    if (Array.isArray(events) && events.length > 0) {
      const formattedEvents: AcademicEvent[] = events.map((e: any, idx: number) => ({
        id: e.id || ('ev-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 5)),
        title: e.title || 'Academic Milestone',
        date: e.date,
        time: e.time || undefined,
        type: e.type || 'exam',
        subjectId: e.subjectId || undefined,
        description: e.description || undefined,
        completed: false,
        priority: e.priority || 'high'
      }));

      for (const fe of formattedEvents) {
        if (!updatedEvents.some(ue => ue.date === fe.date && ue.title.toLowerCase() === fe.title.toLowerCase())) {
          updatedEvents.push(fe);
        }
      }
    }

    const updates: Partial<any> = {
      holidays: updatedHolidays.sort((a, b) => a.date.localeCompare(b.date)),
      events: updatedEvents.sort((a, b) => a.date.localeCompare(b.date))
    };

    if (semesterStartDate) updates.semesterStartDate = semesterStartDate;
    if (semesterEndDate) updates.semesterEndDate = semesterEndDate;

    db.updateUserState(userId, updates);

    return res.json({
      success: true,
      holidays: updates.holidays,
      semesterStartDate: updates.semesterStartDate || state.semesterStartDate,
      semesterEndDate: updates.semesterEndDate || state.semesterEndDate,
      events: updates.events
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save academic calendar updates' });
  }
});

// POST /api/events
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const { title, date, time, type, subjectId, description, completed, isCompleted, priority } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and Date are required' });
    }

    const newEvent: AcademicEvent = {
      id: 'ev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      date,
      time,
      type: type || 'assignment',
      subjectId,
      description,
      completed: Boolean(completed ?? isCompleted),
      priority: priority || 'medium'
    };

    const sortedEvents = [...state.events, newEvent].sort((a, b) => a.date.localeCompare(b.date));

    db.updateUserState(userId, { events: sortedEvents });

    return res.status(201).json(newEvent);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create event' });
  }
});

// PUT /api/events/:id
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const eventId = req.params.id;
    const updates = req.body;

    const existingIndex = state.events.findIndex(e => e.id === eventId);
    if (existingIndex === -1) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent: AcademicEvent = {
      ...state.events[existingIndex],
      ...updates,
      id: eventId
    };

    const newEvents = [...state.events];
    newEvents[existingIndex] = updatedEvent;

    db.updateUserState(userId, { events: newEvents.sort((a, b) => a.date.localeCompare(b.date)) });

    return res.json(updatedEvent);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update event' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const eventId = req.params.id;

    db.updateUserState(userId, {
      events: state.events.filter(e => e.id !== eventId)
    });

    return res.json({ message: 'Event deleted successfully', eventId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete event' });
  }
});

export default router;
