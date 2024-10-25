const FriendRequest = require('../models/FriendRequest');

exports.sendFriendRequest = async (req, res) => {
    const { sender, receiver } = req.body;
    const request = new FriendRequest({ sender, receiver });
    await request.save();
    res.json({ message: 'Friend request sent' });
};

exports.getFriendRequests = async (req, res) => {
    const userId = req.query.userId;
    const requests = await FriendRequest.find({ receiver: userId });
    res.json(requests);
};