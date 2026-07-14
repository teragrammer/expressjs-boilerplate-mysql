import {Knex} from "knex";
import {SettingKeyValue} from "../interfaces/setting-key.value";
import {DBKnex} from "../config/knex";

export const SETTING_TABLE = "settings";

export const DATA_TYPES = ["string", "integer", "float", "boolean", "array"];

export const SET_CACHE_SETTINGS = "set_cache_settings";

export interface InitializerSettingInterface {
    pri: SettingKeyValue;
    pub: SettingKeyValue;
}

export function SettingModel(knex?: Knex) {
    return {
        table: () => (knex ? knex : DBKnex).table(SETTING_TABLE),
    };
}