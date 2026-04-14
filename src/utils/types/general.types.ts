import type { JwtPayload } from "jsonwebtoken";


export type jwtAccessTokenPayload = {
    session_id: string,
    user_id: number,
    username: string,
};

export interface decodedJwtAccessTokenPayload extends JwtPayload  {
    session_id: string,
    user_id: number,
    username: string,
};

