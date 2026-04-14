import jwt, { type JwtPayload } from 'jsonwebtoken';
import { findSessionByToken } from '../../models/Users.js';
import type { User, Session } from '../types/schema.types.js';
import type { decodedJwtAccessTokenPayload } from '../types/general.types.js';



const verifyAccessToken = async (token: string): Promise<decodedJwtAccessTokenPayload>=> {


    // Implementation for verifying access token
    const secretKey = process.env.JWT_SECRET_KEY;
    if (!secretKey) {
        throw new Error('JWT secret key is not defined');
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        return decoded as decodedJwtAccessTokenPayload;
    } catch (error) {
        throw new Error('Invalid token');
    }
};

const verifyRefreshToken = async (token: string) => {
    
    const session = await findSessionByToken(token);
    if (!session) {
        throw new Error('Invalid refresh token');
    }
    return session;
};

export  {verifyAccessToken, verifyRefreshToken};