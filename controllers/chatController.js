const Message = require('../models/Message');

exports.getUserChats = async (req, res) => {
    const userId = req.query.userId;
    const chats = await Message.find({ $or: [{ sender: userId }, { receiver: userId }] });
    res.json(chats);
};

exports.sendMessage = async (req, res) => {
    const { sender, receiver, message } = req.body;
    const newMessage = new Message({ sender, receiver, message });
    await newMessage.save();
    res.json(newMessage);
};