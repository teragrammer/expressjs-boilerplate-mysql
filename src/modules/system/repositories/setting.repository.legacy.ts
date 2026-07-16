import {SettingModel} from "../models/setting.model";
import {SettingLegacy} from "../interfaces/setting.legacy";

class SettingRepositoryLegacy {
    private static instance: SettingRepositoryLegacy;

    private constructor() {
    }

    static getInstance(): SettingRepositoryLegacy {
        if (!SettingRepositoryLegacy.instance) SettingRepositoryLegacy.instance = new SettingRepositoryLegacy();
        return SettingRepositoryLegacy.instance;
    }

    getBySlug(slug: string [] = [], is_public?: number): Promise<SettingLegacy[]> {
        const Q = SettingModel().table()
            .where("is_disabled", 0);

        if (typeof is_public !== "undefined") Q.where("is_public", is_public);
        if (slug.length) Q.whereIn("slug", slug);

        return Q;
    }
}

export default SettingRepositoryLegacy.getInstance();