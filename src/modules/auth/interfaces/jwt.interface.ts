// src/modules/auth/interfaces/jwt.interface.ts

import {JwtPayload} from "jsonwebtoken";

export interface JwtExtendedPayload extends JwtPayload {
    uid: number;
    tid: number;
    tfa: boolean; // if true continue without validation, false need 2fa validation
}