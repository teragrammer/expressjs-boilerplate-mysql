import {Role} from "../src/interfaces/role";
import {User, UserRole} from "../src/modules/users/user";
import UserRepository from "../src/modules/users/user.repository";
import AuthenticationTokenService from "../src/modules/auth/services/authentication-token.service";
import {UserModel} from "../src/modules/users/user.model";
import {RoleModel} from "../src/models/role.model";
import {SecurityUtil} from "../src/common/utils/security.util";
import {TFA_HOLD} from "../src/modules/auth/models/two-factor-authentication.model";
import {__ENV} from "../src/config/environment";

export interface Options {
    role: string;
    username: string;
    tfa?: string;
}

export interface Credentials {
    user: UserRole;
    token: string;
}

export async function mockCredential(options: Options): Promise<Credentials> {
    if (__ENV.NODE_ENV === "production") throw new Error("ENV is set on production");
    const tfa = options.tfa !== undefined ? options.tfa : TFA_HOLD;

    // remove previous test user
    await UserModel().table().where("username", options.username).delete();

    const ROLE: Role = await RoleModel().table().where("slug", options.role).first();

    // create a new mock user
    const [ID] = await UserModel().table().returning("id").insert({
        role_id: ROLE.id,
        username: options.username,
        password: await SecurityUtil().hash("123456"),
        email: SecurityUtil().randomString(8) + "@gmail.com",
    });

    // get the full details
    const user: UserRole = await UserRepository.byId(ID);

    // generate a new token
    const token: string = await AuthenticationTokenService.token(user, tfa);

    return {
        user,
        token,
    };
}