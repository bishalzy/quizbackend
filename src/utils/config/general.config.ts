
const generalConfig = {
    frontendDomain: process.env.MODE === 'production' ? process.env.FRONTEND_DOMAIN : "http://localhost:5173",
};

export default generalConfig;