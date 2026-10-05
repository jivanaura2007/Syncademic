import { Request, Response, NextFunction } from 'express';
import { db } from '../db';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  
  if (token && token.startsWith('sync_tok_')) {
    const userId = token.replace('sync_tok_', '');
    const user = db.findUserById(userId);
    if (user) {
      req.userId = user.id;
      return next();
    }
  }

  return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
}
