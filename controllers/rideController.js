const { Ride, User, Transaction } = require('../model');
const Joi = require('joi');
const { ResponseHandler, sendOtpToMobileNumber } = require('../services');
const { decode } = require('@googlemaps/polyline-codec');
const { default: mongoose } = require('mongoose');
const { generateOtp, EmailSender } = require('../utils');
const { STANDARD_COMMISSION, CANCEL_BOOKING_COMMISSION, CANCEL_RIDE_PENALTY_BEFORE_48_HR,
  CANCEL_RIDE_PENALTY_WITHIN_48_HR, CANCEL_RIDE_PENALTY_WITHIN_24_HR, LINKS } = require('../config');
const Email = new EmailSender();


// ================================= Publish A Ride =================================
const publishRide = async (req, res) => {
  const Res = new ResponseHandler(res);
  const schema = Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
    waypoints: Joi.string(),
    departureDatetime: Joi.date().required(),
    totalEmptySeats: Joi.number().required(),
    totalPrice: Joi.number().required(),
    totalDistance: Joi.number().required(),
    totalDuration: Joi.number(),
    bounds: Joi.string().required(),
    polyline: Joi.string().required(),
    vehicleId: Joi.string().required(),
    preferences: Joi.string().required(),
  }).unknown(true);

  const { error, value } = schema.validate(req.body);
  if (error) return Res.badRequest(error.details[0].message);
  try {
    value.preferences = JSON.parse(value.preferences);
    value.from = JSON.parse(value.from);
    value.to = JSON.parse(value.to);
    if (value.waypoints && value.waypoints.length > 0) {
      value.waypoints = JSON.parse(value.waypoints);
    }
    value.bounds = JSON.parse(value.bounds);
  } catch (error) {
    console.error(error.message);
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return Res.notFound("User not found");
    }

    if (!user.vehicles || user.vehicles.length === 0) {
      return Res.badRequest("You need to add at least one vehicle before publishing a ride.");
    }

    const vehicle = user.vehicles.find(v => v._id.toString() === value.vehicleId);

    if (!vehicle) {
      return Res.notFound("Vehicle not found");
    }

    // Extract Coordinates from Polyline
    const locations = decode(value.polyline).map(([lat, lng]) => ([lng, lat]));

    const ride = new Ride({
      publisherId: user._id,
      vehicleId: vehicle._id,
      status: "published",
      locations: { coordinates: locations },
      ...value,
    });

    await ride.save();
    return Res.saveSuccess("Ride published successfully");

  } catch (error) {
    return Res.serverError(error.message);
  }
};

