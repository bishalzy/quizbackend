import { verifyAccessToken } from '../utils/token/verifyToken.js';
import type { decodedJwtAccessTokenPayload } from '../utils/types/general.types.js';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: number;
        username: string;
        session_id: string;
      };
    }
  }
}


const authGuardMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Implementation for authentication guard middleware
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded: decodedJwtAccessTokenPayload = await verifyAccessToken(token);

    req.user = {
      user_id: decoded.user_id,
      username: decoded.username,
      session_id: decoded.session_id
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};



export default authGuardMiddleware;