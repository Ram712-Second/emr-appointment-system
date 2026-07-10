/**
 * 404 Not Found Middleware
 * Handles requests to undefined routes
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    data: null
  });
};

export default notFound;
