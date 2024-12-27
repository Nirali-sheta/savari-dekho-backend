

// Libraries
const Joi = require('joi');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Custom Stuff
const { User, Ride } = require('../model');
const { ResponseHandler, JwtService, removeFile } = require('../services');
const { EmailSender, validateFileExtension, getFileExtension } = require('../utils');
const { APP_PORT, LINKS } = require('../config');
const port = process.env.NODE_ENV === 'production' ? '' : `:${APP_PORT}`;
const Email = new EmailSender();




// ================================= REFRESH TOKEN =================================
const refreshToken = async (req, res) => {
    const Res = new ResponseHandler(res);

    const { error, value } = Joi.object({
        refreshToken: Joi.string().required(),
    }).validate(req.body);

    if (error) return Res.badRequest(error.details[0].message);

    const { refreshToken } = value;
    try {
        const { userId } = JwtService.verifyRefreshToken(refreshToken);

        const user = await User.findById(userId).select("+refreshTokens");
        if (!user) return Res.notFound('No user associated with provided token!');

        // Find the index of the refresh token in the user's array
        const refreshTokenIndex = user.refreshTokens.indexOf(refreshToken);
        if (refreshTokenIndex === -1) return Res.tokenInvalid();

        // Remove the used refresh token from the array
        user.refreshTokens.splice(refreshTokenIndex, 1);

        // Generate a new access token
        const newAccessToken = JwtService.signAccessToken({ userId });
        const newRefreshToken = JwtService.signRefreshToken({ userId });

        // Add the new refresh token to the array
        user.refreshTokens.push(newRefreshToken);

        // Save the user object to reflect the changes
        await user.save();

        // Send the new access token in the response
        return Res.sendTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        if (error.message === 'jwt expired') {
            return Res.tokenExpired();
        } else if (error.message === 'invalid signature') {
            return Res.tokenInvalid();
        }
        return Res.serverError(error.message);
    }
};


// ================================= LOGIN USER =================================
const login = async (req, res) => {
    const Res = new ResponseHandler(res);

    // Validate the request body
    const schema = Joi.object({
        type: Joi.string().valid('email', 'mobileNumber').required(),
        value: Joi.string().required(),
        password: Joi.string().required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);
    const { type, value: identifier, password } = value;
    if (type !== 'email' && type !== 'mobileNumber') return Res.badRequest('Invalid type. Please enter only email or mobileNumber');


    // Generate query
    let query = {};
    switch (type) {
        case 'email':
            query.email = identifier;
            break;
        case 'mobileNumber':
            query.mobileNumber = { $regex: identifier };
            break;
        default:
            return Res.badRequest();
    }


    // Find User and proceed
    try {
        const user = await User.findOne(query).select('+password +refreshTokens');
        if (!user) return Res.badRequest('User not found');


        // If registration is incomplete
        if (!user.isVerified) return Res.unAuthorized("User is not verfied. Please complete the registration process.");


        // Match Password
        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) return Res.badRequest('Invalid password');


        // Remove previously expired tokens
        await user.removeExpiredTokens();


        // Generate and Send Tokens
        const accessToken = JwtService.signAccessToken({ userId: user._id });
        const refreshToken = JwtService.signRefreshToken({ userId: user._id });

        if (!user.refreshTokens) {
            user.refreshTokens = [];
        }
        user.refreshTokens.push(refreshToken);
        await user.save();

        return Res.sendTokens({ accessToken, refreshToken });
    } catch (err) {
        return Res.serverError(err.message);
    }
};