// ================================= Fetch Ride By ID =================================
const fetchRideById = async (req, res) => {
  const Res = new ResponseHandler(res);

  if (!req.params.rideId) return Res.badRequest("ride id not specified");
  try {
    // const rides = await Ride.aggregate([
    //   /* Publisher Data Conversion Start */
    //   {
    //     $lookup: {
    //       from: 'users',
    //       localField: 'publisherId',
    //       foreignField: '_id',
    //       as: 'publisherDetails',
    //     },
    //   },
    //   {
    //     $unwind: '$publisherDetails',
    //   },
    //   {
    //     $addFields: {
    //       publisher: {
    //         _id: "$publisherDetails._id",
    //         firstName: "$publisherDetails.firstName",
    //         lastName: "$publisherDetails.lastName",
    //         profilePicture: "$publisherDetails.profilePicture",
    //       },
    //     }
    //   },
    //   /* Publisher Data Conversion End */

    //   /* Passengers Data Conversion Start */
    //   {
    //     $lookup: {
    //       from: 'users',
    //       localField: 'passengers.passengerId',
    //       foreignField: '_id',
    //       as: 'passengerDetails',
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: '$passengerDetails',
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       details: {
    //         $mergeObjects: '$$ROOT',
    //       },
    //       passengers: { $push: "$passengerDetails" },
    //     }
    //   },
    //   // {
    //   //   $addFields: {
    //   //     passengers: {
    //   //       $map: {
    //   //         input: "$passengers",
    //   //         as: "passenger",
    //   //         in: {
    //   //           // firstName: "$passengerDetails.firstName",
    //   //           // lastName: "$passengerDetails.lastName",
    //   //           // profilePicture: "$passengerDetails.profilePicture",

    //   //           passengerId: "$$passenger.passengerId",
    //   //           amount: "$$passenger.amount",
    //   //           occupiedSeats: "$$passenger.occupiedSeats",
    //   //           from: "$$passenger.from",
    //   //           to: "$$passenger.to",
    //   //           departure: "$$passenger.departure",
    //   //           destination: "$$passenger.destination",
    //   //           status: "$$passenger.status",
    //   //         },
    //   //       },
    //   //     },
    //   //   },
    //   // },
    //   // /* Passengers Data Conversion End */
    //   // {
    //   //   $project: {
    //   //     publisherDetails: 0,
    //   //     // passengerDetails: 0,
    //   //   },
    //   // },
    // ]);


    const ride = await Ride.findById(req.params.rideId)
      .populate("publisherId passengers.passengerId", "firstName lastName profilePicture", "User")
      .populate("vehicleId", "brand model color.name color.value", "Vehicle");
    if (!ride) return Res.notFound('Ride not found');

    // Server Level Mapping
    const finalRide = ride.toJSON();
    finalRide.publisher = { ...finalRide.publisherId };
    delete finalRide.publisherId;
    finalRide.vehicle = { ...finalRide.vehicleId };
    delete finalRide.vehicleId;
    finalRide.passengers = finalRide.passengers.map(p => ({ ...p, ...p.passengerId, passengerId: p.passengerId._id, _id: undefined }));


    // Return Ride
    return Res.sendPayload(finalRide);
  }
  catch (error) {
    return Res.serverError(error.message);
  }
}

// ================================= Fetch Rides By Passenger ID =================================
const fetchRidesByPassengerId = async (req, res) => {
  const Res = new ResponseHandler(res);
  try {
    const rides = await Ride.aggregate([
      // Matching
      {
        $match: { "passengers.passengerId": new mongoose.Types.ObjectId(req.userId) }
      },
      // Sorting by createdAt in descending order
      {
        $sort: { createdAt: -1 }
      },
      // Publisher Destructuring
      {
        $lookup: {
          from: 'users',
          localField: 'publisherId',
          foreignField: '_id',
          as: 'publisher'
        }
      },
      {
        $unwind: {
          path: '$publisher',
          preserveNullAndEmptyArrays: true
        }
      },
      // Filtering and Mapping
      {
        $project: {
          departureDatetime: "$departureDatetime",
          driverDeparture: "$from",
          driverDestination: {
            $let: {
              vars: {
                index: { $subtract: [{ $size: "$locations.coordinates" }, 1] }
              },
              in: {
                primaryText: "$to.primaryText",
                secondaryText: "$to.secondaryText",
                index: "$$index"
              }
            }
          },
          passenger: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: '$passengers',
                      as: 'passenger',
                      cond: { $eq: ['$$passenger.passengerId', new mongoose.Types.ObjectId(req.userId)] }
                    }
                  },
                  as: 'filteredPassenger',
                  in: {
                    passengerId: '$$filteredPassenger.passengerId',
                    amount: '$$filteredPassenger.amount',
                    occupiedSeats: '$$filteredPassenger.occupiedSeats',
                    status: '$$filteredPassenger.status',
                    departure: '$$filteredPassenger.departure',
                    destination: '$$filteredPassenger.destination',
                    from: '$$filteredPassenger.from',
                    to: '$$filteredPassenger.to',
                  }
                },
              },
              0
            ],
          },
          publisher: {
            _id: '$publisher._id',
            firstName: '$publisher.firstName',
            lastName: '$publisher.lastName',
            profilePicture: '$publisher.profilePicture',
          },
        }
      },
    ]);

    const formattedRides = rides.map(ride => {
      ride = { ...ride, ...ride.passenger };
      delete ride.passenger;
      return ride;
    })

    return Res.sendPayload(formattedRides);
  } catch (error) {
    return Res.serverError(error.message);
  }
}

// ================================= Fetch Rides by Publisher ID =================================
const fetchRidesByPublisherId = async (req, res) => {
  const Res = new ResponseHandler(res);
  try {
    const rides = await Ride.find({ publisherId: req.userId })
      .populate("passengers.passengerId", "firstName profilePicture", "User")
      .sort({ createdAt: -1 });

    const formattedRides = rides.map(ride => ({
      ...ride.toObject(),
      passengers: ride.passengers.map(passenger => ({
        ...passenger.passengerId.toObject(),
        ...passenger.toObject(),
        passengerId: passenger.passengerId._id,
      })),
    }));

    return Res.sendPayload(formattedRides);
  }
  catch (error) {
    return Res.serverError(error.message);
  }
}

