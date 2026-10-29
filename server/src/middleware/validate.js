import { validationResult } from 'express-validator';
import { ApiError } from './errors.js';

export function validate(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) return next(new ApiError(422, 'Please check the information you entered.', result.array().map(({ path, msg }) => ({ field: path, message: msg }))));
  next();
}
