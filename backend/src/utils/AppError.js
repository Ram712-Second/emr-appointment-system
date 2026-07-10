/**
 * Custom Application Error Class
 * Extends the built-in Error class to include status code and operational flag
 */
class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
