import { Controller, Get, Put, Body, Param, Query, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE_NAME, UserServiceClient, UpdateUserRequest } from '../proto/user';
import { AuthGuard } from '../guards/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UserController implements OnModuleInit {
    private userService: UserServiceClient;

    constructor(@Inject(USER_SERVICE_NAME) private client: ClientGrpc) { }

    onModuleInit() {
        this.userService = this.client.getService<UserServiceClient>(USER_SERVICE_NAME);
    }

    @Get(':id')
    async getUser(@Param('id') userId: string) {
        const response = await firstValueFrom(this.userService.getUser({ userId }));
        return response.user;
    }

    @Put(':id')
    async updateUser(@Param('id') userId: string, @Body() body: Omit<UpdateUserRequest, 'userId'>) {
        const response = await firstValueFrom(
            this.userService.updateUser({
                userId,
                ...body,
            })
        );
        return response.user;
    }

    @Get()
    async listUsers(@Query('page') page: string = '1', @Query('pageSize') pageSize: string = '10') {
        const response = await firstValueFrom(
            this.userService.listUsers({
                page: parseInt(page, 10),
                pageSize: parseInt(pageSize, 10),
            })
        );
        return {
            users: response.users,
            total: response.total,
        };
    }
}