// ================================= Update Ride By ID =================================
const updateRideById = async (req, res) => {
  const Res = new ResponseHandler(res);
  const schema = Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
    waypoints: Joi.string(),
    departureDatetime: Joi.date().required(),
    totalEmptySeats: Joi.number().required(),
    totalPrice: Joi.number().required(),
    totalDistance: Joi.number(),
    totalDuration: Joi.number(),
    bounds: Joi.string().required(),
    polyline: Joi.string(),
    // legs: Joi.array().items(Joi.object()),
    vehicleId: Joi.string().required(),
    // passengers: Joi.string().required(),
    preferences: Joi.string(),
  }).unknown(true);

  if (!req.params.rideId) return Res.badRequest("ride id not specified");

  const { error, value } = schema.validate(req.body);
  if (error) return Res.badRequest(error.details[0].message);

  try {
    value.from = JSON.parse(value.from);
    value.to = JSON.parse(value.to);
    if (value.waypoints && value.waypoints.length > 0) {
      value.waypoints = JSON.parse(value.waypoints);
    } else {
      value.waypoints = [];
    }
    if (value.preferences) {
      value.preferences = JSON.parse(value.preferences);
    }
    value.bounds = JSON.parse(value.bounds);
  } catch (error) {
    console.error(error.message);
  }


  const user = await User.findById(req.userId);
  if (!user) {
    return Res.notFound("User not found");
  }

  //check if Ride exist or not 
  const ride = await Ride.findById(req.params.rideId);
  if (!ride) return Res.notFound('Ride not found');

  if (ride.publisherId.toString() !== req.userId)
    return Res.unAuthorized();

  try {
    for (const [key, val] of Object.entries(value)) {
      if (key === "polyline") {
        // Extract Coordinates from Polyline
        ride.locations.coordinates = decode(val).map(([lat, lng]) => ([lng, lat]));
      }
      ride[key] = val;
    }
    await ride.save();
    return Res.saveSuccess('Ride updated successfully');
  }
  catch (error) {
    return Res.badRequest('An error occur while updating ride: ' + error.message)
  }
}

// ================================= Delete Ride By ID =================================
const deleteRideById = async (req, res) => {
  const Res = new ResponseHandler(res);
  try {
    if (!req.params.rideId) return Res.badRequest("Ride Id not specified");
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return Res.notFound('Ride not found');

    if (ride.publisherId.toString() !== req.userId)
      return Res.unAuthorized();

    const user = await User.findById(req.userId);
    if (!user) return Res.notFound("Publisher not found!");

    user.publishedRide = user.publishedRide.filter(rideId => rideId.toString() !== ride._id.toString());
    await ride.deleteOne();
    await user.save();
    Res.saveSuccess("Ride deleted successfully");
  }
  catch (error) {
    Res.serverError("Failed to delete ride")
  }
}





// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ RIDE REQUESTS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~






