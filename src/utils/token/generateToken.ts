import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import  type{jwtAccessTokenPayload} from "../types/general.types.js";

const generateAccessToken = (payload: jwtAccessTokenPayload) => {
    const { session_id, user_id, username } = payload;
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT secret is not defined');
    }
    return jwt.sign({ session_id, user_id, username }, secret, { expiresIn: '10m' });
};

const generateRefreshToken = (): string => {
    return crypto.randomBytes(64).toString('hex');
};

export  {generateAccessToken, generateRefreshToken};