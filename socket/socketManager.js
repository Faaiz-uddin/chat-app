const Message = require('../models/Message');
const User = require('../models/User');
const userSockets = new Map(); // Store userId and socketId

const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('join', async (userId) => {
            try {
                // Map user ID to socket ID without updating status
                userSockets.set(userId, socket.id);
                console.log(`User ${userId} has joined. Current connections:`, Array.from(userSockets.entries()));
            } catch (error) {
                console.error(`Error handling user ${userId} join event:`, error);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // Remove the user from the socket map on disconnect without updating status
            for (const [userId, socketId] of userSockets) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    console.log(`User ${userId} has disconnected. Updated userSockets:`, Array.from(userSockets.entries()));
                    break;
                }
            }
        });
    });
};



const sendMessage = async (io, senderId, receiverId, message, attachments) => {
    const messageData = {
        sender: senderId,
        receiver: receiverId,
        message,
        attachments,
        timestamp: new Date(),
    };

    try {
        // Save the message to the database
        const newMessage = new Message(messageData);
        await newMessage.save();

        // Check if the receiver is connected and emit the message if they are
        const receiverSocketId = userSockets.get(receiverId); 
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receiveMessage', messageData);
            console.log(`Message sent to ${receiverId}`);
            return true; 
        } else {
            console.log(`Receiver ${receiverId} is offline.`);
            return false; 
        }
    } catch (error) {
        console.error("Error sending message:", error);
        return false;
    }
};


// Optional: Save message to database
const saveMessageToDatabase = async (messageData) => {
    const newMessage = new Message(messageData);
    await newMessage.save();
    console.log('Message saved to database:', newMessage);
};

module.exports = {
    initializeSocket,
    sendMessage,
};