// ================================= Request A Ride =================================
const requestRide = async (req, res) => {
  const schema = Joi.object({
    occupiedSeats: Joi.number().required(),
    from: Joi.string().optional(),
    to: Joi.string().optional(),
    departure: Joi.string().required(),
    destination: Joi.string().required(),
    amount: Joi.number().required()
  })
  const Res = new ResponseHandler(res);

  const { value, error } = schema.validate(req.body);
  if (error) return Res.badRequest(error.message);

  const passenger = {
    passengerId: req.userId,
    occupiedSeats: value.occupiedSeats,
    status: "requested",
    amount: value.amount
  }
  if (value.from) { passenger.from = JSON.parse(value.from); }
  if (value.to) { passenger.to = JSON.parse(value.to); }
  passenger.departure = JSON.parse(value.departure);
  passenger.destination = JSON.parse(value.destination);

  if (!req.params.rideId) return Res.badRequest("Ride Id not specified");

  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) return Res.notFound("Ride not found");
    if (ride.status !== "published") return Res.badRequest("The ride you requested is not available");

    if (passenger.passengerId === ride.publisherId.toString()) return Res.badRequest("You cannnot request for your own ride");

    // Check if passenger already requested or not
    const hasPassengerRequested = ride.passengers.some((p) => p.passengerId.toString() === passenger.passengerId);
    if (hasPassengerRequested) return Res.badRequest("You cannot request twice for the same ride");

    // const coords = ride.locations.coordinates.slice(passenger.departure.index, passenger.destination.index + 1);
    // const distanceInKm = calculateTotalDistance(coords);
    // const pricePerSeat = Math.ceil(getPriceFromDistance(distanceInKm) * distanceInKm / 10) * 10;
    // const totalPrice = pricePerSeat * passenger.occupiedSeats;


    const availableSeats = ride.passengers.reduce((availSeats, extPassenger) =>
      extPassenger.status === "confirmed" && (
        (extPassenger.departure.index >= passenger.departure.index && extPassenger.departure.index <= passenger.destination.index) ||
        (extPassenger.destination.index >= passenger.departure.index && extPassenger.destination.index <= passenger.destination.index)
      ) ? availSeats - extPassenger.occupiedSeats : availSeats
      , ride.totalEmptySeats);
    // Make sure requested number of seats are available
    if (availableSeats < passenger.occupiedSeats) return Res.badRequest("Not enough seats available");

    // Push passenger into ride.passengers
    ride.passengers.push(passenger);
    // Save the Ride
    await ride.save();

    // Send email to passenger
    const publisherInfo = await User.findById(ride.publisherId);
    const passengerInfo = await User.findById(req.userId);
    const fromText = ride.passengers.find(p => p.departure.primaryText)?.departure.primaryText;
    const toText = ride.passengers.find(p => p.destination.primaryText)?.destination.primaryText;

    Email.sendBookingAckToPassenger({
      passengerName: passengerInfo.firstName,
      publisherName: publisherInfo.firstName,
      fromText: fromText,
      toText: toText,
      seats: passenger.occupiedSeats,
      price: passenger.amount,
      email: passengerInfo.email
    })


    // Send email to driver
    Email.sendNewPassengerRequestToDriver({
      passengerName: passengerInfo.firstName,
      publisherName: publisherInfo.firstName,
      publisherEmail: publisherInfo.email,
      rideDetailsLink: LINKS.RIDE_DETAILS.replace(":rideId", ride.id),
    })
    return Res.success('Ride requested successfully, please wait until the driver confirms your ride.');
  }
  catch (error) {
    return Res.badRequest(error.message);
  }
}

// ================================= Fetch Passenger Requests =================================
const fetchPassengerRequests = async (req, res) => {
  const Res = new ResponseHandler(res);
  try {
    if (!req.params.rideId) return Res.badRequest("Ride Id not specified");

    const ride = await Ride.findById(req.params.rideId);

    if (!ride) return Res.notFound('Ride not found')
    if (ride.publisherId.toString() !== req.userId) return Res.unAuthorized("You have not published this ride!");

    // const passengers=ride.passengers.filter(passenger=>passenger.status==="requested");
    return Res.sendPayload(ride.passengers);
  } catch (error) {
    return Res.badRequest(error)
  }
}

// ================================= Update Passenger Requests =================================
const updatePassengerRequests = async (req, res) => {
  const Res = new ResponseHandler(res);

  // Validations
  const schema = Joi.object({
    passengerId: Joi.string().required(),
    isApproved: Joi.boolean().required(),
  })
  const { value, error } = schema.validate(req.body);
  if (error) return Res.badRequest(error.message);

  try {

    if (!req.params.rideId) return Res.badRequest("Ride Id not found");
    // Find Ride
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return Res.notFound('Ride not found')
    if (ride.publisherId.toString() !== req.userId) return Res.unAuthorized("You have not published this ride!");

    // Find Passenger 
    const pIndex = ride.passengers.findIndex((passenger) => passenger.passengerId.toString() === value.passengerId);
    if (pIndex === -1) return Res.notFound("Passenger with the given id doesn't exist")

    // Update Status
    const passengerInfo = await User.findById(value.passengerId);
    const publisherInfo = await User.findById(ride.publisherId);
    const passenger = ride.passengers.find((p) => p.passengerId.toString() === value.passengerId.toString());
    if (value.isApproved) {
      ride.passengers[pIndex].status = "booked";

      // Send success email to passengers
      Email.sendApprovedAckToPassenger({
        passengerName: passengerInfo.firstName,
        publisherName: publisherInfo.firstName,
        price: passenger.amount,
        paymentLink: LINKS.RIDE_DETAILS.replace(":rideId", ride.id),
        email: passengerInfo.email
      })
    } else {
      ride.passengers = ride.passengers.filter((passenger, index) => index !== pIndex);
      Email.sendRejectedAckToPassenger({
        passengerName: passengerInfo.firstName,
        publisherName: publisherInfo.firstName,
        price: passenger.amount,
        email: passengerInfo.email,
        searchRidesLink: LINKS.SEARCH_RIDES,
      })
    }
    await ride.save();


    /* Send email to Corresponding passenger */
    // User.findById(value.passengerId).select("email").then((user) => {
    //   if (!user) return;
    //   const email = user.email;
    //   // Add Email sending logic here
    //   Emai
    // });

    return Res.success("Successfully updated passenger status");
  } catch (error) {
    return Res.serverError(error.message);
  }
}

