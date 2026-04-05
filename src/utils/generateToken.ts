import * as jwt from 'jsonwebtoken';

const generateToken = (payload: any) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT secret is not defined');
    }
    return jwt.sign(payload, secret, { expiresIn: '1h' });
};

export default generateToken;