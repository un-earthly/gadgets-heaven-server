import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserProfile } from '../entities/user-profile.entity';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                url: configService.get<string>('database.url'),
                entities: [UserProfile],
                synchronize: true, // Set to false in production
                logging: false,
            }),
            inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([UserProfile]),
    ],
    exports: [TypeOrmModule],
})
export class DatabaseModule { }
