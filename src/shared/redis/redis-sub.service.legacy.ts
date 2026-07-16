import {logger} from "../../config/logger";
import {DBRedis} from "../../config/redis.legacy";
import RedisPublisherService from "./redis-pub.service";

class RedisSubService {
    private static instance: RedisSubService;

    private constructor() {
    }

    static getInstance(): RedisSubService {
        if (!RedisSubService.instance) RedisSubService.instance = new RedisSubService();
        return RedisSubService.instance;
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

export default RedisSubService.getInstance();