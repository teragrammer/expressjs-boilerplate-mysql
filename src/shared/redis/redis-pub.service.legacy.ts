import { DBRedis, DBRedisInterface } from "../../config/redis.legacy";
import { SecurityUtil } from "../../common/utils/security.util";
import { logger } from "../../config/logger";
import { __ENV } from "../../config/environment";

class RedisPubServiceLegacy {
    private static instance: RedisPubServiceLegacy;
    private constructor() {}

    static getInstance() {
        if (!RedisPubServiceLegacy.instance) RedisPubServiceLegacy.instance = new RedisPubServiceLegacy();
        return RedisPubServiceLegacy.instance;
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

export default RedisPubServiceLegacy.getInstance();