// ================================= REGISTER =================================
const register = async (req, res) => {
    const Res = new ResponseHandler(res);

    // validate the request body
    const schema = Joi.object({
        firstName: Joi.string().min(3).required(),
        lastName: Joi.string().min(3).required(),
        email: Joi.string().email().required(),
        mobileNumber: Joi.string().pattern(/^[0-9-]+$/).required(),
        password: Joi.string().required()
            .min(8).message("The password must have at least 8 characters")
            .pattern(new RegExp('[A-Z]')).message("The password must have at least one uppercase letter")
            .pattern(new RegExp('[0-9]')).message("The password must have at least one numeric character")
            .pattern(new RegExp('^(?=.*[<>!@#$%^&*()_+=-])[a-zA-Z0-9<>!@#$%^&*()_+=-]{3,30}$')).message("The password must contain one of these special characters (!@#$%^&*()_+=-<>)"),
        gender: Joi.string().required(),
        dateOfBirth: Joi.date().raw().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        address: Joi.string().required(),
        zipcode: Joi.string(),
        profilePicture: Joi.any(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);
    if (req.files && req.files.length > 1) return Res.badRequest('Too many files uploaded. Please upload only one file.');



    // Register user
    try {
        const user = await User.findOne({ mobileNumber: value.mobileNumber }).select("+refreshTokens");
        if (user && user.isVerified) return Res.alreadyExist("User is already registered!");

        const otherUser = await User.findOne({ email: value.email });
        if (otherUser) return Res.badRequest('The provided email is already used by other user');


        // Store in user obj
        Object.entries(value).forEach(([k, v]) => user[k] = v);
        user.isVerified = true;


        // Save File if any
        if (req.file) {

            // Validate Extension
            if (!validateFileExtension(getFileExtension(req.file.originalname))) return Res.badRequest('Invalid file extension. Please upload only jpg or png files.')

            const file = req.file;

            // Save the file
            try {
                const saveDir = `uploads/${user.id}`;
                if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);

                const fileName = `profilePicture${getFileExtension(file.originalname)}`;
                const fileUrl = `${req.protocol}://${req.hostname}${port}/${user.id}/${fileName}`;
                const savePath = path.join(saveDir, fileName);
                fs.writeFileSync(savePath, file.buffer);
                req.deleteFile = () => fs.unlink(savePath, (err) => err ? console.log(err.message) : "")
                user.profilePicture = fileUrl;
            } catch (error) {
                console.error(error.message);
                return Res.serverError();
            }
        }

        // Hash the Password
        user.password = bcrypt.hashSync(value.password, 10);

        // Generate and Send Tokens
        const accessToken = JwtService.signAccessToken({ userId: user._id });
        const refreshToken = JwtService.signRefreshToken({ userId: user._id });

        if (!user.refreshTokens) {
            user.refreshTokens = [];
        }
        user.refreshTokens.push(refreshToken);

        // Send Welcome Email
        Email.sendWelcomeEmail({
            userName: user.firstName,
            email: user.email,
            publishRideLink: LINKS.PUBLISH_RIDE,
            searchRideLink: LINKS.SEARCH_RIDES,
        })

        // Update the User Object in MongoDB
        await user.save();

        return Res.sendTokens({ accessToken, refreshToken });
    } catch (error) {
        if (req.file) try { req.deleteFile(); } catch (error) { }
        return Res.serverError(error.message);
    }
};


// ================================= ME =================================
const getUser = async (req, res) => {
    const Res = new ResponseHandler(res);
    try {
        const user = await User.findById(req.userId).select('-__v');
        if (!user) return Res.notFound("User not found!");

        return Res.sendUser(user);
    } catch (error) {
        return Res.serverError(error.message);
    }
}

// ================================= GET USER BY ID =================================
const getUserById = async (req, res) => {
    const Res = new ResponseHandler(res);
    try {
        const user = await User.findById(req.params.userId)
            .select('firstName lastName profilePicture email mobileNumber riderVerificationStatus dateOfBirth createdAt');
        if (!user) return Res.notFound("User not found!");

        const payloadUser = user.toJSON();

        payloadUser.publishedRides = await Ride.count({ publisherId: user._id, status: 'completed' }) || 0;
        payloadUser.travelledRides = (await Ride.find({ 'passengers.passengerId': user._id }))
            .filter(ride => ride.passengers.find(p => p.passengerId.toString() === user.id).status === "completed")
            .length || 0;

        return Res.sendUser(payloadUser);
    } catch (error) {
        return Res.serverError(error.message);
    }
}


// ================================= UPDATE USER =================================
const updateUser = async (req, res) => {
    const Res = new ResponseHandler(res);

    const schema = Joi.object({
        firstName: Joi.string().min(3),
        lastName: Joi.string().min(3),
        email: Joi.string().email(),
        mobileNumber: Joi.string().pattern(/^[0-9-]+$/),
        gender: Joi.string(),
        dateOfBirth: Joi.date().raw(),
        city: Joi.string(),
        state: Joi.string(),
        address: Joi.string(),
        zipcode: Joi.string().optional(),
        profilePicture: Joi.any(),
    })

    const { error, value } = schema.validate(req.body, { allowUnknown: true });
    // Patch
    value.vehicles = undefined;
    if (error) return Res.badRequest(error.details[0].message);

    try {
        const user = await User.findOne({ mobileNumber: value.mobileNumber })
        if (!user) return Res.notFound("User not found!");

        const updatedFields = {};
        Object.entries(value).forEach(([k, v]) => {
            if (v === null || v === undefined || (typeof v == 'string' && v.trim() === "")) return;
            updatedFields[k] = v;
        });

        // If profilePicture needs to be removed
        if (typeof value.profilePicture === 'string' && value.profilePicture === 'delete') {
            try {
                await removeFile(path.join('uploads', req.userId, `profilePicture${getFileExtension(user.profilePicture)}`));
                updatedFields["profilePicture"] = undefined;
            } catch (error) {
                updatedFields["profilePicture"] = undefined;
                console.error(error.message);
            }
        }
        // If there's a new profilePicture
        else if (req.file) {
            const saveDir = `uploads/${req.userId}`;

            if (user.profilePicture) {
                const oldFileName = path.basename(user.profilePicture)
                try { fs.unlinkSync(path.join(saveDir, oldFileName)) } catch (error) { }
            }

            const file = req.file;
            const fileExt = getFileExtension(file.originalname);
            // Validate Extension
            if (!validateFileExtension(fileExt)) {
                return Res.badRequest('Invalid file extension. Please upload only jpg or png files.')
            }

            // Save the file
            try {
                if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);

                const fileName = `profilePicture${fileExt}`;
                const port = process.env.NODE_ENV === 'production' ? "" : `:${APP_PORT}`;
                const fileUrl = `${req.protocol}://${req.hostname}${port}/${req.userId}/${fileName}`;
                const savePath = path.join(saveDir, fileName);
                fs.writeFileSync(savePath, file.buffer);
                req.deleteFile = () => fs.unlink(savePath, (err) => err ? console.log(err.message) : "")
                updatedFields.profilePicture = fileUrl;
            } catch (error) {
                console.error(error.message);
                return Res.serverError();
            }
        }

        // Mapping updated values into user object
        Object.entries(updatedFields).forEach(([k, v]) => {
            if (k === '_id') return;
            user[k] = v;
        });

        await user.save();
        return Res.saveSuccess('User updated successfully');
    }
    catch (error) {
        console.error('Error updating user:', error);
        return Res.serverError()
    }

};


