import AppError from '../utils/AppError.js';

/**
 * Global Error Handling Middleware
 * Catches and formats all errors in the application
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = new AppError('Validation Error', 400, messages);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error = new AppError(`${field} already exists`, 400);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error = new AppError('Resource not found', 404);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired. Please log in again.', 401);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    errors: error.errors || null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
