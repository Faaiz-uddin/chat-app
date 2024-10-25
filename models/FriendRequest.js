const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, default: 'pending' },
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FriendRequest', friendRequestSchema);