// ================================= FORGOT PASSWORD =================================
const sendResetLink = async (req, res) => {
    const Res = new ResponseHandler(res);

    //validate the request body
    const schema = Joi.object({
        type: Joi.string().valid('email', 'mobileNumber').required(),
        value: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);

    const { type, value: identifier } = value;

    let query = {};
    if (type === 'email') {
        query.email = identifier;
    }
    else if (type === 'mobileNumber') {
        query.mobileNumber = { $regex: identifier };
    }

    try {
        const user = await User.findOne(query);

        if (user) {
            // If registration is incomplete
            if (!user.isVerified) return Res.unAuthorized("User is not verfied. Please complete the registration process.");

            const port = process.env.NODE_ENV === 'production' ? "" : `:${req.connection.remotePort}`;
            // const resetLink = `${req.protocol}://${req.hostname}${port}/reset-password/${user._id}`
            const resetLink = `${req.headers.origin || req.headers.host}/reset-password/${user._id}`
            new EmailSender().sendPasswordResetLink(user, resetLink).then(res => {
                return Res.success("Reset link has been sent to your registered email.");
            }).catch(err => Res.serverError());
        } else {
            return Res.badRequest('User not found');
        }
    } catch (err) {
        return Res.serverError(err.message);
    }
};


// ================================= RESET PASSWORD =================================
const resetPassword = async (req, res) => {
    const Res = new ResponseHandler(res);

    const { error, value } = Joi.object({
        userId: Joi.string().required(),
        password: Joi.string().min(8).required()
    }).validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);

    const { userId, password } = value;
    try {
        const user = await User.findById(userId);
        if (!user) return Res.notFound("User not found!");

        const hashedPassword = bcrypt.hashSync(password, 10);
        user.password = hashedPassword;
        await user.save();
        return Res.success("Your password has been successfully reset.");
    } catch (error) {
        return Res.serverError(error.message);
    }
};





