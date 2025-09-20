import  apiError  from "../utils/apiError.js"; // Adjust path as needed

 function errorHandler(err, req, res, next) {
  if (err instanceof apiError) {
    console.log(err);
    res.status(err.status).json({
      message: err.message,
      errors: err.errors,
      success: err.success,
      data: err.data,
    });
  } else {
    console.log(err)
    res
      .status(500)
      .json({ message: "unexpected error occur", success: "false" ,err:err});
  }
}

export default errorHandler;