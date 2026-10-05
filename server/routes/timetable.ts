import { Router } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { TimetableSlot, ReplacementDay, FacultyLeave, DayOfWeek, Subject } from '../../src/types';
import { GoogleGenAI } from '@google/genai';
import {
  normalizeMimeType,
  cleanBase64Data,
  extractPdfText,
  extractJsonFromModelResponse,
  parseTimetableSlotsFromText,
  extractDetailsFromDocument,
  normalizeTimeTo24Hour
} from '../utils/documentProcessor';

const router = Router();

// GET /api/timetable
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    return res.json({
      slots: state.timetableSlots,
      replacementDays: state.replacementDays,
      facultyLeaves: state.facultyLeaves,
      holidays: state.holidays
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch timetable' });
  }
});

// POST /api/timetable/extract (Multimodal AI Extraction for PDF, Image, CSV, Excel, Text)
router.post('/extract', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const startTimeMs = Date.now();

  try {
    const { fileBase64, mimeType: rawMimeType, rawText, fileName, customKey } = req.body;
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const effectiveKey = customKey || state.aiSettings?.apiKey || process.env.GEMINI_API_KEY;

    const result = await extractDetailsFromDocument({
      fileBase64,
      mimeType: rawMimeType,
      rawText,
      fileName,
      customKey: effectiveKey,
      targetCategory: 'timetable'
    });

    const processingTimeMs = Date.now() - startTimeMs;
    const slots = result.slots || [];
    const subjects = result.subjects || [];

    return res.json({
      success: slots.length > 0 || result.success,
      data: {
        semester: state.profile.semester || 1,
        slots,
        subjects,
        summary: result.summary
      },
      meta: {
        format: result.docFormat,
        confidenceScore: result.confidenceScore,
        processingTimeMs,
        itemsExtracted: slots.length,
        warnings: slots.length === 0 ? ['No recurring timetable slots found in document.'] : []
      }
    });
  } catch (err: any) {
    console.error('Timetable extraction error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to extract timetable. Please verify the document format or try manual entry.'
    });
  }
});

// POST /api/timetable/bulk (Bulk save timetable slots and sync subjects)
router.post('/bulk', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const { slots, subjects, mode } = req.body;

    if (!Array.isArray(slots)) {
      return res.status(400).json({ error: 'Slots must be an array' });
    }

    let updatedSubjects = [...state.subjects];
    const subjectCodeMap = new Map<string, string>();

    for (const sub of updatedSubjects) {
      subjectCodeMap.set(sub.code.toUpperCase().trim(), sub.id);
      subjectCodeMap.set(sub.name.toLowerCase().trim(), sub.id);
    }

    if (Array.isArray(subjects)) {
      for (const s of subjects) {
        const codeKey = (s.code || '').toUpperCase().trim();
        const nameKey = (s.name || '').toLowerCase().trim();
        if (codeKey && !subjectCodeMap.has(codeKey) && !subjectCodeMap.has(nameKey)) {
          const newSub: Subject = {
            id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            code: s.code || 'SUB' + (updatedSubjects.length + 1),
            name: s.name || s.code || 'Academic Subject',
            faculty: s.faculty || 'Faculty Member',
            room: s.room || 'LH-101',
            credits: Number(s.credits) || 4,
            color: '#AF1F72',
            targetAttendance: 75,
            totalClasses: 0,
            attendedClasses: 0,
            notesCount: 0
          };
          updatedSubjects.push(newSub);
          subjectCodeMap.set(newSub.code.toUpperCase().trim(), newSub.id);
          subjectCodeMap.set(newSub.name.toLowerCase().trim(), newSub.id);
        }
      }
    }

    const formattedSlots: TimetableSlot[] = slots.map((s: any, idx: number) => {
      let subjectId = s.subjectId;
      if (!subjectId && (s.subjectCode || s.subjectName)) {
        const codeKey = (s.subjectCode || '').toUpperCase().trim();
        const nameKey = (s.subjectName || '').toLowerCase().trim();
        subjectId = subjectCodeMap.get(codeKey) || subjectCodeMap.get(nameKey);
      }

      if (!subjectId && updatedSubjects.length > 0) {
        subjectId = updatedSubjects[0].id;
      }

      return {
        id: s.id || ('slot-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 5)),
        dayOfWeek: Number(s.dayOfWeek) as DayOfWeek,
        startTime: normalizeTimeTo24Hour(s.startTime, false),
        endTime: normalizeTimeTo24Hour(s.endTime, true),
        subjectId: subjectId || 'sub-default',
        room: s.room || 'LH-101',
        faculty: s.faculty || 'Faculty',
        type: s.type || 'lecture'
      };
    });

    const finalSlots = mode === 'replace'
      ? formattedSlots
      : [...state.timetableSlots, ...formattedSlots];

    db.updateUserState(userId, {
      timetableSlots: finalSlots,
      subjects: updatedSubjects
    });

    return res.json({
      success: true,
      slots: finalSlots,
      subjects: updatedSubjects,
      count: formattedSlots.length
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to bulk save timetable slots' });
  }
});

// POST /api/timetable/slot
router.post('/slot', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const { dayOfWeek, subjectId, startTime, endTime, room, faculty, type } = req.body;

    if (!dayOfWeek || !subjectId || !startTime || !endTime) {
      return res.status(400).json({ error: 'dayOfWeek, subjectId, startTime, and endTime are required' });
    }

    const newSlot: TimetableSlot = {
      id: 'tt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      dayOfWeek: Number(dayOfWeek) as DayOfWeek,
      subjectId,
      startTime,
      endTime,
      room: room || 'LH-101',
      faculty: faculty || 'Faculty',
      type: type || 'lecture'
    };

    db.updateUserState(userId, {
      timetableSlots: [...state.timetableSlots, newSlot]
    });

    return res.status(201).json(newSlot);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create slot' });
  }
});

