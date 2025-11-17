import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { RpcException } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

interface GrpcError {
    code: number;
    details: string;
    metadata?: any;
}

@Catch()
export class GrpcExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GrpcExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();
        const correlationId = uuidv4();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let code = 'INTERNAL_ERROR';

        // Handle gRPC errors
        if (exception instanceof RpcException) {
            const error = exception.getError() as GrpcError;
            const grpcCode = error.code || 2;

            const statusMap = this.mapGrpcToHttpStatus(grpcCode);
            status = statusMap.status;
            code = statusMap.code;
            message = error.details || message;
        }
        // Handle HTTP exceptions
        else if (exception.status) {
            status = exception.status;
            message = exception.message || message;
            code = this.getErrorCode(status);
        }
        // Handle other errors
        else if (exception.message) {
            message = exception.message;
        }

        // Log the error
        this.logger.error(
            `[${correlationId}] ${request.method} ${request.url} - ${status} - ${message}`,
            exception.stack
        );

        // Send error response
        response.status(status).json({
            error: {
                code,
                message,
                correlationId,
                timestamp: new Date().toISOString(),
                path: request.url,
            },
        });
    }

    private mapGrpcToHttpStatus(grpcCode: number): { status: number; code: string } {
        const statusMap: Record<number, { status: number; code: string }> = {
            0: { status: HttpStatus.OK, code: 'OK' },
            1: { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'CANCELLED' },
            2: { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'UNKNOWN' },
            3: { status: HttpStatus.BAD_REQUEST, code: 'INVALID_ARGUMENT' },
            4: { status: HttpStatus.GATEWAY_TIMEOUT, code: 'DEADLINE_EXCEEDED' },
            5: { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND' },
            6: { status: HttpStatus.CONFLICT, code: 'ALREADY_EXISTS' },
            7: { status: HttpStatus.FORBIDDEN, code: 'PERMISSION_DENIED' },
            8: { status: HttpStatus.TOO_MANY_REQUESTS, code: 'RESOURCE_EXHAUSTED' },
            9: { status: HttpStatus.BAD_REQUEST, code: 'FAILED_PRECONDITION' },
            10: { status: HttpStatus.CONFLICT, code: 'ABORTED' },
            11: { status: HttpStatus.BAD_REQUEST, code: 'OUT_OF_RANGE' },
            12: { status: HttpStatus.NOT_IMPLEMENTED, code: 'UNIMPLEMENTED' },
            13: { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL' },
            14: { status: HttpStatus.SERVICE_UNAVAILABLE, code: 'UNAVAILABLE' },
            15: { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'DATA_LOSS' },
            16: { status: HttpStatus.UNAUTHORIZED, code: 'UNAUTHENTICATED' },
        };

        return statusMap[grpcCode] || { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'UNKNOWN' };
    }

    private getErrorCode(status: number): string {
        const codeMap: Record<number, string> = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            500: 'INTERNAL_ERROR',
            503: 'SERVICE_UNAVAILABLE',
        };

        return codeMap[status] || 'UNKNOWN_ERROR';
    }
}
