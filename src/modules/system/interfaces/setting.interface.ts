// src/modules/system/interfaces/setting.interface.ts

import {SettingKeyValue} from "./setting-key-value.interface";

/**
 * Supported data types for setting values in the database.
 * This aligns directly with your Knex migration enum.
 */
export type SettingDataType = "string" | "integer" | "float" | "boolean" | "array";

/**
 * Represents the raw, strongly-typed database record structure
 * returned by Knex / SettingRepository.
 */
export interface SettingRow {
    id: number;
    name: string;
    slug: string;
    value: string | null;
    description: string | null;
    type: SettingDataType;
    is_disabled: boolean; // or number (0 | 1) if using strict MySQL tinyint, but boolean is standard
    is_public: boolean;
    created_at: Date | string;
    updated_at: Date | string;
}

/**
 * The unified shape returned by our SettingService initializer,
 * grouping settings cleanly by access permission.
 */
export interface InitializerSetting {
    pri: SettingKeyValue; // Private/Internal settings
    pub: SettingKeyValue; // Publicly exposable settings
}