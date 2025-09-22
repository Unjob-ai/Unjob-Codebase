//class to standardize api errors
class apiError extends Error {
  constructor(message,status,errors = [],stack = "",) {
    super(message);
    this.status = status;
    this.message = message;
    this.data = null;
    this.errors = errors;
    if (stack) this.stack = stack;
    else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export default apiError;
//how to use
//throw new apiError("message", status);