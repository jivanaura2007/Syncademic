import { Router } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AcademicNote } from '../../src/types';

const router = Router();

// GET /api/notes
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const { subjectId, category, query } = req.query;

    let notes = state.notes;

    if (subjectId && subjectId !== 'all') {
      notes = notes.filter(n => n.subjectId === subjectId);
    }

    if (category && category !== 'all') {
      notes = notes.filter(n => n.category === category);
    }

    if (query) {
      const q = String(query).toLowerCase();
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.description && n.description.toLowerCase().includes(q)) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return res.json(notes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch notes' });
  }
});

// POST /api/notes
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const { title, subjectId, category, fileType, description, contentText, tags, fileName, fileSize, fileUrl, isWrittenNote, gdriveId, gdriveUrl } = req.body;

    if (!title || !subjectId) {
      return res.status(400).json({ error: 'Title and subjectId are required' });
    }

    const now = new Date().toISOString().split('T')[0];
    const newNote: AcademicNote = {
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      subjectId,
      semester: state.profile.semester,
      category: category || 'notes',
      fileType: fileType || 'pdf',
      description: description ? description.trim() : undefined,
      contentText,
      tags: Array.isArray(tags) ? tags : [],
      fileName: fileName || (isWrittenNote ? `${title.replace(/\s+/g, '_')}.md` : 'document.pdf'),
      fileSize: fileSize || (isWrittenNote ? '12 KB' : '1.4 MB'),
      fileUrl,
      isWrittenNote: Boolean(isWrittenNote),
      gdriveId: state.googleDriveSettings?.connected ? (gdriveId || `gd-${Date.now()}`) : undefined,
      gdriveUrl: gdriveUrl || undefined,
      createdAt: now,
      updatedAt: now
    };

    const updatedSubjects = state.subjects.map(s =>
      s.id === subjectId ? { ...s, notesCount: (s.notesCount || 0) + 1 } : s
    );

    db.updateUserState(userId, {
      notes: [newNote, ...state.notes],
      subjects: updatedSubjects
    });

    return res.status(201).json(newNote);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create note' });
  }
});

// PUT /api/notes/:id
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const noteId = req.params.id;
    const updates = req.body;

    const existingIndex = state.notes.findIndex(n => n.id === noteId);
    if (existingIndex === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updatedNote: AcademicNote = {
      ...state.notes[existingIndex],
      ...updates,
      id: noteId,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    const newNotes = [...state.notes];
    newNotes[existingIndex] = updatedNote;

    db.updateUserState(userId, { notes: newNotes });

    return res.json(updatedNote);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update note' });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const noteId = req.params.id;

    const targetNote = state.notes.find(n => n.id === noteId);
    const updatedSubjects = state.subjects.map(s => {
      if (targetNote && s.id === targetNote.subjectId) {
        return { ...s, notesCount: Math.max(0, (s.notesCount || 1) - 1) };
      }
      return s;
    });

    db.updateUserState(userId, {
      notes: state.notes.filter(n => n.id !== noteId),
      subjects: updatedSubjects
    });

    return res.json({ message: 'Note deleted successfully', noteId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete note' });
  }
});

export default router;
