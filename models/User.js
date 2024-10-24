const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: false, unique: true },
    password: { type: String, required: false }, 
    googleId: { type: String, unique: true, sparse: true }, 
    name: { type: String },
    email: { type: String, unique: true }, 
    avatar: { type: String },
    profileImage: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);