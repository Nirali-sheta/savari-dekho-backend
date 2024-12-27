const mongoose = require('mongoose');
const { RIDE_STATUS_ENUM, PASSENGER_STATUS_ENUM } = require('../enums');


const geoJsonSchema = new mongoose.Schema({
    type: {
        type: String,
        default: 'LineString'
    },
    coordinates: {
        type: [[Number]],
        required: true
    }
});


const rideSchema = new mongoose.Schema({
    publisherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    status: {
        type: String,
        enum: RIDE_STATUS_ENUM,
        required: true
    },


    from: {
        primaryText: { type: String, required: true },
        secondaryText: { type: String, required: true },
        fullName: { type: String, required: true },
        geometry: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        placeId: { type: String, required: true },
    },
    to: {
        primaryText: { type: String, required: true },
        secondaryText: { type: String, required: true },
        fullName: { type: String, required: true },
        geometry: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        placeId: { type: String, required: true },
    },
    waypoints: [
        {
            primaryText: { type: String, required: true },
            secondaryText: { type: String, required: true },
            fullName: { type: String, required: true },
            geometry: {
                lat: { type: Number, required: true },
                lng: { type: Number, required: true },
            },
            placeId: { type: String, required: true },
            price: { type: Number },
        }
    ],


    departureDatetime: { type: Date, required: true },
    totalEmptySeats: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    totalDistance: { type: Number },
    totalDuration: { type: Number },
    locations: geoJsonSchema,
    bounds: { type: Object },
    // polyline: { type: String, required: true },
    startedAt: { type: Date },
    preferences: { type: [String], required: true },
    passengers: {
        type: [
            {
                passengerId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true
                },
                amount: { type: Number, required: true },
                occupiedSeats: { type: Number, required: true },
                // startCoordIndex: { type: Number, required: true },
                // endCoordIndex: { type: Number, required: true },
                // searchId: { type: String, ref: 'SearchHistory', required: true },
                from: {
                    placeId: { type: String },
                    coords: { type: [String] },
                },
                to: {
                    placeId: { type: String },
                    coords: { type: [String] },
                },
                departure: {
                    primaryText: { type: String, required: true },
                    secondaryText: { type: String, required: true },
                    index: { type: Number, required: true }
                },
                destination: {
                    primaryText: { type: String, required: true },
                    secondaryText: { type: String, required: true },
                    index: { type: Number, required: true }

                },
                cancelledAt: { type: Date },
                status: { type: String, enum: PASSENGER_STATUS_ENUM, required: true },
                otp: { type: Number }
            }
        ],
        default: [],
    },
}, { timestamps: true, versionKey: false });

rideSchema.index({ locations: '2dsphere' });

module.exports = mongoose.model('Ride', rideSchema, 'rides');