// ================================= Confirm Ride Request=================================
const confirmRideRequest = async (req, res) => {
  const Res = new ResponseHandler(res);
  const Email = new EmailSender();
  if (!req.params.rideId) return Res.badRequest("Ride Id not specified");
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return Res.notFound('Ride not found');

    const passenger = ride.passengers.find(p => p.passengerId.toString() === req.userId && p.status === "booked");
    if (!passenger) return Res.notFound("Passenger with the given ID doesnt't exist");

    const user = await User.findById(passenger.passengerId)
    if (user.balance < passenger.amount) return Res.badRequest("Balance not sufficient. Please add enough funds to your wallet.");

    user.balance -= passenger.amount;
    passenger.status = "confirmed";
    await user.save();
    const transaction = new Transaction({
      userId: req.userId,
      amount: passenger.amount,
      type: 'debit',
      status: 'completed',
      description: 'Ride booking'
    })
    await transaction.save();
    await ride.save();

    //Send email to passenger
    const publisherInfo = await User.findById(ride.publisherId);
    const passengerInfo = await User.findById(req.userId);
    const fromText = ride.passengers.find(p => p.departure.primaryText)?.departure.primaryText;
    const toText = ride.passengers.find(p => p.destination.primaryText)?.destination.primaryText;

    Email.sendConfirmedAckToPassenger({
      passengerName: passengerInfo.firstName,
      passengerEmail: passengerInfo.email,
      publisherName: publisherInfo.firstName,
      publisherEmail: publisherInfo.email,
      publisherMobileNumber: publisherInfo.mobileNumber,
      fromText: fromText,
      toText: toText,
      price: passenger.amount,
      viewRideLink: LINKS.RIDE_DETAILS.replace(":rideId", ride.id),
    })
    // Send email to driver

    Email.sendPassengerConfirmationToDriver({
      passengerName: passengerInfo.firstName,
      publisherName: publisherInfo.firstName,
      publisherEmail: publisherInfo.email,
      rideDetailsLink: LINKS.RIDE_DETAILS.replace(":rideId", ride.id),
      price: passenger.amount,
    })
    return Res.success("Your Ride confirmed successfully");

  } catch (error) {
    return Res.serverError(error.message);
  }
}

// ================================= Start Whole Ride =================================
const startRide = async (req, res) => {
  const Res = new ResponseHandler(res);
  if (!req.params.rideId) return Res.badRequest("Ride Id not specified");
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return Res.notFound('Ride not found');
    if (ride.publisherId.toString() !== req.userId) return Res.badRequest("You cannot start this ride");
    if (ride.status !== "published") return Res.badRequest("Ride is not published");
    const passenger = ride.passengers.filter((p) => p.status == "requested" || p.status == "booked");
    passenger.forEach((p) => p.status = "rejected");


    ride.startedAt = new Date();
    ride.status = "started";
    await ride.save();

    const publisherInfo = await User.findById(ride.publisherId);
    // Send Email to all passenger
    ride.passengers.forEach(async (p) => {
      const passengerInfo = await User.findById(p.passengerId);


      Email.sendWholeRideStartAckToPassenger({
        passengerName: passengerInfo.firstName,
        passengerEmail: passengerInfo.email,
        publisherName: publisherInfo.firstName,
        viewRideLink: LINKS.RIDE_DETAILS.replace(":rideId", ride.id),
      })
    });

    // Send email to driver
    Email.sendWholeRideStartAckToDriver({
      publisherName: publisherInfo.firstName,
      publisherEmail: publisherInfo.email,
    })
    return Res.success("Ride has started successfully");
  } catch (error) {
    return Res.serverError(error.message);
  }
}

