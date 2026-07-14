import {logger} from "../../../config/logger";
import {DBRedis} from "../../../config/redis";
import {SecurityUtil} from "../../../common/utils/security.util";
import {SET_CACHE_SETTINGS} from "../models/setting.model";
import {SET_CACHE_GUARDS} from "../models/route-guard.model";
import SettingService from "../services/setting.service";
import RouteGuardService from "../services/route-guard.service";

class SystemEventHandler {
    // Called once on application startup to bind listeners for this module
    initListeners() {
        if (!DBRedis.subscriber) return;

        DBRedis.subscriber.on("message", async (channel: string) => {
            if (channel === SET_CACHE_SETTINGS || channel === SET_CACHE_GUARDS) {
                await this.handleCacheUpdate(channel);
            }
        });
    }

    private async handleCacheUpdate(channel: string) {
        try {
            if (!DBRedis.publisher) return;
            const encryptedData = await DBRedis.publisher.get(channel);
            if (!encryptedData) return;

            const decrypted = await SecurityUtil().unshield(encryptedData);
            const parsedData = JSON.parse(decrypted);

            if (channel === SET_CACHE_SETTINGS) SettingService.setCache(parsedData);
            if (channel === SET_CACHE_GUARDS) RouteGuardService.setCache(parsedData);

            logger.info(`System Module updated local cache for channel: ${channel}`);
        } catch (err: any) {
            logger.error(`Failed handling event for channel ${channel}: ${err.message}`);
        }
    }
}

export default new SystemEventHandler();