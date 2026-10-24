/**
 * Global Error Handling Middleware
 * Sanitized to prevent internal architecture/path disclosure
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Rute '${req.originalUrl}' tidak ditemukan.`,
  });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log full error securely on the server console (not sent to client)
  console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl} -`, err.message);

  // Return clean, safe message without stack trace or infrastructure leakage
  const safeMessage = statusCode === 500
    ? 'Terjadi kendala internal pada server. Silakan coba kembali.'
    : (err.message || 'Permintaan tidak dapat diproses.');

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
};
