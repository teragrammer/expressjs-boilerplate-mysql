// src/modules/users/user.service.ts

import {UserRepository} from "./user.repository";
import {CreateUserDTO, User} from "./user.interface";
import {AppError} from "../../common/utils/errors";
import Messages from "../../common/utils/messages";

export class UserService {
    // Dependency injection allows passing a mock repository during testing
    constructor(private userRepo = new UserRepository()) {
    }

    /**
     * Resolves a user profile by its unique ID for authentication context mapping.
     */
    async findById(id: number): Promise<any> {
        const user = await this.userRepo.findById(id);
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
    async createUser(data: CreateUserDTO): Promise<User> {
        // Check if email already exists
        if (data.email) {
            const existingEmail = await this.userRepo.findByEmail(data.email);
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
            const existingPhone = await this.userRepo.findByPhone(data.phone);
            if (existingPhone) {
                throw new AppError(
                    "Duplicate phone number already exists",
                    Messages.DUPLICATE_DATA.code,
                    409
                );
            }
        }

        // Create and return the user
        return this.userRepo.create(data);
    }
}