/**
 * @filetaskRepository Repository untuk operasi CRUD Task
 * @description Membedakan antara data storage (bisa diganti dengan database sesungguhnya)
 */

/** @type {Map<string, { id: string, title: string, description?: string, createdAt: string, updatedAt: string }>} */
const tasks = new Map();

/**
 * @class TaskRepository
 */
class TaskRepository {
  /**
   * Ambil semua tasks
   * @returns {Promise<Array<{id: string, title: string, description?: string, createdAt: string, updatedAt: string}>>}
   */
  async findAll() {
    return Array.from(tasks.values());
  }

  /**
   * Ambil task berdasarkan ID
   * @param {string} id
   * @returns {Promise<{id: string, title: string, description?: string, createdAt: string, updatedAt: string} | null>}
   */
  async findById(id) {
    return tasks.get(id) || null;
  }

  /**
   * Simpan task baru
   * @param {{title: string, description?: string}} data
   * @returns {Promise<{id: string, title: string, description?: string, createdAt: string, updatedAt: string}>}
   */
  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const task = { id, ...data, createdAt: now, updatedAt: now };
    tasks.set(id, task);
    return task;
  }

  /**
   * Update task
   * @param {string} id
   * @param {{title?: string, description?: string}} data
   * @returns {Promise<{id: string, title: string, description?: string, createdAt: string, updatedAt: string} | null>}
   */
  async update(id, data) {
    if (!tasks.has(id)) return null;
    const existing = tasks.get(id);
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    tasks.set(id, updated);
    return updated;
  }

  /**
   * Hapus task
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return tasks.delete(id);
  }
}

export default TaskRepository;