// ================================= Driver Upgrade =================================
const upgradeToDriver = async (req, res) => {
    const Res = new ResponseHandler(res);

    const user = await User.findById(req.userId);

    if (!user) {
        return Res.notFound('User not found');
    }

    const saveDir = `uploads/${req.userId}`;
    if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
    }

    if (!req.files) {
        return Res.badRequest("Please upload files");
    }

    const drivingLicenseFrontFiles = req.files.filter(file => file.fieldname === 'drivingLicenseFront');
    const drivingLicenseBackFiles = req.files.filter(file => file.fieldname === 'drivingLicenseBack');
    const profilePictureFiles = req.files.filter(file => file.fieldname === 'profilePicture');

    if (!drivingLicenseFrontFiles.length || !drivingLicenseBackFiles.length) {
        return Res.badRequest("Both Driving License Front and Back are required");
    }

    // Check if more than one file is uploaded for any field
    if (
        drivingLicenseFrontFiles.length > 1 ||
        drivingLicenseBackFiles.length > 1 ||
        profilePictureFiles.length > 1
    ) {
        return Res.badRequest('Only one file is allowed per field');
    }

    if (!user.profilePicture && profilePictureFiles.length !== 1 || profilePictureFiles.fieldname) {
        return Res.badRequest('A Profile Picture is required');
    }

    // Process each uploaded file
    try {
        for (const file of req.files) {
            if (!validateFileExtension(getFileExtension(file.originalname))) {
                return Res.badRequest('Invalid file extension. Please upload only jpg or png files.');
            }
            if (
                file.fieldname !== 'profilePicture' &&
                file.fieldname !== 'drivingLicenseFront' &&
                file.fieldname !== 'drivingLicenseBack'
            ) {
                return Res.badRequest('Invalid field name');
            }
            const fileName = `${file.fieldname}${getFileExtension(file.originalname)}`;
            const fileUrl = `${req.protocol}://${req.hostname}${port}/${req.userId}/${fileName}`;


            const fileSavePath = `${saveDir}/${fileName}`;

            fs.writeFileSync(fileSavePath, file.buffer);

            // Update the user's fields based on the uploaded files
            if (file.fieldname === 'profilePicture') {
                user.profilePicture = fileUrl;
            } else if (file.fieldname === 'drivingLicenseFront') {
                user.drivingLicenseFront = fileUrl;
            } else if (file.fieldname === 'drivingLicenseBack') {
                user.drivingLicenseBack = fileUrl;
            }
        }
    } catch (error) {
        console.error(error.message);
        return Res.serverError(error.message || "Internal Server Error");
    }

    try {
        user.riderVerificationStatus = 'pending';
        await user.save();
        Res.saveSuccess('Files uploaded successfully');
    } catch (error) {
        for (const file of req.files) {
            const fileName = `${file.fieldname}${getFileExtension(file.originalname)}`;
            const fileSavePath = `${saveDir}/${fileName}`;
            fs.unlinkSync(fileSavePath);
        }
        Res.badRequest(error);
    }
};

// ================================= Driving License Update =================================
const updateDrivingLicense = async (req, res) => {
    const Res = new ResponseHandler(res);
    const validFields = ['drivingLicenseFront', 'drivingLicenseBack'];

    const files = req.files.filter(file => validFields.includes(file.fieldname));
    if (files.length < 1 || files.length > 2) return Res.badRequest('Please upload only driving license front and/or back');

    const user = await User.findById(req.userId);
    if (!user) return Res.notFound('User not found!');
    else if (!user.riderVerificationStatus) return Res.unAuthorized('This action is not permitted');

    try {
        // Cleanup original files before save new ones
        files.forEach(file => {
            const fileName = file.fieldname + getFileExtension(file.originalname);
            const saveDir = `uploads/${req.userId}`;
            if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true })

            if (user[file.fieldname]) {
                const oldFilePath = path.join(saveDir, path.basename(user[file.fieldname]));
                if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
                user[file.fieldname] = undefined;
            }
            fs.writeFileSync(path.join(saveDir, fileName), file.buffer);
            const fileUrl = `${req.protocol}://${req.hostname}${port}/${req.userId}/${fileName}`;
            user[file.fieldname] = fileUrl;
        })
        user.riderVerificationStatus = 'pending';
        await user.save();
        return Res.saveSuccess('Driving License updated successsfully');
    } catch (error) {
        console.error(error.message);
        return Res.serverError(error.message);
    }

}





// ================================= EXPORTS =================================
module.exports = {
    getUser,
    getUserById,
    login,
    register,
    updateUser,
    sendResetLink,
    resetPassword,
    refreshToken,
    upgradeToDriver,
    updateDrivingLicense,
}