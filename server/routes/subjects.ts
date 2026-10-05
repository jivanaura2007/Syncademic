import { Router } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { Subject } from '../../src/types';

const router = Router();

// GET /api/subjects
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    return res.json(state.subjects);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch subjects' });
  }
});

// POST /api/subjects
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const { name, code, faculty, room, credits, targetAttendance, attendedClasses, totalClasses, color } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Subject Name and Code are required' });
    }

    const newSubject: Subject = {
      id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      faculty: faculty ? faculty.trim() : 'Faculty',
      room: room ? room.trim() : 'LH-101',
      credits: Number(credits) || 4,
      targetAttendance: Number(targetAttendance) || state.profile.defaultAttendanceThreshold || 75,
      attendedClasses: Number(attendedClasses) || 0,
      totalClasses: Math.max(Number(attendedClasses) || 0, Number(totalClasses) || 0),
      color: color || '#007FFF',
      notesCount: 0
    };

    const updatedState = db.updateUserState(userId, {
      subjects: [...state.subjects, newSubject]
    });

    return res.status(201).json(newSubject);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create subject' });
  }
});

// PUT /api/subjects/:id
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const subjectId = req.params.id;
    const updates = req.body;

    const existingIndex = state.subjects.findIndex(s => s.id === subjectId);
    if (existingIndex === -1) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const updatedSubject: Subject = {
      ...state.subjects[existingIndex],
      ...updates,
      id: subjectId,
      code: updates.code ? updates.code.toUpperCase() : state.subjects[existingIndex].code,
      totalClasses: Math.max(
        updates.attendedClasses ?? state.subjects[existingIndex].attendedClasses,
        updates.totalClasses ?? state.subjects[existingIndex].totalClasses
      )
    };

    const newSubjects = [...state.subjects];
    newSubjects[existingIndex] = updatedSubject;

    db.updateUserState(userId, { subjects: newSubjects });

    return res.json(updatedSubject);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update subject' });
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const subjectId = req.params.id;

    const remainingSubjects = state.subjects.filter(s => s.id !== subjectId);
    const remainingAttendance = state.attendanceRecords.filter(a => a.subjectId !== subjectId);
    const remainingTimetable = state.timetableSlots.filter(t => t.subjectId !== subjectId);
    const remainingNotes = state.notes.filter(n => n.subjectId !== subjectId);
    const remainingEvents = state.events.filter(e => e.subjectId !== subjectId);

    db.updateUserState(userId, {
      subjects: remainingSubjects,
      attendanceRecords: remainingAttendance,
      timetableSlots: remainingTimetable,
      notes: remainingNotes,
      events: remainingEvents
    });

    return res.json({ message: 'Subject and associated records deleted successfully', subjectId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete subject' });
  }
});

export default router;
