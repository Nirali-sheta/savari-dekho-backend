const { User, Vehicle } = require('../../model');
const { ResponseHandler } = require('../../services');
const fs = require('fs');
const Joi = require('joi');
const path = require('path');
const { EmailSender } = require('../../utils');
const { LINKS } = require('../../config');
const { RIDER_VERIFICATION_STATUS_ENUM, VEHICLE_VERIFICATION_STATUS_ENUM } = require('../../enums');
const Email = new EmailSender();


// ================================= Fetch Users =================================
const fetchUser = async (req, res) => {
  const Res = new ResponseHandler(res);

  User.find({ isAdmin: { $ne: true } }).select('-otp').then(users => {
    return Res.sendUser(users)
  })
    .catch(err => {
      Res.badRequest(err.message)
    })
};


// ================================= Fetch Rider Verification Requests =================================
const fetchDriverRequests = async (req, res) => {
  const Res = new ResponseHandler(res);

  await User.find({ riderVerificationStatus: { $ne: undefined } }).select('-otp').then(users => {
    Res.sendUser(users);
  })
    .catch(err => {
      Res.badRequest(err.message);
    })

}


// ================================= Update Rider Verification Status =================================
const updateDriverRequests = async (req, res) => {
  const Res = new ResponseHandler(res);
  const schema = Joi.object({
    userId: Joi.string().required(),
    status: Joi.string().valid(...RIDER_VERIFICATION_STATUS_ENUM, 'none').required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return Res.badRequest(error.details[0].message);

  const user = await User.findById(value.userId);
  if (!user) return Res.notFound('User not found');
  try {
    if (value.status === "none") {
      const cleanup = (url, userId) => {
        const filePath = `uploads/${userId}/${path.basename(url)}`;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      if (user.drivingLicenseFront) {
        cleanup(user.drivingLicenseFront, user.id);
      }
      if (user.drivingLicenseBack) {
        cleanup(user.drivingLicenseBack, user.id);
      }

      user.riderVerificationStatus = undefined;
      user.drivingLicenseFront = undefined;
      user.drivingLicenseBack = undefined;
    }
    else {
      user.riderVerificationStatus = value.status;
    }
    await user.save();

    // Send Acknowledgement Email
    if (value.status === "verified") {
      Email.documentVerificationComplete({
        driverName: user.firstName,
        driverEmail: user.email,
        driverProfileLink: LINKS.USER_PROFILE,
      })
    } else if (value.status === "not verified") {
      Email.documentVerificationFailed({
        driverName: user.firstName,
        driverEmail: user.email,
        driverProfileLink: LINKS.USER_PROFILE,
      })
    }

    return Res.saveSuccess('Status updated successfully');
  } catch (error) {
    console.error(error.message);
    return Res.badRequest('An error occured while updating status');
  }
}


// ================================= Fetch Vehicle Verification Requests =================================
const fetchVehicleRequests = async (req, res) => {
  const Res = new ResponseHandler(res);
  try {
    const vehicles = await Vehicle.find({});
    return Res.sendPayload(vehicles);
  } catch (error) {
    return Res.serverError(error.message);
  }
}

// ================================= Update Vehicle Verification Status =================================
const updateVehicleRequests = async (req, res) => {
  const Res = new ResponseHandler(res);
  const schema = Joi.object({
    vehicleId: Joi.string().required(),
    status: Joi.string().valid(...VEHICLE_VERIFICATION_STATUS_ENUM).required()
  });
  const { error, value } = schema.validate(req.body);
  if (error) return Res.badRequest(error.details[0].message);

  // Check if vehicle exist or not
  const vehicle = await Vehicle.findById(value.vehicleId).populate("ownerId", "firstName email", "User");
  if (!vehicle) return Res.notFound('Vehicle not found!');

  try {
    vehicle.verificationStatus = value.status;
    await vehicle.save();

    // Send Acknowledgement Email
    if (value.status === "verified") {
      Email.vehicleVerificationComplete({
        vehicleModel: vehicle.model,
        vehicleDetailsLink: LINKS.VEHICLE_DETAILS.replace(":vehicleId", vehicle.id),
        driverName: vehicle.ownerId.firstName,
        driverEmail: vehicle.ownerId.email
      })
    } else if (value.status === "not verified") {
      Email.vehicleVerificationFailed({
        vehicleModel: vehicle.model,
        vehicleDetailsLink: LINKS.VEHICLE_DETAILS.replace(":vehicleId", vehicle.id),
        driverName: vehicle.ownerId.firstName,
        driverEmail: vehicle.ownerId.email
      })
    }

    return Res.saveSuccess('Status updated successfully');
  } catch (error) {
    return Res.badRequest('An error occured while updating status');
  }

}





// ================================= Exports =================================
module.exports = {
  fetchUser,

  // Driver
  fetchDriverRequests,
  updateDriverRequests,

  // Vehicle
  fetchVehicleRequests,
  updateVehicleRequests,
};
