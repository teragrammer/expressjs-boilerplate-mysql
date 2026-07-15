// src/modules/auth/auth.interface.ts
import {JwtPayload} from "jsonwebtoken";

export interface JwtExtendedPayload extends JwtPayload {
    uid: number;
    tid: number;
    tfa: boolean;
}