/**
 * @fileconfig Konfigurasi aplikasi
 * @description Membaca environment variables dan menyediakan konfigurasi sentral
 */

import dotenv from 'dotenv';
dotenv.config();

/** @type {{ port: number, env: string, nodeEnv: string }} */
const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
};

export default config;
