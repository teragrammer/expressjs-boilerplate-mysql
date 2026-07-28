import {AuthenticationTokenModelLegacy} from "../models/authentication-token.model.legacy";
import {DateUtil} from "../../../common/utils/date.util";

class AuthenticationTokenRepositoryLegacy {
    private static instance: AuthenticationTokenRepositoryLegacy;

    constructor() {
    }

    static getInstance(): AuthenticationTokenRepositoryLegacy {
        if (!AuthenticationTokenRepositoryLegacy.instance) AuthenticationTokenRepositoryLegacy.instance = new AuthenticationTokenRepositoryLegacy();
        return AuthenticationTokenRepositoryLegacy.instance;
    }

    insert(data: any) {
        return AuthenticationTokenModelLegacy().table().returning("id").insert(data);
    }

    deleteExpiredByUserId(userId: number) {
        return AuthenticationTokenModelLegacy().table()
            .where("user_id", userId)
            .where("expired_at", "<", DateUtil.sql())
            .delete();
    }

    deleteAllByUserId(userId: number) {
        return AuthenticationTokenModelLegacy().table()
            .where("user_id", userId)
            .delete();
    }
}

export default AuthenticationTokenRepositoryLegacy.getInstance();