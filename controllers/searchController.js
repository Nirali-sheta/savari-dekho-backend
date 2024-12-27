const { ResponseHandler, JwtService } = require('../services');
const { SearchHistory, Ride } = require('../model');
const Joi = require('joi');
const { MAX_SEARCH_RECORDS, MAX_SEARCH_DISTANCE_RADIUS } = require('../config');
const { findClosestCoordinate, calculateTotalDistance } = require('../utils');
const reverseGeocode = require('../services/ReverseGeocoder');


// ================================= Search A Ride =================================
const searchRide = async (req, res) => {
    const Res = new ResponseHandler(res);

    // Validations
    const schema = Joi.object({
        from: Joi.string().required(),
        to: Joi.string().required(),
        fromPlaceId: Joi.string().required(),
        toPlaceId: Joi.string().required(),
        date: Joi.date().optional(),
        seats: Joi.number(),
        fromCoords: Joi.string().required(),
        toCoords: Joi.string().required(),
    }).unknown(true);
    const { error, value } = schema.validate(req.query);
    if (error) return Res.badRequest(error.details[0].message);



    // Filter Unknown parameters
    const params = {
        from: value.from,
        to: value.to,
        fromPlaceId: value.fromPlaceId,
        toPlaceId: value.toPlaceId,
        seats: value.seats,
        fromCoords: [],
        toCoords: [],
    };
    try {
        params.fromCoords = JSON.parse(value.fromCoords);
        params.toCoords = JSON.parse(value.toCoords);
    } catch (error) {
        return Res.badRequest(error.message);
    }

    if (value.date) {
        params["date"] = value.date;
        var lowerDateLimit = new Date(value.date.getTime() - (2 * 24 * 60 * 60 * 1000));
        if (lowerDateLimit.getTime() < Date.now()) {
            lowerDateLimit = new Date();
        }
        var higherDateLimit = new Date(value.date.getTime() + (3 * 24 * 60 * 60 * 1000));
    }



    // Auth Middleware
    let authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const { userId } = JwtService.verifyAccessToken(token);
            req.userId = userId;
        } catch (e) { }
    }



    // Parallel Part 1 - Record Search History for Authenticated Users
    if (req.userId) {

        // Delete Older Records
        SearchHistory.find({ userId: req.userId })
            .select('id createdAt')
            .sort({ createdAt: -1 })
            .then((records) => SearchHistory.deleteMany({
                _id: records.slice(MAX_SEARCH_RECORDS - 1)
            })).catch((err) => {
                console.error("Search History:", err.message)
            })


        // Create New Records
        const searchHistory = new SearchHistory({ ...params });
        searchHistory.userId = req.userId;
        await searchHistory.save();
    }


    // Parallel Part 2 - Retrieve Search Results
    try {

        // Filter at Database level - Status, Total Seats, Datetime (T-2 to T+3), Nearby Location
        var rides = await Ride.aggregate([
            {
                // Conditions/Filters
                $match: {
                    status: { $eq: "published" },
                    totalEmptySeats: { $gte: params.seats },
                    departureDatetime: {
                        $gte: lowerDateLimit,
                        $lte: higherDateLimit,
                    },
                    $and: [
                        {
                            'locations.coordinates': {
                                $geoWithin: {
                                    $centerSphere: [params.fromCoords, MAX_SEARCH_DISTANCE_RADIUS / 6378.1]
                                }
                            }
                        },
                        {
                            'locations.coordinates': {
                                $geoWithin: {
                                    $centerSphere: [params.toCoords, MAX_SEARCH_DISTANCE_RADIUS / 6378.1]
                                }
                            }
                        }
                    ]
                },
            },
            {
                $lookup: {
                    from: 'users', // Name of the User collection
                    localField: 'publisherId',
                    foreignField: '_id',
                    as: 'publisherDetails' // Store User in publisherDetails Array
                }
            },
            {
                // Destructure publisherDetails Array to Object
                $unwind: '$publisherDetails',
            },
            {
                $addFields: {
                    availableSeats: "$totalEmptySeats",
                    // Custom Publisher Object
                    publisher: {
                        _id: "$publisherDetails._id",
                        firstName: "$publisherDetails.firstName",
                        lastName: "$publisherDetails.lastName",
                        profilePicture: "$publisherDetails.profilePicture",
                    },
                }
            },
            {
                // Remove Fields
                $project: {
                    publisherDetails: 0,
                    publisherId: 0,
                }
            }
        ]);

        // Filter at Server level - Remove reverse rides, check for passengers' occupied seats
        rides = rides.filter((ride, rideIndex) => {
            const closestFromCoord = findClosestCoordinate(ride.locations.coordinates, params.fromCoords[0], params.fromCoords[1]);
            const closestToCoord = findClosestCoordinate(ride.locations.coordinates, params.toCoords[0], params.toCoords[1]);

            // Check for Reverse Ride Search
            if (closestFromCoord.index > closestToCoord.index) {
                // console.log("Reverse Ride Matched at index:", rideIndex);
                return false;
            }

            // Check for Occupied seats by other Passengers
            ride.passengers.forEach(passenger => {
                if (passenger.status !== "confirmed") return;
                const pStart = passenger.startCoordIndex;
                const pStop = passenger.endCoordIndex;
                if (
                    (pStart >= closestFromCoord.index && pStart <= closestToCoord.index)
                    ||
                    (pStop >= closestFromCoord.index && pStop <= closestToCoord.index)
                ) {
                    ride.availableSeats -= passenger.occupiedSeats;
                }
            })

            ride.departure = {
                distance: closestFromCoord.distance,
                coords: ride.locations.coordinates[closestFromCoord.index],
                coordsIndex: closestFromCoord.index,
            };

            ride.destination = {
                distance: closestToCoord.distance,
                coords: ride.locations.coordinates[closestToCoord.index],
                coordsIndex: closestToCoord.index,
            };

            // Estimate Price
            if (ride.departure.index === 0 && ride.destination.index === ride.locations.coordinates.length - 1) {
                ride.distance = ride.totalDistance;
                ride.pricePerSeat = ride.totalPrice;
            } else {
                const coords = ride.locations.coordinates.slice(ride.departure.coordsIndex, ride.destination.coordsIndex + 1);
                const pricePerKm = ride.totalPrice / ride.totalDistance;
                ride.distance = Math.ceil(calculateTotalDistance(coords));
                ride.pricePerSeat = Math.ceil(ride.distance * pricePerKm / 10) * 10;
            }

            return true;
        })

        // Convert departure and destination coordinates to addresses
        try {
            const geocodePromises = rides.map(ride =>
                Promise.all([reverseGeocode(ride.departure.coords), reverseGeocode(ride.destination.coords)])
                    .then(([departureAddress, destinationAddress]) => {
                        ride.departure = { ...ride.departure, ...departureAddress };
                        ride.destination = { ...ride.destination, ...destinationAddress };
                    })
            );

            // Parellelly convert all the Coordinates into Addresses using API
            await Promise.all(geocodePromises);
        } catch (error) {
            console.error(error.message);
        }

        return Res.sendPayload(rides);
    } catch (error) {
        return Res.serverError(error.message);
    }
}

const fetchSearchHistoryByUserId = async (req, res) => {
    const Res = new ResponseHandler(res)
    try {
        const searchHistory = await SearchHistory.find({ userId: req.userId }).sort({ createdAt: -1 });
        if (!searchHistory) return Res.notFound("Search History not found!");
        return Res.sendPayload(searchHistory);
    } catch (error) {
        return Res.serverError(error.message);
    }
}

module.exports = {
    searchRide,
    fetchSearchHistoryByUserId,
}