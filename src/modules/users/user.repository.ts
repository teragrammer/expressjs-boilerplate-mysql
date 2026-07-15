// src/modules/users/user.repository.ts
import {Knex} from "knex";
import {DBKnex} from "../../config/knex";
import {CreateUserDTO, UpdateUserDTO, User, UserRow} from "./user.interface";

export const USER_TABLE = "users";

export class UserRepository {
    private readonly db: Knex;

    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    private get table() {
        // Standard query builder targeting non-soft-deleted rows
        return this.db<UserRow>(USER_TABLE).whereNull("deleted_at");
    }

    // Pure representation that accesses all items (including soft deleted) when needed
    private get rawTable() {
        return this.db<UserRow>(USER_TABLE);
    }

    private mapToUser(row: UserRow): User {
        return {
            ...row,
            is_phone_verified: Boolean(row.is_phone_verified),
            is_email_verified: Boolean(row.is_email_verified),
        };
    }

    async findById(id: number): Promise<User | null> {
        const row = await this.table.where({id}).first();
        return row ? this.mapToUser(row) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const row = await this.table.where({email}).first();
        return row ? this.mapToUser(row) : null;
    }

    async findByPhone(phone: string): Promise<User | null> {
        const row = await this.table.where({phone}).first();
        return row ? this.mapToUser(row) : null;
    }

    async findByUsername(username: string): Promise<User | null> {
        const row = await this.table.where({username}).first();
        return row ? this.mapToUser(row) : null;
    }

    async create(data: CreateUserDTO): Promise<User> {
        const insertPayload: Partial<UserRow> = {
            first_name: data.first_name || null,
            middle_name: data.middle_name || null,
            last_name: data.last_name || null,
            gender: data.gender || null,
            address: data.address || null,
            phone: data.phone || null,
            is_phone_verified: 0,
            email: data.email || null,
            is_email_verified: 0,
            role_id: data.role_id,
            username: data.username || null,
            password: data.password || null, // Ensure hashing is done prior to repository invocation
            status: data.status || "Activated",
            login_tries: 0,
            failed_login_expired_at: null,
            comments: data.comments || null,
        };

        const [newRow] = await this.table.insert(insertPayload).returning("*");
        return this.mapToUser(newRow);
    }

    async update(id: number, data: UpdateUserDTO): Promise<User | null> {
        const updatePayload: Partial<UserRow> = {
            ...(data.first_name !== undefined && {first_name: data.first_name}),
            ...(data.middle_name !== undefined && {middle_name: data.middle_name}),
            ...(data.last_name !== undefined && {last_name: data.last_name}),
            ...(data.gender !== undefined && {gender: data.gender}),
            ...(data.address !== undefined && {address: data.address}),
            ...(data.phone !== undefined && {phone: data.phone}),
            ...(data.is_phone_verified !== undefined && {is_phone_verified: data.is_phone_verified ? 1 : 0}),
            ...(data.email !== undefined && {email: data.email}),
            ...(data.is_email_verified !== undefined && {is_email_verified: data.is_email_verified ? 1 : 0}),
            ...(data.role_id !== undefined && {role_id: data.role_id}),
            ...(data.username !== undefined && {username: data.username}),
            ...(data.password !== undefined && {password: data.password}),
            ...(data.status !== undefined && {status: data.status}),
            ...(data.login_tries !== undefined && {login_tries: data.login_tries}),
            ...(data.failed_login_expired_at !== undefined && {failed_login_expired_at: data.failed_login_expired_at}),
            ...(data.comments !== undefined && {comments: data.comments}),
            updated_at: new Date(),
        };

        const [updatedRow] = await this.table
            .where({id})
            .update(updatePayload)
            .returning("*");

        return updatedRow ? this.mapToUser(updatedRow) : null;
    }

    /**
     * Safe Soft Delete (Sets deleted_at instead of wiping record permanently)
     */
    async softDelete(id: number): Promise<boolean> {
        const deletedRows = await this.table
            .where({id})
            .update({deleted_at: new Date(), updated_at: new Date()});
        return deletedRows > 0;
    }

    /**
     * Hard Delete (Only if explicitly required, permanently purges data)
     */
    async hardDelete(id: number): Promise<boolean> {
        const deletedRows = await this.rawTable.where({id}).del();
        return deletedRows > 0;
    }
}