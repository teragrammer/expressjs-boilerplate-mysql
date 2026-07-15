import {UserModel} from "./user.model";
import {UserRole} from "./user.legacy";

class UserRepositoryLegacy {
    private static instance: UserRepositoryLegacy;
    private readonly _PROFILE_COLUMN_COMPLETE = ["users.*", "roles.slug", "roles.is_public", "roles.is_bypass_authorization"];

    constructor() {
    }

    static getInstance(): UserRepositoryLegacy {
        if (!UserRepositoryLegacy.instance) UserRepositoryLegacy.instance = new UserRepositoryLegacy();
        return UserRepositoryLegacy.instance;
    }

    joinRole() {
        return UserModel().table()
            .select(this._PROFILE_COLUMN_COMPLETE)
            .leftJoin("roles", "users.role_id", "=", "roles.id");
    }

    byId(id: number): Promise<UserRole> {
        return this.joinRole()
            .where("users.id", id)
            .first();
    }

    byUsername(username: string): Promise<UserRole> {
        return this.joinRole()
            .where("users.username", username)
            .first();
    }

    byEmail(email: string): Promise<UserRole> {
        return this.joinRole()
            .where("users.email", email)
            .first();
    }

    byPhone(phone: string): Promise<UserRole> {
        return this.joinRole()
            .where("users.phone", phone)
            .first();
    }

    byContact(type: string, to: string): Promise<UserRole> | null {
        if (type === "email") return this.byEmail(to);
        if (type === "phone") return this.byPhone(to);

        return null;
    }
}

export default UserRepositoryLegacy.getInstance();