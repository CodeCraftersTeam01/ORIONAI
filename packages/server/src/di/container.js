/**
 * @filedi Dependency Injection Container
 * @description Menangani inisialisasi dan injeksi dependensi
 */

import config from '../config/index.js';
import TaskRepository from '../repositories/taskRepository.js';
import TaskService from '../services/taskService.js';
import TaskController from '../controllers/taskController.js';

/**
 * @class DIContainer
 */
class DIContainer {
  /** @type {Map<string, any>} */
  #services = new Map();

  /**
   * Daftarkan semua service ke container
   * @returns {{ taskRepository: TaskRepository, taskService: TaskService, taskController: TaskController }}
   */
  register() {
    // Repository
    const taskRepository = new TaskRepository();
    this.#services.set('taskRepository', taskRepository);

    // Service
    const taskService = new TaskService(taskRepository);
    this.#services.set('taskService', taskService);

    // Controller
    const taskController = new TaskController(taskService);
    this.#services.set('taskController', taskController);

    return this.getDependencies();
  }

  /**
   * Ambil service dari container
   * @param {string} name
   * @returns {any}
   */
  get(name) {
    return this.#services.get(name);
  }

  /**
   * Ambil semua dependencies
   * @returns {{ taskRepository: TaskRepository, taskService: TaskService, taskController: TaskController }}
   */
  getDependencies() {
    return {
      taskRepository: this.#services.get('taskRepository'),
      taskService: this.#services.get('taskService'),
      taskController: this.#services.get('taskController'),
    };
  }
}

export default DIContainer;
