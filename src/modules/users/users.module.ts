import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address])],
  controllers: [UsersController, AddressesController],
  providers: [UsersService, AddressesService],
  exports: [UsersService, AddressesService],
})
export class UsersModule {}
