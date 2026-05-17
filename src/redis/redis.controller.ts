import redisConfig from "./redis.config.js";
import type {QuestionsResponse} from "../utils/types/questionTypes.js";


const redisController = {
    cacheQuestion: async (value: string | number | QuestionsResponse, expirationInSeconds?: number) => {
        try {
            await redisConfig.setValue('cachedQuestion', value, expirationInSeconds);
        } catch (error) {
            console.error('Error caching question in Redis:', error);
        }
    },
    getCachedQuestion: async (): Promise<string | number | QuestionsResponse | null> => {
        try {
            const cachedQuestion = await redisConfig.getValue('cachedQuestion');
            return cachedQuestion;
        } catch (error) {
            console.error('Error retrieving cached question from Redis:', error);
            return null;
        }
    },
    deleteCachedQuestion: async () => {
        try {
            await redisConfig.deleteValue('cachedQuestion');
        } catch (error) {
            console.error('Error deleting cached question from Redis:', error);
        }
    }
}

export default redisController;


