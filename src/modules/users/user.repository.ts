// src/modules/users/user.repository.ts
import {Knex} from "knex";
import {DBKnex} from "../../config/knex";
import {BrowseUsersQuery, BrowseUsersResult, CreateUserDTO, UpdateUserDTO, User, UserRow,} from "./user.interface";

export const USER_TABLE = "users";

const USER_PUBLIC_COLUMNS: (keyof UserRow)[] = [
    "id",
    "first_name",
    "middle_name",
    "last_name",
    "gender",
    "address",
    "phone",
    "is_phone_verified",
    "email",
    "is_email_verified",
    "has_tfa",
    "role_id",
    "username",
    "status",
    "comments",
    "created_at",
    "updated_at",
];

export class UserRepository {
    private readonly db: Knex;

    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    private get table() {
        return this.db<UserRow>(USER_TABLE).whereNull("deleted_at");
    }

    private get rawTable() {
        return this.db<UserRow>(USER_TABLE);
    }

    private mapToUser(row: UserRow): User {
        return {
            ...row,
            is_phone_verified: Boolean(row.is_phone_verified),
            is_email_verified: Boolean(row.is_email_verified),
            has_tfa: Boolean(row.has_tfa),
        };
    }

    async findById(id: number): Promise<User | null> {
        const row = await this.table
            .where({id})
            .first();

        return row ? this.mapToUser(row) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const row = await this.table
            .where({email})
            .first();

        return row ? this.mapToUser(row) : null;
    }

    async findByPhone(phone: string): Promise<User | null> {
        const row = await this.table
            .where({phone})
            .first();

        return row ? this.mapToUser(row) : null;
    }

    async findByUsername(username: string): Promise<User | null> {
        const row = await this.table
            .where({username})
            .first();

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
            password: data.password || null,
            status: data.status || "Activated",
            login_tries: 0,
            failed_login_expired_at: null,
            comments: data.comments || null,
        };

        const [newRow] = await this.table
            .insert(insertPayload)
            .returning("*");

        return this.mapToUser(newRow);
    }

    async update(
        id: number,
        data: UpdateUserDTO,
        status?: string,
    ): Promise<User | null> {
        const existingRow = await this.table
            .select("id")
            .where("id", id)
            .first();

        if (!existingRow) {
            return null;
        }

        const updatePayload: Partial<UserRow> = {
            ...(data.first_name !== undefined && {
                first_name: data.first_name,
            }),
            ...(data.middle_name !== undefined && {
                middle_name: data.middle_name,
            }),
            ...(data.last_name !== undefined && {
                last_name: data.last_name,
            }),
            ...(data.gender !== undefined && {
                gender: data.gender,
            }),
            ...(data.address !== undefined && {
                address: data.address,
            }),
            ...(data.phone !== undefined && {
                phone: data.phone,
            }),
            ...(data.is_phone_verified !== undefined && {
                is_phone_verified: data.is_phone_verified ? 1 : 0,
            }),
            ...(data.email !== undefined && {
                email: data.email,
            }),
            ...(data.is_email_verified !== undefined && {
                is_email_verified: data.is_email_verified ? 1 : 0,
            }),
            ...(data.has_tfa !== undefined && {
                has_tfa: data.has_tfa ? 1 : 0,
            }),
            ...(data.tfa_secret !== undefined && {
                tfa_secret: data.tfa_secret,
            }),
            ...(data.role_id !== undefined && {
                role_id: data.role_id,
            }),
            ...(data.username !== undefined && {
                username: data.username,
            }),
            ...(data.password !== undefined && {
                password: data.password,
            }),
            ...(data.status !== undefined && {
                status: data.status,
            }),
            ...(data.login_tries !== undefined && {
                login_tries: data.login_tries,
            }),
            ...(data.failed_login_expired_at !== undefined && {
                failed_login_expired_at: data.failed_login_expired_at,
            }),
            ...(data.comments !== undefined && {
                comments: data.comments,
            }),
            updated_at: new Date(),
        };

        let query = this.table.where({id});

        if (status !== undefined) {
            query = query.where("status", status);
        }

        const [updatedRow] = await query
            .update(updatePayload)
            .returning("*");

        return updatedRow
            ? this.mapToUser(updatedRow)
            : null;
    }

    /**
     * Cursor-based user browsing.
     *
     * Uses the primary key for stable and efficient pagination:
     *
     * WHERE id < cursor
     * ORDER BY id DESC
     * LIMIT limit + 1
     *
     * No COUNT(*) and no OFFSET are required.
     */
    async browse(
        query: BrowseUsersQuery,
    ): Promise<BrowseUsersResult> {
        const {
            role_id,
            status,
            search,
            cursor,
            limit,
        } = query;

        let baseQuery = this.table;

        if (role_id !== undefined) {
            baseQuery = baseQuery.where("role_id", role_id);
        }

        if (status !== undefined) {
            baseQuery = baseQuery.where("status", status);
        }

        if (cursor !== undefined) {
            baseQuery = baseQuery.where("id", "<", cursor);
        }

        if (search) {
            const keyword = `%${search}%`;

            baseQuery = baseQuery.where((builder) => {
                builder
                    .where("first_name", "like", keyword)
                    .orWhere("middle_name", "like", keyword)
                    .orWhere("last_name", "like", keyword)
                    .orWhere("username", "like", keyword)
                    .orWhere("phone", "like", keyword)
                    .orWhere("email", "like", keyword);
            });
        }

        const rows = await baseQuery
            .select(USER_PUBLIC_COLUMNS)
            .orderBy("id", "desc")
            .limit(limit + 1);

        const hasMore = rows.length > limit;

        const data: User[] = rows
            .slice(0, limit)
            .map((row) => ({
                ...row,
                is_phone_verified: Boolean(row.is_phone_verified),
                is_email_verified: Boolean(row.is_email_verified),
                has_tfa: Boolean(row.has_tfa),
            })) as User[];

        const nextCursor =
            hasMore && data.length > 0
                ? data[data.length - 1].id
                : null;

        return {
            data,
            hasMore,
            nextCursor,
        };
    }

    async updatePassword(
        id: number,
        password: string,
        trx?: Knex.Transaction,
    ): Promise<boolean> {
        const db = trx ?? this.db;

        const updatedRows = await db<UserRow>(USER_TABLE)
            .where({id})
            .whereNull("deleted_at")
            .update({
                password,
                updated_at: db.fn.now(),
            });

        return updatedRows > 0;
    }

    async incrementLoginTries(
        id: number,
    ): Promise<User | null> {
        const [updatedRow] = await this.table
            .where({id})
            .increment("login_tries", 1)
            .returning("*");

        return updatedRow
            ? this.mapToUser(updatedRow)
            : null;
    }

    async softDelete(id: number): Promise<boolean> {
        const deletedRows = await this.table
            .where({id})
            .update({
                deleted_at: new Date(),
                updated_at: new Date(),
            });

        return deletedRows > 0;
    }

    async hardDelete(id: number): Promise<boolean> {
        const deletedRows = await this.rawTable
            .where({id})
            .del();

        return deletedRows > 0;
    }
}
