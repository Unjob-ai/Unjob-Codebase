import  apiError  from "../utils/apiError.js"; // Adjust path as needed

 function errorHandler(err, req, res, next) {
  if (err instanceof apiError) {
    res.status(err.status).json({
      status: err.status,
      success: "false",
      message: err.message,
      errors: err.errors,
      data: err.data,
    });
  } else {
    res
      .status(500)
      .json({status:500, message: "unexpected error occur", success: "false" ,err:err});
  }
}

export default errorHandler;