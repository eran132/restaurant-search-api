import { JWTPayload } from '../../api/middleware/auth.middleware';

declare global {
    namespace Express {
        // Extend Request interface
        interface Request {
            user?: JWTPayload;
        }

        // Add custom response interface
        interface Response {
            // Add custom response methods if needed
            json(body: ErrorResponse | SuccessResponse): Response;
        }

        // Add custom error interface
        interface ErrorResponse {
            error: string;
            details?: string;
        }

        // Add custom success response interface
        interface SuccessResponse<T = unknown> {
            success: boolean;
            data?: T;
            message?: string;
        }

        // Add custom query parameters interface
        interface Query {
            page?: string;
            limit?: string;
            cuisine_type?: string;
            isKosher?: string;
            search?: string;
        }

        // Add custom params interface
        interface Params {
            id?: string;
        }
    }
}

// Export custom types for reuse
export interface CustomRequest extends Express.Request {
    user: JWTPayload;  // Make user required in typed contexts
}

export interface CustomResponse extends Express.Response {
    json(body: Express.ErrorResponse | Express.SuccessResponse): Express.Response;
}

export type ApiErrorResponse = Express.ErrorResponse;
export type ApiSuccessResponse<T = unknown> = Express.SuccessResponse<T>;

// Make this a module
export {};