import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: RedisClientType;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        this.client = createClient({
            socket: {
                host: this.configService.get('redis.host'),
                port: this.configService.get('redis.port'),
            },
        });

        this.client.on('error', (err) => console.error('Redis Client Error', err));
        await this.client.connect();
    }

    async onModuleDestroy() {
        await this.client.quit();
    }

    async get(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (ttl) {
            await this.client.setEx(key, ttl, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async delPattern(pattern: string): Promise<void> {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            await this.client.del(keys);
        }
    }
}
