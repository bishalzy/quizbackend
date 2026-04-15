import { EndpointsConfig } from "./general.config.js";


export const cookieOptions = {
    httpOnly: true,
    secure: process.env.MODE === "production",
    sameSite: "lax",
    domain: EndpointsConfig.frontendDomain,
    maxAge:15 * 60 * 1000 // 15 minutes
};

export const refreshTokenCookieOptions = {
    httpOnly: true,
    secure: process.env.MODE === "production",
    sameSite: "lax",
    domain: EndpointsConfig.frontendDomain,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};