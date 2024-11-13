import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';
import { _Pool, _QueryResult } from 'pg';
import _pool from '../../db/connection';

interface AdminQuery {
  page?: number;
  limit?: number;
  search?: string;
}

interface AdminRequestBody {
  name?: string;
  role?: string;
  permissions?: string[];
}

interface AdminRequest extends Request {
  params: Record<string, never>;
  query: AdminQuery;
  body: AdminRequestBody;
}

interface _AdminResponse {
  success: boolean;
  data: Record<string, unknown>;
  message?: string;
}

const router = express.Router();

router.use(authMiddleware);
router.use(auditMiddleware);

router.get('/users', async (req: AdminRequest, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const query = `
      SELECT * FROM users
      LIMIT $1 OFFSET $2
    `;
    
    const result = await _pool.query(query, [limit, offset]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

router.post('/users', async (req: AdminRequest, res: Response) => {
  try {
    const { name, role, permissions } = req.body;
    
    const query = `
      INSERT INTO users (name, role, permissions)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await _pool.query(query, [name, role, permissions]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

router.put('/users/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, permissions } = req.body;
    
    const query = `
      UPDATE users
      SET name = $1, role = $2, permissions = $3
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await _pool.query(query, [name, role, permissions, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

router.delete('/users/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await _pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

export default router;