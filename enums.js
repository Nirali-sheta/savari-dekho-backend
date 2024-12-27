const PASSENGER_STATUS_ENUM = ["requested","rejected","booked", "confirmed", "started", "completed", "cancelled"]
const RIDE_STATUS_ENUM = ["published", "started", "completed", "cancelled"]
const BANK_ACC_TYPE_ENUM = ["savings", "current"];
const TRANSACTION_TYPE_ENUM = ['credit', 'debit'];
const TRANSACTION_STATUS_ENUM = ['completed', 'failed', 'pending'];
const RIDER_VERIFICATION_STATUS_ENUM = ["not verified", "pending", "verified"];
const VEHICLE_TYPE_ENUM = ["Sedan", "SUV", "Compact", 'Hatchback', "Van", "Crossover", "Convertible", "Sports Car", "Other"];
const VEHICLE_FUELTYPE_ENUM = ["Gasoline/Petrol", "Diesel", "Electric", "Hybrid", "Natural Gas", "Propane", "Other"];
const VEHICLE_VERIFICATION_STATUS_ENUM = ["not verified", "pending", "verified"];

module.exports = {
    PASSENGER_STATUS_ENUM,
    RIDE_STATUS_ENUM,
    BANK_ACC_TYPE_ENUM,
    TRANSACTION_TYPE_ENUM,
    TRANSACTION_STATUS_ENUM,
    RIDER_VERIFICATION_STATUS_ENUM,
    VEHICLE_TYPE_ENUM,
    VEHICLE_FUELTYPE_ENUM,
    VEHICLE_VERIFICATION_STATUS_ENUM,
}