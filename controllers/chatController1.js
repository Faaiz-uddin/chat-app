const express = require('express');
const mongoose = require('mongoose'); 

const Message = require('../models/Message');
const { sendMessage } = require('../socket/socketManagerBackup');

// Controller for fetching messages between two users
exports.getMessages = async (req, res) => {
    const { userId } = req.params; 
    const loggedInUserId = req.user.id; 
    console.log(`${userId} --- ${loggedInUserId}`);
    
    try {
        const messages = await Message.find({
            $or: [
                { sender: loggedInUserId, receiver: userId },
                { sender: userId, receiver: loggedInUserId }
            ]
        }).sort({ timestamp: 1 }); 

        return res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({ error: 'Failed to fetch messages.' });
    }
};

// Controller for fetching conversations with unread message count for each contact
exports.getConversationsWithUnreadCount = async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    try {
        const conversations = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        })
        .populate('sender', 'username profileImage')
        .populate('receiver', 'username profileImage')
        .sort({ timestamp: -1 });

        const uniqueConversations = {};

        conversations.forEach(msg => {
            if (!msg.sender || !msg.receiver) return;

            const otherUserId = msg.sender._id.equals(userId) ? msg.receiver._id : msg.sender._id;

            if (!uniqueConversations[otherUserId]) {
                uniqueConversations[otherUserId] = {
                    user: msg.sender._id.equals(userId) ? msg.receiver : msg.sender,
                    lastMessage: msg,
                    unreadCount: 0,
                };
            }

            if (String(msg.receiver._id) === String(userId) && msg.status === 'unread') {
                uniqueConversations[otherUserId].unreadCount += 1;
            }
        });

        const conversationsArray = Object.values(uniqueConversations).map(convo => ({
            user: {
                _id: convo.user._id,
                name: convo.user.username,
                image: convo.user.profileImage,
            },
            lastMessage: convo.lastMessage,
            unreadCount: convo.unreadCount,
        }));

        return res.status(200).json(conversationsArray);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        return res.status(500).json({ error: 'Failed to fetch conversations.' });
    }
};

// Controller for sending a live message backup (while user is online or offline)
exports.sendMessageLiveBackup = async (req, res) => {
    const { receiverId, message, attachments } = req.body;

    if (!receiverId || !message) {
        return res.status(400).json({ error: 'Receiver and message are required.' });
    }

    try {
        const success = await sendMessage(req.io, req.user.id, receiverId, message, attachments);
        console.log(success ? `Message successfully sent to receiver ID: ${receiverId}` : `Message saved for offline delivery to receiver ID: ${receiverId}`);
        
        return res.status(201).json({ success: true, message: 'Message processed' });
    } catch (error) {
        console.error("Error processing message request:", error);
        return res.status(500).json({ error: 'Failed to process message.' });
    }
};

// Controller for sending a message
exports.sendMessage = async (req, res) => {
    const { receiverId, message, attachments } = req.body;

    if (!receiverId || !message) {
        return res.status(400).json({ error: 'Receiver and message are required.' });
    }

    try {
        const success = await sendMessage(req.io, req.user.id, receiverId, message, attachments);
        return res.status(201).json({ success: true, message: 'Message processed' });
    } catch (error) {
        console.error("Error processing message request:", error);
        return res.status(500).json({ error: 'Failed to process message.' });
    }
};