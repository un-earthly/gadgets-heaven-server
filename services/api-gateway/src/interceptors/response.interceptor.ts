import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface Response<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp: string;
    path: string;
    requestId: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        const request = context.switchToHttp().getRequest();
        const requestId = uuidv4();

        return next.handle().pipe(
            map((data) => ({
                success: true,
                data,
                message: this.getSuccessMessage(request.method),
                timestamp: new Date().toISOString(),
                path: request.url,
                requestId,
            })),
        );
    }

    private getSuccessMessage(method: string): string {
        const messages: Record<string, string> = {
            GET: 'Data retrieved successfully',
            POST: 'Resource created successfully',
            PUT: 'Resource updated successfully',
            PATCH: 'Resource updated successfully',
            DELETE: 'Resource deleted successfully',
        };

        return messages[method] || 'Request completed successfully';
    }
}