// ================================= Send OTP To Passenger =================================
const sendOtpToPassenger = async (req, res) => {
  const Res = new ResponseHandler(res);
  const schema = Joi.object({
    passengerId: Joi.string().required(),
  })
  const { error, value } = schema.validate(req.body);
  if (error) return Res.badRequest(error.message);
  if (!req.params.rideId) return Res.badRequest("Ride id not specified");
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return Res.notFound("Ride not found");

    if (ride.publisherId.toString() !== req.userId) return Res.unAuthorized("You cannot send OTP to passenger");


    const passenger = ride.passengers.find((p) => p.passengerId.toString() === value.passengerId);
    if (!passenger) return Res.notFound("passenger with the given i'd not found");

    if (passenger.status !== "confirmed") return Res.badRequest("Status of passenger is not confirmed");


    //generate and send otp
    const otp = generateOtp(6);
    const user = await User.findById(passenger.passengerId);
    if (user) {
      passenger.otp = otp;
      await sendOtpToMobileNumber(otp, user.mobileNumber);
    }
    await ride.save();
    return Res.success("Otp generated successfully");
  }
  catch (error) {
    return Res.serverError(error.message);
  }

}

// ================================= Start Passenger Ride =================================
const startPassengerRide = async (req, res) => {
  const Res = new ResponseHandler(res);
  const schema = Joi.object({
    passengerId: Joi.string().required(),
    otp: Joi.number().required(),
  })

  const { error, value } = schema.validate(req.body);
  if (error) return Res.badRequest(error.message);
  if (!req.params.rideId) return Res.badRequest("Ride id not specified");
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return Res.notFound("Ride not found");

    if (ride.publisherId.toString() !== req.userId) return Res.unAuthorized("You cannot start passenger ride");
    const passenger = ride.passengers.find((p) => p.passengerId.toString() === value.passengerId);
    if (!passenger) return Res.notFound("Passenger with the given ID not found");
    if (passenger.status !== "confirmed") return Res.badRequest("Status of passenger is not confirmed");

    if (passenger.otp !== value.otp) return Res.badRequest("Please enter a valid otp");
    passenger.status = "started";
    await ride.save();

    const publisherInfo = await User.findById(ride.publisherId);
    const passengerInfo = await User.findById(value.passengerId);

    // Send email to passenger
    Email.sendRideStartAckToPassenger({
      passengerName: passengerInfo.firstName,
      passengerEmail: passengerInfo.email,
      publisherName: publisherInfo.firstName,
      fromText: passenger.departure.primaryText,
      toText: passenger.destination.primaryText,
      price: passenger.amount,
      viewRideLink: LINKS.RIDE_DETAILS.replace(":rideId", ride.id),
    })
    return Res.success("Passenger's ride has started successfully");
  } catch (error) {
    return Res.serverError(error.message);
  }

}

// ================================= End Passenger Ride =================================
const endPassengerRide = async (req, res) => {
  const Res = new ResponseHandler(res);
  const schema = Joi.object({
    passengerId: Joi.string().required(),
  })
  const { error, value } = schema.validate(req.body);
  if (error) return Res.badRequest(error.message);

  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return Res.notFound("Ride not found");
    if (ride.publisherId.toString() !== req.userId) return Res.unAuthorized();

    const passenger = ride.passengers.find((p) => p.passengerId.toString() === value.passengerId);
    if (!passenger) return Res.notFound("Passenger with the given ID not found");

    if (passenger.status !== "started") return Res.badRequest("Passenger's ride has not started");
    passenger.status = "completed";
    await ride.save();

    const publisherInfo = await User.findById(ride.publisherId);
    const passengerInfo = await User.findById(value.passengerId);
    const fromText = ride.passengers.find(p => p.departure.primaryText)?.departure.primaryText;
    const toText = ride.passengers.find(p => p.destination.primaryText)?.destination.primaryText;
    // Send email to passenger
    Email.sendRideEndAckToPassenger({
      passengerName: passengerInfo.firstName,
      passengerEmail: passengerInfo.email,
      publisherName: publisherInfo.firstName,
      fromText: fromText,
      toText: toText,
      price: passenger.amount,
      viewRideLink: LINKS.RIDE_DETAILS.replace(":rideId", ride.id),
      raiseTicketLink: LINKS.RAISE_TICKET,
    })
    return Res.saveSuccess("Passenger's ride has been completed successfully");

  } catch (error) {
    return Res.serverError(error.message);
  }
}

