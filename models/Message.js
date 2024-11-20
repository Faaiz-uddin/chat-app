const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    message: { type: String, required: true }, 
    status: { 
        type: String, 
        enum: ['sent', 'delivered', 'read', 'unread'],
        default: 'sent' 
    },
    timestamp: { type: Date, default: Date.now }, 
    attachments: [{ type: String }] 
});

module.exports = mongoose.model('Message', messageSchema);

