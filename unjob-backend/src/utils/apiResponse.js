// class to standardize api responses

class apiResponse {
  constructor(status, success = true, data = {}, message = "success") {
    this.status = status;
    this.success = success;
    this.data = data;
    this.message = message;
  }
}
export default apiResponse;

//how to use
// res.status(201).json(new apiResponse(201, success=true, {Data}, "message"));
