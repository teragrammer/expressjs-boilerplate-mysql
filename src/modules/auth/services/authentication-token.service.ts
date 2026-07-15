// src/services/token.service.ts
import jwt from "jsonwebtoken";
import {__ENV} from "../../../config/environment";
import {AppError} from "../../../common/utils/errors";
import Messages from "../../../common/utils/messages";
import {JwtExtendedPayload} from "../interfaces/jwt.interface";

export class TokenService {
    private readonly secret: string;
    private readonly expiration: number;

    // We inject values with defaults from our environment config to make testing a breeze
    constructor(
        secret: string = __ENV.JWT_SECRET,
        expiration: number = __ENV.JWT_EXPIRATION_DAYS
    ) {
        this.secret = secret;
        this.expiration = expiration;
    }

    /**
     * Generates a signed JSON Web Token using the given payload
     */
    public generateToken(payload: JwtExtendedPayload): string {
        try {
            // Use the injected secret and expiration values
            return jwt.sign(payload, this.secret, {
                expiresIn: this.expiration,
            });
        } catch (error: any) {
            throw new AppError(
                Messages.SERVER_ERROR.message,
                Messages.SERVER_ERROR.code,
                500
            );
        }
    }

    /**
     * Verifies and decodes an incoming JWT string
     * Throws explicit expired or invalid AppErrors for your global error handler to intercept
     */
    public verifyToken(token: string): JwtExtendedPayload {
        try {
            const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload & JwtExtendedPayload;

            return {
                uid: decoded.uid,
                tid: decoded.tid,
                tfa: decoded.tfa,
            };
        } catch (error: any) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AppError(
                    Messages.EXPIRED_AUTH_TOKEN.message,
                    Messages.EXPIRED_AUTH_TOKEN.code,
                    401
                );
            }

            throw new AppError(
                Messages.INVALID_AUTH_TOKEN.message,
                Messages.INVALID_AUTH_TOKEN.code,
                401
            );
        }
    }
}