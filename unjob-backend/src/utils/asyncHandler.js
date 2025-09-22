// Wraps async route handlers to automatically catch errors
export default function asyncHandler(reqHandler) {
  return (req, res, next) =>
    Promise.resolve(reqHandler(req, res, next)).catch((err) => next(err));
}
