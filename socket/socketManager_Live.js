const Message = require('../models/Message');
const userSockets = new Map();
const userStatus = new Map();
const unreadCounts = new Map();

const initializeSocket = (io) => {
    io.on('connection', (socket) => {
       
        socket.on('join', async (userId) => {
            try {
                userSockets.set(userId, socket.id);
                userStatus.set(userId, { status: "online", lastSeen: null });
                unreadCounts.set(userId, {}); // Initialize unread count for user
                io.emit("statusUpdate", { userId, status: "online" });
                console.log(`User ${userId} joined. Active connections:`, Array.from(userSockets.entries()));
            } catch (error) {
                console.error(`Error during join for user ${userId}:`, error);
            }
        });

      
        socket.on('sendMessage', async ({ senderId, receiverId, message, attachments }) => {
            const messageData = {
                sender: senderId,
                receiver: receiverId,
                message,
                attachments: attachments || [],
                status: 'unread',
                timestamp: new Date(),
            };

            try {
                const newMessage = await new Message(messageData).save();
                const receiverSocketId = userSockets.get(receiverId);

             
                const receiverUnread = unreadCounts.get(receiverId) || {};
                receiverUnread[senderId] = (receiverUnread[senderId] || 0) + 1;
                unreadCounts.set(receiverId, receiverUnread);

         
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receiveMessage', newMessage);
                    io.to(receiverSocketId).emit('updateUnreadCount', receiverUnread);
                    console.log(`Message sent to receiver ${receiverId} (online).`);
                } else {
                    console.log(`Receiver ${receiverId} is offline. Message saved for later.`);
                }
            } catch (error) {
                console.error("Error sending message:", error);
            }
        });

     
        socket.on('openChat', ({ userId, chatWith }) => {
            const userUnread = unreadCounts.get(userId) || {};
            if (userUnread[chatWith]) {
                userUnread[chatWith] = 0; 
                unreadCounts.set(userId, userUnread);

              
                const userSocketId = userSockets.get(userId);
                if (userSocketId) {
                    io.to(userSocketId).emit('updateUnreadCount', userUnread);
                }
                console.log(`Unread count reset for user ${userId} with chat ${chatWith}.`);
            }
        });

  
        socket.on('logout', (userId) => {
            if (userSockets.has(userId)) {
                userSockets.delete(userId);
                const lastSeen = new Date().toISOString();
                userStatus.set(userId, { status: "offline", lastSeen });
                io.emit("statusUpdate", { userId, status: "offline", lastSeen });
                console.log(`User ${userId} logged out. Active connections:`, Array.from(userSockets.entries()));
            }
        });

     
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    userStatus.set(userId, "offline");
                    io.emit("statusUpdate", { userId, status: "offline" });
                    console.log(`User ${userId} disconnected. Active connections:`, Array.from(userSockets.entries()));
                    break;
                }
            }
        });

      
        socket.on("typing", ({ senderId, receiverId }) => {
            const receiverSocketId = userSockets.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("userTyping", { senderId });
            }
        });

        socket.on("stopTyping", ({ senderId, receiverId }) => {
            const receiverSocketId = userSockets.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("userStopTyping", { senderId });
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
        const newMessage = await new Message(messageData).save();
        const receiverSocketId = userSockets.get(receiverId);

       
        const receiverUnread = unreadCounts.get(receiverId) || {};
        receiverUnread[senderId] = (receiverUnread[senderId] || 0) + 1;
        unreadCounts.set(receiverId, receiverUnread);

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receiveMessage', newMessage);
            io.to(receiverSocketId).emit('updateUnreadCount', receiverUnread);
            newMessage.status = 'sent';
            await newMessage.save();
            console.log(`Message sent to receiver ${receiverId} (online).`);
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

module.exports = {
    initializeSocket,
    sendMessage,
};

/* 
    
*/