
const { User, Vehicle } = require('../model');
const { ResponseHandler } = require('../services');
const fs = require('fs');
const Joi = require('joi');
const { APP_PORT } = require('../config');
const { getFileExtension, validateFileExtension } = require('../utils');
const port = process.env.NODE_ENV === 'production' ? '' : `:${APP_PORT}`;


// ================================= Fetch all Vehicles =================================
const fetchVehicles = async (req, res) => {
    const Res = new ResponseHandler(res);
    try {
        const vehicles = await Vehicle.find({ ownerId: req.userId });
        return Res.sendPayload(vehicles);
    } catch (error) {
        return Res.serverError(error.message);
    }
}


// ================================= Fetch Vehicle by ID =================================
const fetchVehicleById = async (req, res) => {
    const Res = new ResponseHandler(res);
    if (!req.params.id) return Res.badRequest("Vehicle ID not specified!");
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return Res.notFound('Vehicle not found');

        if (vehicle.ownerId.toString() !== req.userId) return Res.unAuthorized();

        return Res.sendPayload(vehicle);
    }
    catch (error) {
        return Res.serverError(error.message);
    }
};


// ================================= Update Vehicle by ID =================================
const updateVehicleById = async (req, res) => {
    const Res = new ResponseHandler(res);
    const schema = Joi.object({
        type: Joi.string().valid('Sedan', 'SUV', 'Compact', 'Hatchback', 'Van', 'Convertible', 'Crossover', 'Sports Car', 'Other').required(),
        fuelType: Joi.string().valid("Gasoline/Petrol", "Diesel", "Electric", "Hybrid", "Natural Gas", "Propane", "Other").required(),
        totalSeats: Joi.number().integer().min(1).required(),
        plateNumber: Joi.string().trim().required(),
        rcBook: Joi.string(),
        airBags: Joi.number(),
        hasAc: Joi.boolean().required(),
        color: Joi.string().required(),
        brand: Joi.string().required(),
        model: Joi.string().required(),
        manufactureYear: Joi.number(),
        insurance: Joi.string(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);

    // Check if vehicle exist or not
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return Res.notFound('Vehicle not found');

    if (vehicle.ownerId.toString() !== req.userId) return Res.unAuthorized();

    const KEY_CHANGES = ["brand", "model", "plateNumber"];

    try {
        value.color = JSON.parse(value.color);
        for (const [key, val] of Object.entries(value)) {
            if (KEY_CHANGES.includes(key) && vehicle[key] !== val) {
                vehicle.verificationStatus = "pending";
            }
            vehicle[key] = val;
        }

        await vehicle.save();
        return Res.saveSuccess('Vehicle updated successfully');
    } catch (error) {
        return Res.badRequest('An error occured while updating vehicle');
    }

}


// ================================= Delete Vehicle by ID =================================
const deleteVehicleById = async (req, res) => {
    const Res = new ResponseHandler(res);
    if (!req.params.id) return Res.badRequest("Vehicle ID not specified!");
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return Res.notFound('Vehicle not found');
        if (vehicle.ownerId.toString() !== req.userId) return Res.unAuthorized();

        const user = await User.findById(req.userId);
        if (!user) return Res.notFound("Vehicle owner not found!");

        user.vehicles = user.vehicles.filter(vehicleId => vehicleId.toString() !== vehicle._id.toString());
        await vehicle.deleteOne();
        await user.save();

        //unlink files
        const insuranceFile = `uploads/${req.userId}/insurance_${vehicle._id.toString()}${getFileExtension(vehicle.insurance)}`;
        const rcBookFile = `uploads/${req.userId}/rcBook_${vehicle._id.toString()}${getFileExtension(vehicle.rcBook)}`;

        if (fs.existsSync(insuranceFile) && fs.existsSync(rcBookFile)) {
            fs.unlinkSync(insuranceFile);
            fs.unlinkSync(rcBookFile);
        }
        return Res.saveSuccess("Vehicle deleted successfully")
    }
    catch (error) {
        return Res.serverError(error.message);
    }
};


// ================================= Vehicle Verification Request & Doc upload =================================
const createVehicle = async (req, res) => {
    const schema = Joi.object({
        type: Joi.string().valid('Sedan', 'SUV', 'Compact', 'Hatchback', 'Van', 'Convertible', 'Crossover', 'Sports Car', 'Other').required(),
        fuelType: Joi.string().valid("Gasoline/Petrol", "Diesel", "Electric", "Hybrid", "Natural Gas", "Propane", "Other").required(),
        totalSeats: Joi.number().integer().min(1).required(),
        plateNumber: Joi.string().trim().required(),
        rcBook: Joi.string(),
        airBags: Joi.number(),
        hasAc: Joi.boolean().required(),
        color: Joi.string().required(),
        brand: Joi.string().required(),
        model: Joi.string().required(),
        manufactureYear: Joi.number(),
        insurance: Joi.string(),
    });
    const Res = new ResponseHandler(res);
    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);

    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return Res.notFound('User not found');
        }

        const saveDir = `uploads/${req.userId}`;
        if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
        }
        const existingVehicle = await Vehicle.findOne({ plateNumber: value.plateNumber });
        if (existingVehicle) {
            return Res.badRequest('Vehicle with the same plateNumber already exists.');
        }

        const vehicle = new Vehicle({ ...value, color: JSON.parse(value.color) });

        if (!req.files) return Res.badRequest("Please upload files");

        const rcBookFile = req.files.filter(file => file.fieldname === 'rcBook');
        const insuranceFile = req.files.filter(file => file.fieldname === 'insurance');

        if (!rcBookFile.length || !insuranceFile.length) {
            return Res.badRequest("Both rcBook and insurance are required");
        }
        for (const file of req.files) {

            if ((file.fieldname === 'rcBook' || file.fieldname === 'insurance') &&
                req.files.filter(f => f.fieldname === file.fieldname).length > 1) {
                return Res.badRequest('Only one file is allowed per field');
            }
            if (!validateFileExtension(getFileExtension(file.originalname))) {
                return Res.badRequest('Invalid file extension. Please upload only jpg or png files.');
            }
            const fileName = `${file.fieldname}_${vehicle._id}${getFileExtension(file.originalname)}`;
            const fileUrl = `${req.protocol}://${req.hostname}${port}/${req.userId}/${fileName}`;
            const fileSavePath = `${saveDir}/${fileName}`;

            try {
                fs.writeFileSync(fileSavePath, file.buffer);
                if (file.fieldname === 'rcBook') {
                    vehicle.rcBook = fileUrl;
                } else if (file.fieldname === 'insurance') {
                    vehicle.insurance = fileUrl;
                }
            } catch (error) {
                return Res.badRequest(`An error occurred while saving ${file.fieldname}`, error);
            }
        }
        vehicle.verificationStatus = "pending";
        vehicle.ownerId = user._id;
        await vehicle.save();
        user.vehicles.push(vehicle._id);
        await user.save();
        return Res.success('Files saved successfully');
    } catch (error) {
        // Handle any errors that occur during the process
        console.error(error);
        return Res.badRequest('An error occurred while processing the files');
    }
};


// ================================= Exports =================================
module.exports = {
    createVehicle,
    fetchVehicles,
    fetchVehicleById,
    updateVehicleById,
    deleteVehicleById,
};
