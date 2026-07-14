import { DBRedis, DBRedisInterface } from "../../config/redis";
import { SecurityUtil } from "../../common/utils/security.util";
import { logger } from "../../config/logger";
import { __ENV } from "../../config/environment";

class RedisPubService {
    private static instance: RedisPubService;
    private constructor() {}

    static getInstance() {
        if (!RedisPubService.instance) RedisPubService.instance = new RedisPubService();
        return RedisPubService.instance;
    }

    async publishCache(channel: string, data: any) {
        try {
            if (!this.isConnected()) return;

            const REDIS: DBRedisInterface = DBRedis;
            if (!REDIS.publisher) return;

            const DATA: string = JSON.stringify(data);
            const PAYLOAD: string = await SecurityUtil().shield(DATA);

            await REDIS.publisher.set(channel, PAYLOAD);
            await REDIS.publisher.publish(channel, "");

            logger.info(`Redis ${channel} publish success`);
        } catch (err: any) {
            logger.error(`Publishing to channel ${channel} failed: ${err}`);
        }
    }

    isConnected(): boolean {
        if (__ENV.REDIS_HOST === "") return false;
        const REDIS: DBRedisInterface = DBRedis;
        return (REDIS?.publisher?.status === "connect" && REDIS?.subscriber?.status === "connect");
    }
}

export default RedisPubService.getInstance();