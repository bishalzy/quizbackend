import type { JwtPayload } from "jsonwebtoken";


export type jwtAccessTokenPayload = {
    session_id: number,
    user_id: number,
    username: string,
};

export interface decodedJwtAccessTokenPayload extends JwtPayload  {
    session_id: number,
    user_id: number,
    username: string,
};

