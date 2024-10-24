const Message = require('../models/Message');

exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const message = new Message({
            sender: req.user,
            receiver: receiverId,
            content
        });
        await message.save();
        res.status(201).json({ message: 'Message sent', data: message });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};