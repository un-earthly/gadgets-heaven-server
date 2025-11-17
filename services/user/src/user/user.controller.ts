import { Controller } from '@nestjs/common';
import { UserService } from './user.service';
import {
    UserServiceController,
    UserServiceControllerMethods,
    GetUserRequest,
    GetUserResponse,
    UpdateUserRequest,
    UpdateUserResponse,
    DeleteUserRequest,
    DeleteUserResponse,
    ListUsersRequest,
    ListUsersResponse,
} from '../proto/user';

@Controller()
@UserServiceControllerMethods()
export class UserController implements UserServiceController {
    constructor(private readonly userService: UserService) { }

    async getUser(request: GetUserRequest): Promise<GetUserResponse> {
        return this.userService.getUser(request);
    }

    async updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse> {
        return this.userService.updateUser(request);
    }

    async deleteUser(request: DeleteUserRequest): Promise<DeleteUserResponse> {
        return this.userService.deleteUser(request);
    }

    async listUsers(request: ListUsersRequest): Promise<ListUsersResponse> {
        return this.userService.listUsers(request);
    }
}
