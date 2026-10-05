import { Router } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AttendanceRecord } from '../../src/types';

const router = Router();

// GET /api/attendance
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    return res.json(state.attendanceRecords);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch attendance records' });
  }
});

// POST /api/attendance/mark
router.post('/mark', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const { subjectId, date, timeSlot, status, note } = req.body;

    if (!subjectId || !date || !timeSlot || !status) {
      return res.status(400).json({ error: 'subjectId, date, timeSlot, and status are required' });
    }

    const existingIndex = state.attendanceRecords.findIndex(
      r => r.subjectId === subjectId && r.date === date && r.timeSlot === timeSlot
    );

    const prevStatus = existingIndex !== -1 ? state.attendanceRecords[existingIndex].status : null;
    const newRecords = [...state.attendanceRecords];

    let recordedEntry: AttendanceRecord;

    if (existingIndex !== -1) {
      recordedEntry = {
        ...newRecords[existingIndex],
        status,
        note: note !== undefined ? note : newRecords[existingIndex].note,
        updatedAt: new Date().toISOString()
      };
      newRecords[existingIndex] = recordedEntry;
    } else {
      recordedEntry = {
        id: 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        subjectId,
        date,
        timeSlot,
        status,
        note,
        updatedAt: new Date().toISOString()
      };
      newRecords.push(recordedEntry);
    }

    // Authoritative math calculation for subject totals
    const targetSubject = state.subjects.find(s => s.id === subjectId);
    let updatedSubjects = state.subjects;

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
        updatedSubjects = state.subjects.map(s =>
          s.id === subjectId ? { ...s, attendedClasses: newAttended, totalClasses: newTotal } : s
        );
      }
    }

    db.updateUserState(userId, {
      attendanceRecords: newRecords,
      subjects: updatedSubjects
    });

    return res.status(200).json({
      record: recordedEntry,
      updatedSubject: updatedSubjects.find(s => s.id === subjectId)
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to mark attendance' });
  }
});

// GET /api/attendance/summary
router.get('/summary', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);

    const subjectsSummary = state.subjects.map(s => {
      const percentage = s.totalClasses > 0 ? Math.round((s.attendedClasses / s.totalClasses) * 100) : 100;
      const targetFrac = s.targetAttendance / 100;
      
      let safeBunks = 0;
      if (percentage >= s.targetAttendance && targetFrac > 0) {
        safeBunks = Math.max(0, Math.floor((s.attendedClasses - targetFrac * s.totalClasses) / targetFrac));
      }

      let classesNeeded = 0;
      if (percentage < s.targetAttendance) {
        if (targetFrac >= 1) {
          classesNeeded = Math.max(1, s.totalClasses - s.attendedClasses);
        } else {
          classesNeeded = Math.max(1, Math.ceil((targetFrac * s.totalClasses - s.attendedClasses) / (1 - targetFrac)));
        }
      }

      return {
        subjectId: s.id,
        code: s.code,
        name: s.name,
        attended: s.attendedClasses,
        total: s.totalClasses,
        percentage,
        target: s.targetAttendance,
        safeBunks,
        classesNeeded,
        status: percentage >= s.targetAttendance ? 'safe' : percentage >= s.targetAttendance - 10 ? 'warning' : 'critical'
      };
    });

    const totalAttended = state.subjects.reduce((sum, s) => sum + s.attendedClasses, 0);
    const totalConducted = state.subjects.reduce((sum, s) => sum + s.totalClasses, 0);
    const overallPercentage = totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : 100;

    return res.json({
      overallPercentage,
      totalAttended,
      totalConducted,
      subjects: subjectsSummary
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate summary' });
  }
});

export default router;