// PUT /api/timetable/slot/:id
router.put('/slot/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const slotId = req.params.id;
    const updates = req.body;

    const existingIndex = state.timetableSlots.findIndex(s => s.id === slotId);
    if (existingIndex === -1) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    const updatedSlot: TimetableSlot = {
      ...state.timetableSlots[existingIndex],
      ...updates,
      id: slotId
    };

    const newSlots = [...state.timetableSlots];
    newSlots[existingIndex] = updatedSlot;

    db.updateUserState(userId, { timetableSlots: newSlots });

    return res.json(updatedSlot);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update slot' });
  }
});

// DELETE /api/timetable/slot/:id
router.delete('/slot/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const slotId = req.params.id;

    db.updateUserState(userId, {
      timetableSlots: state.timetableSlots.filter(s => s.id !== slotId)
    });

    return res.json({ message: 'Slot deleted successfully', slotId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete slot' });
  }
});

// POST /api/timetable/replacement-day
router.post('/replacement-day', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const { date, operatesAsDayOfWeek, reason } = req.body;

    const newReplacement: ReplacementDay = {
      id: 'rep-' + Date.now(),
      date,
      operatesAsDayOfWeek: Number(operatesAsDayOfWeek) as DayOfWeek,
      reason: reason || 'Replacement timetable'
    };

    db.updateUserState(userId, {
      replacementDays: [...state.replacementDays.filter(r => r.date !== date), newReplacement]
    });

    return res.status(201).json(newReplacement);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to add replacement day' });
  }
});

// DELETE /api/timetable/replacement-day/:id
router.delete('/replacement-day/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const id = req.params.id;

    db.updateUserState(userId, {
      replacementDays: state.replacementDays.filter(r => r.id !== id)
    });

    return res.json({ message: 'Replacement day deleted', id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete replacement day' });
  }
});

// POST /api/timetable/faculty-leave
router.post('/faculty-leave', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const { facultyName, subjectId, date, reason } = req.body;

    const newLeave: FacultyLeave = {
      id: 'fl-' + Date.now(),
      facultyName,
      subjectId,
      date,
      reason
    };

    db.updateUserState(userId, {
      facultyLeaves: [...state.facultyLeaves, newLeave]
    });

    return res.status(201).json(newLeave);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to add faculty leave' });
  }
});

// DELETE /api/timetable/faculty-leave/:id
router.delete('/faculty-leave/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const id = req.params.id;

    db.updateUserState(userId, {
      facultyLeaves: state.facultyLeaves.filter(f => f.id !== id)
    });

    return res.json({ message: 'Faculty leave deleted', id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete faculty leave' });
  }
});

export default router;
