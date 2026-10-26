/**
 * @filetaskRoutes Route definitions untuk Task
 */

import { Router } from 'express';
import { validateTaskCreate, validateTaskUpdate } from '../middleware/validate.js';

/**
 * @param {{ taskController: import('../controllers/taskController.js').default }} dependencies
 * @returns {Router}
 */
export function createTaskRoutes(dependencies) {
  const { taskController } = dependencies;
  const router = Router();

  /**
   * GET /api/v1/tasks
   */
  router.get('/', (req, res, next) => taskController.getAll(req, res, next));

  /**
   * GET /api/v1/tasks/:id
   */
  router.get('/:id', (req, res, next) => taskController.getById(req, res, next));

  /**
   * POST /api/v1/tasks
   */
  router.post('/', validateTaskCreate, (req, res, next) => taskController.create(req, res, next));

  /**
   * PUT /api/v1/tasks/:id
   */
  router.put('/:id', validateTaskUpdate, (req, res, next) => taskController.update(req, res, next));

  /**
   * DELETE /api/v1/tasks/:id
   */
  router.delete('/:id', (req, res, next) => taskController.delete(req, res, next));

  return router;
}

export default createTaskRoutes;
