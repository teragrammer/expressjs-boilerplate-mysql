import {AuthenticationTokenModelLegacy} from "../models/authentication-token.model.legacy";
import {DateUtil} from "../../../common/utils/date.util";

class AuthenticationTokenRepository {
    private static instance: AuthenticationTokenRepository;

    constructor() {
    }

    static getInstance(): AuthenticationTokenRepository {
        if (!AuthenticationTokenRepository.instance) AuthenticationTokenRepository.instance = new AuthenticationTokenRepository();
        return AuthenticationTokenRepository.instance;
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

export default AuthenticationTokenRepository.getInstance();