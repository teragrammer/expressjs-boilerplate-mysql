// src/modules/system/interfaces/setting.interface.ts
import {SettingKeyValue} from "./setting-key-value.interface";

/**
 * Supported data types for setting values in the database.
 */
export type SettingDataType =
    | "string"
    | "integer"
    | "float"
    | "boolean"
    | "array";

/**
 * Raw database representation.
 *
 * MySQL BOOLEAN is effectively TINYINT(1), so Knex/mysql2
 * commonly returns 0/1 for these columns.
 */
export interface SettingRow {
    id: number;
    name: string;
    slug: string;
    value: string | null;
    description: string | null;
    type: SettingDataType;
    is_disabled: number;
    is_public: number;
    created_at: Date | string;
    updated_at: Date | string;
}

/**
 * Application/domain representation.
 */
export interface Setting {
    id: number;
    name: string;
    slug: string;
    value: string | null;
    description: string | null;
    type: SettingDataType;
    is_disabled: boolean;
    is_public: boolean;
    created_at: Date | string;
    updated_at: Date | string;
}

/**
 * The unified shape returned by the SettingService initializer.
 */
export interface InitializerSetting {
    pri: SettingKeyValue;
    pub: SettingKeyValue;
}

export interface CreateSettingDTO {
    name: string;
    slug: string;
    value: string | null;
    description: string | null;
    type: SettingDataType;
    is_disabled?: boolean;
    is_public?: boolean;
}

export interface UpdateSettingDTO {
    name?: string;
    slug?: string;
    value?: string | null;
    description?: string | null;
    type?: SettingDataType;
    is_disabled?: boolean;
    is_public?: boolean;
}

export interface BrowseSettingQuery {
    is_disabled?: boolean;
    is_public?: boolean;
    type?: SettingDataType;
    search?: string;
    page: number;
    perPage: number;
}
