import {SettingKeyValue} from "../interfaces/setting-key-value.interface";
import {InitializerSettingInterface} from "../models/setting.model";
import {SettingLegacy} from "../interfaces/setting.legacy";
import {__ENV} from "../../../config/environment";
import RedisPublisherService from "../../../shared/redis/redis-pub.service.legacy";
import SettingRepository from "../repositories/setting.repository.legacy";

class SettingServiceLegacy {
    private static instance: SettingServiceLegacy;

    private cache?: InitializerSettingInterface;

    private constructor() {
    }

    static getInstance() {
        if (!SettingServiceLegacy.instance) SettingServiceLegacy.instance = new SettingServiceLegacy();
        return SettingServiceLegacy.instance;
    }

    async initializer(): Promise<InitializerSettingInterface> {
        const _PRIVATE: SettingKeyValue = await this.value();
        const _PUBLIC: SettingKeyValue = await this.value([], 1);

        return {
            pri: _PRIVATE,
            pub: _PUBLIC,
        };
    }

    async value(slug: string[] = [], is_public?: number): Promise<SettingKeyValue> {
        let settings: SettingLegacy[] | undefined = await SettingRepository.getBySlug(slug, is_public);

        // values
        return this.parser(settings);
    }

    parser(settings: SettingLegacy[] | undefined): SettingKeyValue {
        const OBJ_KEY: any = {};

        // values
        if (settings && settings.length) {
            for (let i = 0; i < settings.length; i++) {
                let value: any = settings[i].value;

                if (settings[i].type === "integer") {
                    value = value !== null ? parseInt(value) : 0;
                } else if (settings[i].type === "float") {
                    value = value !== null ? parseFloat(value) : 0;
                } else if (settings[i].type === "boolean") {
                    value = parseInt(value) === 1 ? 1 : 0;
                } else if (settings[i].type === "array") {
                    value = value !== null ? value.split(",") : [];
                }

                OBJ_KEY[settings[i].slug] = value;
            }
        }

        return OBJ_KEY;
    }

    setCache(data: any) {
        this.cache = data;
    }

    async getCache(): Promise<Readonly<Promise<InitializerSettingInterface> | InitializerSettingInterface>> {
        if (!RedisPublisherService.isConnected() && __ENV.CLUSTER) return Object.freeze(await this.initializer());

        if (this.cache) return Object.freeze(this.cache);

        return Object.freeze(await this.boot());
    }

    async boot(): Promise<InitializerSettingInterface> {
        const SETTINGS: InitializerSettingInterface = await this.initializer();

        this.setCache(SETTINGS);

        return SETTINGS;
    }
}

export default SettingServiceLegacy.getInstance();