import { Router } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { initialAppState } from '../../src/utils/sampleData';
import { AppState } from '../../src/types';

const router = Router();

// GET /api/settings/state
router.get('/state', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    return res.json(state);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch settings' });
  }
});

// PUT /api/settings/ai
router.put('/ai', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const aiUpdates = req.body;

    const updated = db.updateUserState(userId, {
      aiSettings: {
        ...state.aiSettings,
        ...aiUpdates
      }
    });

    return res.json(updated.aiSettings);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update AI settings' });
  }
});

// PUT /api/settings/googledrive
router.put('/googledrive', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const gdUpdates = req.body;

    const updated = db.updateUserState(userId, {
      googleDriveSettings: {
        ...state.googleDriveSettings,
        ...gdUpdates,
        lastSynced: new Date().toISOString()
      }
    });

    return res.json(updated.googleDriveSettings);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update Google Drive settings' });
  }
});

// PUT /api/settings/semester-dates
router.put('/semester-dates', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.body;

    const updated = db.updateUserState(userId, {
      semesterStartDate: startDate,
      semesterEndDate: endDate
    });

    return res.json({
      semesterStartDate: updated.semesterStartDate,
      semesterEndDate: updated.semesterEndDate
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update semester dates' });
  }
});

// POST /api/settings/reset
router.post('/reset', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const { scope = 'default', subjectId, customAttended, customTotal } = req.body || {};
    let updatedState: AppState;

    if (scope === 'attendance') {
      const current = db.getUserState(userId);
      const updatedSubjects = current.subjects.map(s => {
        if (!subjectId || s.id === subjectId) {
          return {
            ...s,
            attendedClasses: customAttended !== undefined ? Number(customAttended) : 0,
            totalClasses: customTotal !== undefined ? Number(customTotal) : 0
          };
        }
        return s;
      });
      const filteredRecords = subjectId
        ? current.attendanceRecords.filter(r => r.subjectId !== subjectId)
        : [];
      updatedState = db.updateUserState(userId, {
        subjects: updatedSubjects,
        attendanceRecords: filteredRecords
      });
      return res.json({ message: 'Attendance records reset successfully', state: updatedState });
    } else if (scope === 'timetable') {
      updatedState = db.updateUserState(userId, {
        timetableSlots: [],
        replacementDays: [],
        facultyLeaves: []
      });
      return res.json({ message: 'Timetable reset successfully', state: updatedState });
    } else if (scope === 'milestones') {
      updatedState = db.updateUserState(userId, {
        semesterMilestones: []
      });
      return res.json({ message: 'Milestones reset successfully', state: updatedState });
    } else if (scope === 'notes') {
      updatedState = db.updateUserState(userId, {
        notes: []
      });
      return res.json({ message: 'Notes reset successfully', state: updatedState });
    } else if (scope === 'clean') {
      const current = db.getUserState(userId);
      updatedState = db.updateUserState(userId, {
        subjects: [],
        attendanceRecords: [],
        timetableSlots: [],
        replacementDays: [],
        facultyLeaves: [],
        notes: [],
        events: [],
        semesterMilestones: []
      });
      return res.json({ message: 'Workspace fully reset to clean state', state: updatedState });
    } else {
      updatedState = db.resetUserState(userId);
      return res.json({ message: 'Workspace reset to default sample dataset', state: updatedState });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to reset workspace' });
  }
});

// POST /api/settings/import
router.post('/import', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const rawData = req.body;

    if (!rawData || typeof rawData !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON payload structure' });
    }

    const state = db.getUserState(userId);
    const validatedState: AppState = {
      ...initialAppState,
      ...rawData,
      profile: { ...state.profile, ...(rawData.profile || {}) },
      subjects: Array.isArray(rawData.subjects) ? rawData.subjects : [],
      attendanceRecords: Array.isArray(rawData.attendanceRecords) ? rawData.attendanceRecords : [],
      timetableSlots: Array.isArray(rawData.timetableSlots) ? rawData.timetableSlots : [],
      replacementDays: Array.isArray(rawData.replacementDays) ? rawData.replacementDays : [],
      holidays: Array.isArray(rawData.holidays) ? rawData.holidays : [],
      facultyLeaves: Array.isArray(rawData.facultyLeaves) ? rawData.facultyLeaves : [],
      notes: Array.isArray(rawData.notes) ? rawData.notes : [],
      events: Array.isArray(rawData.events) ? rawData.events : []
    };

    db.updateUserState(userId, validatedState);

    return res.json({ message: 'Workspace successfully imported', state: validatedState });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to import workspace JSON' });
  }
});

export default router;
