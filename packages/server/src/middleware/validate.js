/**
 * @filevalidate Validation middleware
 */

export const validateTaskCreate = (req, res, next) => {
  const { title } = req.body;
  if (!title || title.trim().length === 0) {
    const error = new Error('Title is required');
    error.statusCode = 400;
    return next(error);
  }
  next();
};

export const validateTaskUpdate = (req, res, next) => {
  const { title } = req.body;
  if (title !== undefined && title.trim().length === 0) {
    const error = new Error('Title cannot be empty');
    error.statusCode = 400;
    return next(error);
  }
  next();
};
