// src/modules/users/user.service.ts

import {UserRepository} from "./user.repository";
import {CreateUserDTO, User} from "./user.interface";
import {AppError} from "../../common/utils/errors";
import Messages from "../../common/utils/messages";
import {SecurityUtil} from "../../common/utils/security.util";

export class UserService {
    // Dependency injection allows passing a mock repository during testing
    constructor(
        private userRepository = new UserRepository(),
        private readonly securityUtil: SecurityUtil,
    ) {
    }

    /**
     * Resolves a user profile by its unique ID for authentication context mapping.
     */
    async findById(id: number): Promise<any> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new AppError(
                Messages.DATA_NOT_FOUND.message,
                Messages.DATA_NOT_FOUND.code,
                404
            );
        }
        return user;
    }

    /**
     * Handles business logic for creating a user
     */
    async registerUser(data: CreateUserDTO): Promise<User> {
        // Check if email already exists
        if (data.email) {
            const existingEmail = await this.userRepository.findByEmail(data.email);
            if (existingEmail) {
                throw new AppError(
                    "Duplicate email already exists",
                    Messages.DUPLICATE_DATA.code,
                    409
                );
            }
        }

        // Check if phone already exists
        if (data.phone) {
            const existingPhone = await this.userRepository.findByPhone(data.phone);
            if (existingPhone) {
                throw new AppError(
                    "Duplicate phone number already exists",
                    Messages.DUPLICATE_DATA.code,
                    409
                );
            }
        }

        // Create and return the user
        return this.userRepository.create(data);
    }

    async create(data: CreateUserDTO): Promise<User> {
        if (data.password !== null && typeof data.password !== "undefined") {
            data.password = await this.securityUtil.hash(data.password);
        }

        const user: User | null = await this.userRepository.create(data);
        if (!user) throw new AppError(
            Messages.SERVER_ERROR.message,
            Messages.SERVER_ERROR.code,
            500
        );

        return user;
    }
}