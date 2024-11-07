const express = require('express');
const mongoose = require('mongoose'); 

const Message = require('../models/Message');
const { sendMessage } = require('../socket/socketManager'); 
exports.getMessages = async (req, res) => {
    const { userId } = req.params; 
    const loggedInUserId = req.user.id; 
    console.log(userId+"---"+loggedInUserId);
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
                name: convo.user.name,
                image: convo.user.image,
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






exports.sendMessage = async (req, res) => {
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


//asasa
// exports.sendMessage = async (req, res) => {
//     const { receiverId, message, attachments } = req.body;

//     if (!receiverId || !message) {
//         return res.status(400).json({ error: 'Receiver and message are required.' });
//     }

//     try {
//         const newMessage = new Message({
//             sender: req.user.id,
//             receiver: receiverId,
//             message: message,
//             attachments: attachments || [],
//             status: 'sent',
//             timestamp: new Date(),
//         });

//         const savedMessage = await newMessage.save();

//         try {
//             const success = await sendMessage(req.io, req.user.id, receiverId, message, attachments);
//             if (success) {
//                 console.log(`Message successfully sent to receiver ID: ${receiverId}`);
//             } else {
//                 console.log(`Message failed to send to receiver ID: ${receiverId}`);
//             }
//         } catch (socketError) {
//             console.error("Error sending message through Socket.IO:", socketError);
//         }

//         return res.status(201).json(savedMessage);
//     } catch (error) {
//         console.error("Error saving or sending the message:", error);
//         return res.status(500).json({ error: 'Failed to send message.' });
//     }
// };