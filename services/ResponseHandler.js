class ResponseHandler {
    constructor(res) {
        this.res = res;
    }

    sendResponse(statusCode, data) {
        return this.res.status(statusCode).json(data);
    }


    /* ###################### 200s ###################### */
    saveSuccess(message = "User saved Successfully!") {
        return this.sendResponse(200, { type: "success", message });
    }

    sendUser(user = {}) {
        return this.sendResponse(200, { type: "success", payload: user });
    }

    sendTokens(tokens = { accessToken: null, refreshToken: null }) {
        return this.sendResponse(200, { type: 'success', payload: tokens });
    }

    sendPayload(payload = {}) {
        return this.sendResponse(200, { type: 'success', payload });
    }

    success(message = "Success!") {
        return this.sendResponse(200, { type: "success", message });
    }


    /* ###################### 400s ###################### */

    badRequest(message = 'Bad Request. Some fields are not filled!') {
        return this.sendResponse(400, { type: "error", message });
    }
    wrongCredentials(message = 'Username or password is wrong!') {
        return this.sendResponse(401, { type: "error", message });
    }
    unAuthorized(message = 'Unauthorized!') {
        return this.sendResponse(401, { type: "error", message, code: 'UNAUTHORIZED' });
    }
    tokenInvalid(message = 'Invalid Token!') {
        return this.sendResponse(401, { type: "error", message, code: 'AUTH_INVALID' });
    }
    tokenExpired(message = 'Token Expired!') {
        return this.sendResponse(401, { type: "error", message, code: 'AUTH_EXPIRED' });
    }
    notFound(message = '404 Not Found') {
        return this.sendResponse(404, { type: "error", message });
    }
    alreadyExist(message = "User already exists!") {
        return this.sendResponse(409, { type: "error", message });
    }
    otpExpired(message = "OTP Expired!") {
        return this.sendResponse(410, { type: "error", message });
    }

    /* ###################### 500s ###################### */



    serverError(message = 'Internal server error') {
        return this.sendResponse(500, { type: "error", message });
    }
    tableNotFound(message = "Table not found") {
        return this.sendResponse(500, { type: "error", message });
    }
    requestTimeout(message = 'Request timed out') {
        return this.sendResponse(504, { type: "error", message });
    }


}

module.exports = ResponseHandler;
