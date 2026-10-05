import { Router } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', (req, res) => {
  try {
    const { email, password, passwordPlain, name, university, department, semester } = req.body;
    const pwd = password || passwordPlain;

    if (!email || !pwd || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (pwd.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const user = db.createUser(email, pwd, {
      name,
      university,
      department,
      semester: Number(semester) || 4
    });

    const token = `sync_tok_${user.id}`;

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        profile: user.state.profile
      },
      state: user.state
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password, passwordPlain } = req.body;
    const pwd = password || passwordPlain;

    if (!email || !pwd) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.verifyCredentials(email, pwd);
    if (!user) {
      return res.status(401).json({ error: 'Invalid university email or password.' });
    }

    const token = `sync_tok_${user.id}`;

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        profile: user.state.profile
      },
      state: user.state
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Get current user session & full workspace state
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const state = db.getUserState(userId);
    const user = db.findUserById(userId);

    return res.json({
      user: {
        id: user?.id,
        email: user?.email,
        profile: state.profile
      },
      state
    });
  } catch (err: any) {
    return res.status(404).json({ error: 'User session not found' });
  }
});

// Update Profile
router.put('/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const updates = req.body;

    const currentState = db.getUserState(userId);
    const updatedState = db.updateUserState(userId, {
      profile: {
        ...currentState.profile,
        ...updates
      }
    });

    return res.json({
      message: 'Profile updated successfully',
      profile: updatedState.profile
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update profile' });
  }
});

export default router;
