
const { Bank, User } = require('../model');
const { ResponseHandler } = require('../services');
const Joi = require('joi');

// ================================= Add Banks =================================
const addBanks = async (req, res) => {
    const Res = new ResponseHandler(res);

    const schema = Joi.object({
        accountNumber: Joi.number().required(),
        ifsc: Joi.string().required(),
        branchName: Joi.string().required(),
        bankName: Joi.string().required(),
        beneficiaryName: Joi.string().required(),
        description: Joi.string().optional().allow(''),
        accountType: Joi.string().valid("savings", "current")
    });
    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);

    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return Res.notFound("User not found")
        }
        const existingAccountNumber = await Bank.findOne({ accountNumber: value.accountNumber })
        if (existingAccountNumber) {
            return Res.badRequest("Bank account number already exists");
        }
        const bank = new Bank({ ...value })
        bank.accountholderId = user._id;
        await bank.save();
        return Res.saveSuccess('Bank added successfully');
    }
    catch (error) {
        return Res.serverError(error.message);
    }
}

// ================================= Fetch All Banks =================================
const fetchBanks = async (req, res) => {
    const Res = new ResponseHandler(res);
    try {
        const accountholderId = req.userId;
        const bankDetails = await Bank.find({ accountholderId });
        return Res.sendPayload(bankDetails);
    }
    catch (error) {
        return Res.serverError(error.message)
    }
}

// ================================= Fetch Bank By ID =================================
const fetchBankById = async (req, res) => {
    const Res = new ResponseHandler(res);
    if (!req.params.id) return Res.badRequest("Bank id not specified");
    try {
        const bank = await Bank.findById(req.params.id);
        if (!bank) return Res.notFound('Bank not found');

        if (bank.accountholderId.toString() !== req.userId) return Res.unAuthorized();

        return Res.sendPayload(bank);
    }
    catch (error) {
        return Res.serverError(error.message);
    }
}

// ================================= Update Bank By ID =================================
const updateBankById = async (req, res) => {
    const Res = new ResponseHandler(res);
    const schema = Joi.object({
        accountNumber: Joi.number().required(),
        ifsc: Joi.string().required(),
        branchName: Joi.string().required(),
        bankName: Joi.string().required(),
        description: Joi.string().optional().allow(''),
        beneficiaryName: Joi.string().required(),
        accountType: Joi.string().valid("savings", "current")
    });
    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);

    //check if Bank exist or not 
    const bank = await Bank.findById(req.params.id);
    if (!bank) return Res.notFound('Bank not found');
    if (bank.accountholderId.toString() !== req.userId) return Res.unAuthorized();
    if (bank.accountNumber !== value.accountNumber) {
        const otherBank = await Bank.findOne({ accountNumber: value.accountNumber });
        if (otherBank && otherBank.accountholderId !== bank.accountholderId) {
            return Res.unAuthorized("The provided account number is already in use by other bank account");
        }
    }

    try {
        for (const [key, val] of Object.entries(value)) {
            bank[key] = val;
        }
        await bank.save();
        return Res.saveSuccess('Bank details updated successfully');
    }
    catch (error) {
        return Res.badRequest('An error occur while updating bank')
    }
}

// ================================= Delete Bank By ID =================================
const deleteBankById = async (req, res) => {
    const Res = new ResponseHandler(res);
    try {
        const bank = await Bank.findById(req.params.id);
        if (!bank) return Res.notFound('Bank not found');
        if (bank.accountholderId.toString() !== req.userId) return Res.unAuthorized();
        const user = await User.findById(req.userId);
        if (!user) return Res.notFound("Account holder not found!");

        await bank.deleteOne();
        return Res.success("Bank account deleted successfully")
    }
    catch (error) {
        return Res.serverError("Failed to delete bank account")
    }
}

module.exports = {
    addBanks,
    fetchBanks,
    fetchBankById,
    updateBankById,
    deleteBankById
}