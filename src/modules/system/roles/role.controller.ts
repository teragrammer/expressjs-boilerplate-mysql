// src/modules/system/roles/role.controller.ts
import {Request, Response} from "express";
import {Messages} from "../../../common/utils/messages";
import catchAsync from "../../../common/utils/catch-async";
import {RoleService} from "./role.service";
import {
    BrowseRoleQuery,
    CreateRoleDTO,
    Role,
    UpdateRoleDTO,
} from "./role.interface";
import {AppError} from "../../../common/utils/errors";

export class RoleController {
    constructor(
        private readonly roleService: RoleService,
    ) {
    }

    create = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const role: Role = await this.roleService.createRole(
            req.sanitize.data as CreateRoleDTO,
        );

        res.status(201).json({id: role.id});
    });

    update = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new AppError(
                Messages.INVALID_PATH_PARAM.message,
                Messages.INVALID_PATH_PARAM.code,
                400,
            );
        }

        const role: Role = await this.roleService.updateRole(
            id,
            req.sanitize.data as UpdateRoleDTO,
        );

        res.status(200).json({id: role.id});
    });

    browse = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const isPublic = req.sanitize.query.numeric("is_public");
        const search = req.sanitize.query.get("search");

        const paginate = req.app.get("paginate");

        const filters: BrowseRoleQuery = {
            page: Math.max(
                1,
                Number(paginate.page ?? 1),
            ),
            perPage: Math.min(
                100,
                Math.max(
                    1,
                    Number(paginate.perPage ?? 20),
                ),
            ),
            ...(isPublic !== null && {
                is_public: isPublic === 1,
            }),
            ...(search !== null && {
                search: search.trim(),
            }),
        };

        const roles: Role[] = await this.roleService.browseRoles(filters);

        res.status(200).json(roles);
    });

    view = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new AppError(
                Messages.INVALID_PATH_PARAM.message,
                Messages.INVALID_PATH_PARAM.code,
                400,
            );
        }

        const role: Role = await this.roleService.findById(id);
        res.status(200).json(role);
    });

    delete = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new AppError(
                Messages.INVALID_PATH_PARAM.message,
                Messages.INVALID_PATH_PARAM.code,
                400,
            );
        }

        await this.roleService.hardDelete(id);

        res.status(200).send();
    });
}
