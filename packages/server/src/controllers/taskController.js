/**
 * @filetaskController Controller untuk HTTP handling Task
 */

/**
 * @class TaskController
 */
class TaskController {
  /** @type {import('../services/taskService.js').default} */
  #service;

  /**
   * @param {import('../services/taskService.js').default} service
   */
  constructor(service) {
    this.#service = service;
  }

  /**
   * GET /api/v1/tasks - ambil semua tasks
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getAll(req, res, next) {
    try {
      const tasks = await this.#service.getAll();
      res.json({ success: true, data: tasks });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/tasks/:id - ambil satu task
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getById(req, res, next) {
    try {
      const task = await this.#service.getById(req.params.id);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      res.json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/tasks - buat task baru
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async create(req, res, next) {
    try {
      const task = await this.#service.create(req.body);
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/tasks/:id - update task
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async update(req, res, next) {
    try {
      const task = await this.#service.update(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      res.json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/tasks/:id - hapus task
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async delete(req, res, next) {
    try {
      const deleted = await this.#service.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default TaskController;
