import { JWTPayload } from '../../api/middleware/auth.middleware';

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export {};