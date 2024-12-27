const mongoose = require('mongoose');
const { VEHICLE_FUELTYPE_ENUM, VEHICLE_TYPE_ENUM, VEHICLE_VERIFICATION_STATUS_ENUM } = require('../enums');

const vehicleSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: VEHICLE_TYPE_ENUM,
        required: true,
    },
    fuelType: {
        type: String,
        enum: VEHICLE_FUELTYPE_ENUM,
        required: true,
    },
    totalSeats: {
        type: Number,
        required: true,
        min: 1,
    },
    plateNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    airBags: {
        type: Number,
    },
    hasAc: {
        type: Boolean,
        required: true
    },
    color: {
        type: {
            name: { type: String, required: true },
            value: { type: String, required: true },
        },
        required: true,
    },
    brand: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    manufactureYear: {
        type: Number,
    },
    verificationStatus: {
        type: String,
        enum: VEHICLE_VERIFICATION_STATUS_ENUM,
        default: 0,
    },
    rcBook: {
        type: String,
    },
    insurance: {
        type: String,
    },
}, { versionKey: false, timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema, "vehicles");
