
import { verifyAccessToken } from '../utils/token/verifyToken.js';
import type { decodedJwtAccessTokenPayload } from '../utils/types/general.types.js';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: number;
        username: string;
        session_id: number;
      };
    }
  }
}


const authGuardMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Implementation for authentication guard middleware
  const accessToken = req.cookies.access_token;
  const refreshToken = req.cookies.refresh_token;
  // console.log('Access token in authGuardMiddleware:', accessToken??'No access token');
  // console.log('Refresh token in authGuardMiddleware:', refreshToken?? 'No refresh token');

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if(!accessToken &&refreshToken){
    return res.status(498).json({ error: 'Expired access token' });
  }
  // console.log('Token received in authGuardMiddleware:', accessToken);
  try {
    const decoded: decodedJwtAccessTokenPayload = await verifyAccessToken(accessToken);
    // console.log('Decoded token in authGuardMiddleware:', decoded);
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