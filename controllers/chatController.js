const express = require('express');
const mongoose = require('mongoose'); 

const Message = require('../models/Message');
const { sendMessage } = require('../socket/socketManager'); 
exports.getMessages = async (req, res) => {
    const { userId } = req.params; // Assuming userId is passed as a route parameter
    const loggedInUserId = req.user.id; // The ID of the logged-in user
    console.log(userId+"---"+loggedInUserId);
    try {
        const messages = await Message.find({
            $or: [
                { sender: loggedInUserId, receiver: userId },
                { sender: userId, receiver: loggedInUserId }
            ]
        }).sort({ timestamp: 1 }); // Sort messages by timestamp

        return res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({ error: 'Failed to fetch messages.' });
    }
};

exports.getConversations = async (req, res) => {
    const userId = req.user.id; 

    try {
       
        const conversations = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        })
        .populate('sender', 'name') 
        .populate('receiver', 'name')
        .sort({ timestamp: -1 });

    
        const uniqueConversations = {};
        conversations.forEach(msg => {
            const otherUserId = msg.sender._id.equals(userId) ? msg.receiver : msg.sender;
            if (!uniqueConversations[otherUserId]) {
                uniqueConversations[otherUserId] = {
                    user: otherUserId,
                    lastMessage: msg
                };
            }
        });

      
        return res.status(200).json(Object.values(uniqueConversations));
    } catch (error) {
        console.error("Error fetching conversations:", error);
        return res.status(500).json({ error: 'Failed to fetch conversations.' });
    }
};


exports.sendMessage = async (req, res) => {
    const { receiverId, message, attachments } = req.body;

    if (!receiverId || !message) {
        return res.status(400).json({ error: 'Receiver and message are required.' });
    }

    try {
        const newMessage = new Message({
            sender: req.user.id,
            receiver: receiverId,
            message: message,
            attachments: attachments || [],
            status: 'sent',
            timestamp: new Date(),
        });

        const savedMessage = await newMessage.save();

        try {
            const success = await sendMessage(req.io, req.user.id, receiverId, message, attachments);
            if (success) {
                console.log(`Message successfully sent to receiver ID: ${receiverId}`);
            } else {
                console.log(`Message failed to send to receiver ID: ${receiverId}`);
            }
        } catch (socketError) {
            console.error("Error sending message through Socket.IO:", socketError);
        }

        return res.status(201).json(savedMessage);
    } catch (error) {
        console.error("Error saving or sending the message:", error);
        return res.status(500).json({ error: 'Failed to send message.' });
    }
};