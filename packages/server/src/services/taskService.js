/**
 * @filetaskService Service layer untuk bisnis logic Task
 * @description Mengemas repository dan menangani validasi + transformasi
 */

import TaskRepository from '../repositories/taskRepository.js';

/**
 * @class TaskService
 */
class TaskService {
  /** @type {TaskRepository} */
  #repository;

  /**
   * @param {TaskRepository} repository
   */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * Ambil semua tasks
   * @returns {Promise<Array<{id: string, title: string, description?: string, createdAt: string, updatedAt: string}>>}
   */
  async getAll() {
    return this.#repository.findAll();
  }

  /**
   * Ambil task berdasarkan ID
   * @param {string} id
   * @returns {Promise<{id: string, title: string, description?: string, createdAt: string, updatedAt: string} | null>}
   */
  async getById(id) {
    return this.#repository.findById(id);
  }

  /**
   * Buat task baru dengan validasi
   * @param {{title: string, description?: string}} data
   * @returns {Promise<{id: string, title: string, description?: string, createdAt: string, updatedAt: string}>}
   */
  async create(data) {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    return this.#repository.create(data);
  }

  /**
   * Update task
   * @param {string} id
   * @param {{title?: string, description?: string}} data
   * @returns {Promise<{id: string, title: string, description?: string, createdAt: string, updatedAt: string} | null>}
   */
  async update(id, data) {
    const existing = await this.#repository.findById(id);
    if (!existing) return null;
    return this.#repository.update(id, data);
  }

  /**
   * Hapus task
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return this.#repository.delete(id);
  }
}

export default TaskService;
