import {Knex} from "knex";
import {DBKnex} from "../../config/knex";

export const ROLE_TABLE = "roles";

export function RoleModel(knex?: Knex) {
    return {
        table: () => (knex ? knex : DBKnex).table(ROLE_TABLE),
    };
}