import {logger} from "../../config/logger";
import {DBRedis} from "../../config/redis.legacy";
import RedisPublisherService from "./redis-pub.service.legacy";

class RedisSubServiceLegacy {
    private static instance: RedisSubServiceLegacy;

    private constructor() {
    }

    static getInstance(): RedisSubServiceLegacy {
        if (!RedisSubServiceLegacy.instance) RedisSubServiceLegacy.instance = new RedisSubServiceLegacy();
        return RedisSubServiceLegacy.instance;
    }

    subscribe(name: string) {
        if (!RedisPublisherService.isConnected()) return;
        if (!DBRedis.subscriber) return;

        DBRedis.subscriber.subscribe(name, (err: Error | null | undefined, count: number | unknown) => {
            if (err) {
                logger.error(`Failed to subscribe: ${err.message}`);
            } else {
                logger.info(`Subscribed to ${count} channel(s)`);
            }
        });
    }
}

export default RedisSubServiceLegacy.getInstance();