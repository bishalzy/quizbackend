import redisClient from "./redisClient.js"
import type {QuestionsResponse} from "../utils/types/questionTypes.js";

const redisConfig = {
    setValue: async (key: string, value: string | number | QuestionsResponse, expirationInSeconds?: number) => {
        try {
            const stringValue = String(value);
            if (expirationInSeconds) {
                await redisClient.setEx(key, expirationInSeconds, stringValue);
            } else {
                await redisClient.set(key, stringValue);
            }
        } catch (error) {
            console.error(`Error setting value in Redis for key ${key}:`, error);
        }
    },
    getValue: async (key: string): Promise<string | null> => {
        try {
            const value = await redisClient.get(key);
            return value;
        } catch (error) {
            console.error(`Error getting value from Redis for key ${key}:`, error);
            return null;
        }
    },
    checkValueExists: async (key: string): Promise<boolean> => {
        try {
            const exists = await redisClient.exists(key);
            return exists === 1;
        } catch (error) {
            console.error(`Error checking value existence in Redis for key ${key}:`, error);
            return false;
        }
    },
    deleteValue: async (key: string) => {
        try {
            await redisClient.del(key);
        } catch (error) {
            console.error(`Error deleting value from Redis for key ${key}:`, error);
        }
    },
}

export default redisConfig;