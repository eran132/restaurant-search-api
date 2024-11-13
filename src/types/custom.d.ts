// Example replacements
import { Request as _Request } from 'express'; // Prefix with underscore if necessary

declare module 'express-serve-static-core' {
  interface Request {
    user: {
      id: string;
      role: string;
    }; // Replace any with specific type
  }
}