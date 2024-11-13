import express, { Request, Response } from 'express';
import { auditMiddleware } from '../middleware/audit.middleware';
import { _Pool, QueryResult } from 'pg'; // Prefix unused Pool with underscore
import _pool from '../../db/connection';

interface RestaurantQuery {
  cuisine?: string;
  isKosher?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  isKosher: boolean;
}

interface RestaurantRequest extends Request {
  query: RestaurantQuery;
}

const router = express.Router();

router.get('/search', auditMiddleware, async (req: RestaurantRequest, res: Response) => {
  const { cuisine, isKosher, page = 1, limit = 10 } = req.query;
  
  try {
    const offset = (Number(page) - 1) * Number(limit);
    const query = `
      SELECT * FROM restaurants 
      WHERE ($1::text IS NULL OR cuisine = $1)
      AND ($2::boolean IS NULL OR is_kosher = $2)
      LIMIT $3 OFFSET $4
    `;
    
    const result: QueryResult<Restaurant> = await _pool.query(query, [
      cuisine || null,
      isKosher || null,
      limit,
      offset
    ]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/other-route', async (_req: RestaurantRequest, _res: Response) => {
  // Implementation left empty since route is not used
});

export default router;