// ================================= Cancel Booking =================================
const cancelBooking = async (req, res) => {
  const Res = new ResponseHandler(res);
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) Res.notFound('Ride not found');

    const pIndex = ride.passengers.findIndex((passenger) => passenger.passengerId.toString() === req.userId);
    if (pIndex < 0) return Res.notFound("Passenger with the given ID doesn't exist");

    const passenger = ride.passengers[pIndex];

    if (!["confirmed", "booked", "requested"].includes(passenger.status)) {
      return Res.badRequest("You do not have any reservation to cancel");
    }

    if (passenger.status === "confirmed") {
      const hoursLeft = (new Date(ride.departureDatetime) - new Date()) / (60 * 60 * 1000);

      const refundAmount = Math.round(100 - CANCEL_BOOKING_COMMISSION) / 100 * passenger.amount;
      if (hoursLeft > 24) {
        // Refund added to passenger's wallet
        const user = await User.findById(passenger.passengerId);
        user.balance += refundAmount;
        user.save();
        const trasaction = new Transaction({
          userId: user._id,
          amount: refundAmount,
          type: 'credit',
          status: 'completed',
          description: 'Received from booking cancellation'
        })
        trasaction.save();
      }

      // Cancellation Penalty added to platform (admin)
      const penaltyAmount = passenger.amount - refundAmount
      const admin = await User.findOne({ isAdmin: true });
      admin.balance += penaltyAmount;
      admin.save();
      const trasaction = new Transaction({
        userId: admin._id,
        amount: penaltyAmount,
        type: 'credit',
        status: 'completed',
        description: 'Booking cancelled by passenger'
      })
      trasaction.save();

    } else if (passenger.status === "requested" || passenger.status === "booked") {
      ride.passengers = ride.passengers.filter((_, index) => index !== pIndex);
    }
    passenger.cancelledAt = new Date();
    passenger.status = "cancelled";
    await ride.save();
    // Send email to driver
    const publisherInfo = await User.findById(ride.publisherId);
    const passengerInfo = await User.findById(req.userId);
    Email.sendPassengerCancellationToDriver({
      passengerName: passengerInfo.firstName,
      publisherName: publisherInfo.firstName,
      publisherEmail: publisherInfo.email,
      price: passenger.amount,
      rideDetailsLink: LINKS.RIDE_DETAILS.replace(":rideId", ride.id),
    })
    return Res.saveSuccess("Your booking has been cancelled successfully");
  } catch (error) {
    return Res.serverError(error.message)
  }

}

// ================================= Cancel Whole Ride =================================
const cancelRide = async (req, res) => {
  const Res = new ResponseHandler(res);

  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return Res.notFound("Ride not found");

    if (ride.publisherId.toString() !== req.userId) return Res.unAuthorized();
    const passengers = ride.passengers.filter((p) => p.status === "confirmed");

    // 100% amount added to passenger's wallet
    if (passengers.length > 0) {
      const passengerId = passengers.map((p) => p.passengerId);
      const users = await User.find({ _id: { $in: passengerId } });;

      passengers.forEach(async (p) => {
        const passengerAsUser = users.find((user) => user._id.toString() === p.passengerId.toString());
        if (passengerAsUser) {
          passengerAsUser.balance += p.amount;
          await passengerAsUser.save();
          const trasaction = new Transaction({
            userId: p.passengerId,
            amount: p.amount,
            type: 'credit',
            status: 'completed',
            description: 'Ride cancelled by driver'
          })
          await trasaction.save();
        }
      });

      const hoursLeft = (new Date(ride.departureDatetime) - new Date()) / (60 * 60 * 1000);
      const publisher = await User.findById(ride.publisherId);

      var penaltyPercent = 0;
      // 5% of total passengers' amount penalised
      if (hoursLeft > 48) {
        penaltyPercent = CANCEL_RIDE_PENALTY_BEFORE_48_HR;
      }
      // 10% of total passengers' amount penalised
      else if (hoursLeft > 24) {
        penaltyPercent = CANCEL_RIDE_PENALTY_WITHIN_48_HR;
      }
      // if less than 24 hours left, 20% of total passengers' amount penalised
      else {
        penaltyPercent = CANCEL_RIDE_PENALTY_WITHIN_24_HR;
      }

      // Calculate Penalty
      const totalPenalty = passengers.reduce((penalty, p) => (
        penalty + Math.round(p.amount * penaltyPercent / 100)
      ), 0)

      // Debit from Driver
      publisher.balance -= totalPenalty;
      const trasaction = new Transaction({
        userId: publisher._id,
        amount: totalPenalty,
        type: 'debit',
        status: 'completed',
        description: 'Ride cancellation charges'
      })
      await trasaction.save();
      await publisher.save();
    }
    ride.status = "cancelled";
    await ride.save();

    const publisherInfo = await User.findById(ride.publisherId);
    // Send Email to all passenger
    ride.passengers.forEach(async (p) => {
      const passengerInfo = await User.findById(p.passengerId);
      Email.sendWholeRideCancelAckToPassenger({
        passengerName: passengerInfo.firstName,
        passengerEmail: passengerInfo.email,
        publisherName: publisherInfo.firstName,
        viewWalletLink: LINKS.WALLET
      })
    });

    // Send Email to driver
    Email.sendWholeRideCancelAckToDriver({
      publisherName: publisherInfo.firstName,
      publisherEmail: publisherInfo.email,
      penalty: penaltyPercent,
    })
    return Res.saveSuccess("Your ride has been cancelled successfully");
  } catch (error) {
    return Res.badRequest(error.message);
  }
}



