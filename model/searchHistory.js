
const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        select: false,
    },
    from: { type: String, required: true },
    to: { type: String, required: true },
    fromCoords: { type: [Number], required: true },
    toCoords: { type: [Number], required: true },
    fromPlaceId: { type: String, required: true },
    toPlaceId: { type: String, required: true },
    date: { type: Date, required: false },
    seats: { type: Number, required: true }
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

module.exports = mongoose.model('SearchHistory', searchHistorySchema, "searchHistory");