import { createClient } from "redis";

const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || "6379"),
    },
});

redisClient.on("error", (err) => {
    console.error("Redis Client Error", err);
});
try{
    await redisClient.connect();
}catch(error){
    console.error("Error connecting to Redis:", error);
}


export default redisClient;