// ================================= End Whole Ride =================================
const endRide = async (req, res) => {
  const Res = new ResponseHandler(res);

  if (!req.params.rideId) return Res.badRequest("Ride Id not specified");
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return Res.notFound('Ride not Found');
    if (ride.publisherId.toString() !== req.userId) return Res.badRequest('You cannot end this ride');

    if (ride.status !== 'started') return Res.badRequest('Ride is not started');
    const isAbleToEnd = ride.passengers.every((p) => ["rejected", "cancelled", "completed"].includes(p.status));
    if (!isAbleToEnd) return Res.badRequest('All passenger rides must be completed before ending the ride');

    ride.status = "completed";
    ride.save();





    // Calculate Standard Commission
    const completedPassengers = ride.passengers.filter((p) => p.status === "completed");
    const { adminCrAmt, driverCrAmt } = completedPassengers.reduce(({ adminCrAmt, driverCrAmt }, p) => {
      // Commission credit to Admin
      const adminCommission = Math.round(p.amount * (STANDARD_COMMISSION / 100));
      adminCrAmt += adminCommission;
      driverCrAmt += p.amount - adminCommission;
      return { adminCrAmt, driverCrAmt };
    },
      { adminCrAmt: 0, driverCrAmt: 0 }
    )

    // Credit to Admin
    if (adminCrAmt > 0) {
      const admin = await User.findOne({ isAdmin: true });
      admin.balance += adminCrAmt;
      new Transaction({
        userId: admin._id,
        amount: adminCrAmt,
        type: 'credit',
        status: 'completed',
        description: `${STANDARD_COMMISSION}% commission from driver`
      }).save();
      admin.save();
    }

    // Credit to Driver
    const publisher = await User.findById(req.userId);
    if (driverCrAmt > 0) {
      publisher.balance += driverCrAmt;
      new Transaction({
        userId: publisher._id,
        amount: driverCrAmt,
        type: 'credit',
        status: 'completed',
        description: 'Received from Ride'
      }).save();
    }


    // Calculate Cancelled Booking Commission
    const cancelledPassengers = ride.passengers.filter((p) => p.status === "cancelled");
    const driverCommissionFromCancelledBooking = (100 - CANCEL_BOOKING_COMMISSION);
    const cancellationCommission = cancelledPassengers.reduce((cancellationCommission, p) => {
      const hoursLeft = (new Date(ride.departureDatetime) - new Date(p.cancelledAt)) / (60 * 60 * 1000);
      if (hoursLeft <= 24) {
        cancellationCommission += Math.round(driverCommissionFromCancelledBooking / 100 * p.amount);
      }
      return cancellationCommission
    }, 0)

    // Credit Cancelled Booking Fees to Driver
    if (cancellationCommission > 0) {
      publisher.balance += cancellationCommission;
      new Transaction({
        userId: publisher._id,
        amount: cancellationCommission,
        type: 'credit',
        status: 'completed',
        description: `${driverCommissionFromCancelledBooking}% of amount from cancelled passengers`
      }).save();
      await publisher.save();
    }


    // Send email to driver
    const publisherInfo = await User.findById(ride.publisherId);
    Email.sendWholeRideEndAckToDriver({
      publisherName: publisherInfo.firstName,
      publisherEmail: publisherInfo.email,
      totalCommission: driverCrAmt,
    })
    return Res.saveSuccess("Ride has been completed Successfully")
  } catch (error) {
    return Res.serverError(error.message);
  }
}


module.exports = {
  publishRide,
  fetchRidesByPublisherId,
  fetchRideById,
  updateRideById,
  deleteRideById,
  fetchRidesByPassengerId,
  requestRide,
  fetchPassengerRequests,
  updatePassengerRequests,
  cancelBooking,
  confirmRideRequest,
  cancelRide,
  startRide,
  sendOtpToPassenger,
  startPassengerRide,
  endPassengerRide,
  endRide,
};
