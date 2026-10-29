export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

export function notFound(req, _res, next) {
  next(new ApiError(404, `No route for ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Unexpected server error.';
  let details = error.details;
  if (error.name === 'MulterError') {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = error.code === 'LIMIT_FILE_SIZE' ? 'The image is larger than the upload limit.' : 'The image upload could not be completed.';
  }
  if (error.name === 'ValidationError') {
    statusCode = 422;
    message = 'Please check the information you entered.';
    details = Object.values(error.errors).map((item) => ({ field: item.path, message: item.message }));
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists.';
    details = { field: Object.keys(error.keyPattern || {})[0] };
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'The requested identifier is not valid.';
  }
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') message = 'Unexpected server error.';
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) console.error(error);
  res.status(statusCode).json({ error: { message, ...(details ? { details } : {}), ...(process.env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: error.stack } : {}) } });
}
