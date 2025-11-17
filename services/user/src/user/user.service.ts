import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import {
    GetUserRequest,
    GetUserResponse,
    UpdateUserRequest,
    UpdateUserResponse,
    DeleteUserRequest,
    DeleteUserResponse,
    ListUsersRequest,
    ListUsersResponse,
    User,
    Address,
} from '../proto/user';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(UserProfile)
        private readonly userRepository: Repository<UserProfile>,
    ) { }

    async getUser(request: GetUserRequest): Promise<GetUserResponse> {
        const userProfile = await this.userRepository.findOne({
            where: { id: request.userId },
        });

        if (!userProfile) {
            throw new NotFoundException(`User with ID ${request.userId} not found`);
        }

        return {
            user: this.mapEntityToProto(userProfile),
        };
    }

    async updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse> {
        const userProfile = await this.userRepository.findOne({
            where: { id: request.userId },
        });

        if (!userProfile) {
            throw new NotFoundException(`User with ID ${request.userId} not found`);
        }

        // Update fields
        if (request.name) {
            userProfile.name = request.name;
        }
        if (request.email) {
            userProfile.email = request.email;
        }
        if (request.phone) {
            userProfile.phone = request.phone;
        }
        if (request.address) {
            userProfile.street = request.address.street;
            userProfile.city = request.address.city;
            userProfile.state = request.address.state;
            userProfile.postalCode = request.address.postalCode;
            userProfile.country = request.address.country;
        }

        const updatedProfile = await this.userRepository.save(userProfile);

        return {
            user: this.mapEntityToProto(updatedProfile),
        };
    }

    async deleteUser(request: DeleteUserRequest): Promise<DeleteUserResponse> {
        const result = await this.userRepository.delete(request.userId);

        return {
            success: result.affected > 0,
        };
    }

    async listUsers(request: ListUsersRequest): Promise<ListUsersResponse> {
        const page = request.page || 1;
        const pageSize = request.pageSize || 10;
        const skip = (page - 1) * pageSize;

        const [users, total] = await this.userRepository.findAndCount({
            skip,
            take: pageSize,
            order: {
                createdAt: 'DESC',
            },
        });

        return {
            users: users.map(user => this.mapEntityToProto(user)),
            total,
        };
    }

    private mapEntityToProto(entity: UserProfile): User {
        const address: Address = {
            street: entity.street || '',
            city: entity.city || '',
            state: entity.state || '',
            postalCode: entity.postalCode || '',
            country: entity.country || '',
        };

        return {
            userId: entity.id,
            email: entity.email,
            name: entity.name,
            phone: entity.phone || '',
            address,
            createdAt: entity.createdAt.getTime(),
            updatedAt: entity.updatedAt.getTime(),
        };
    }
}
