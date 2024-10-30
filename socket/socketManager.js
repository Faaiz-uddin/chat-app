const Message = require('../models/Message');
const User = require('../models/User');
const userSockets = new Map(); // Store userId and socketId
const connectedUsers = new Set(); 
const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        
        socket.on('join', async (userId) => {
            try {
                userSockets.set(userId, socket.id);
                console.log(`User ${userId} joined. Active connections:`, Array.from(userSockets.entries()));

                // Load and send any unread messages to the user
                await loadUnreadMessages(userId, socket);
            } catch (error) {
                console.error(`Error during join for user ${userId}:`, error);
            }
        });

         
        socket.on('typing', ({ senderId, receiverId }) => {
            io.to(receiverId).emit('userTyping', { senderId });
        });

        socket.on('stopTyping', ({ senderId, receiverId }) => {
            io.to(receiverId).emit('userStopTyping', { senderId });
        });
        
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    console.log(`User ${userId} disconnected. Active connections:`, Array.from(userSockets.entries()));
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
        attachments: attachments || [],
        status: 'unread',
        timestamp: new Date(),
    };

    try {
        // Save the message to the database
        const newMessage = await new Message(messageData).save();

        // Check if the receiver is online
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
            // Send the message in real time
            io.to(receiverSocketId).emit('receiveMessage', newMessage);

            // Update the message status to 'sent'
            newMessage.status = 'sent';
            await newMessage.save();
            console.log(`Message sent to receiver ${receiverId} (online)`);
            return true;
        } else {
            console.log(`Receiver ${receiverId} is offline. Message saved for later delivery.`);
            return false;
        }
    } catch (error) {
        console.error("Error sending message:", error);
        return false;
    }
};




//as
// const sendMessage = async (io, senderId, receiverId, message, attachments) => {
//     const messageData = {
//         sender: senderId,
//         receiver: receiverId,
//         message,
//         attachments,
//         status: 'unread', 
//         timestamp: new Date(),
//     };

//     try {
        
//         const newMessage = new Message(messageData);
//         await newMessage.save();

        
//         const receiverSocketId = userSockets.get(receiverId);
//         if (receiverSocketId) {
//             io.to(receiverSocketId).emit('receiveMessage', newMessage);

            
//             newMessage.status = 'sent';
//             await newMessage.save();
//             console.log(`Message sent to ${receiverId}`);
//             return true;
//         } else {
//             console.log(`Receiver ${receiverId} is offline.`);
//             return false;
//         }
//     } catch (error) {
//         console.error("Error sending message:", error);
//         return false;
//     }
// };

// Optional: Save message to database
const saveMessageToDatabase = async (messageData) => {
    const newMessage = new Message(messageData);
    await newMessage.save();
    console.log('Message saved to database:', newMessage);
};

// Function to load unread messages
const loadUnreadMessages = async (userId, socket) => {
    try {
        const unreadMessages = await Message.find({ receiver: userId, status: 'unread' });

        // Send each unread message to the user
        unreadMessages.forEach((message) => {
            socket.emit('receiveMessage', message);
        });

        // Mark messages as 'read' after sending
        await Message.updateMany({ receiver: userId, status: 'unread' }, { $set: { status: 'read' } });
    } catch (error) {
        console.error("Error loading unread messages:", error);
    }
};

module.exports = {
    initializeSocket,
    sendMessage,
};