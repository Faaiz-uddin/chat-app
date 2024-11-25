const Message = require('../models/Message');
const User = require('../models/User');
const userSockets = new Map();
const userStatus = new Map();
const unreadCounts = new Map();
const connectedUsers = new Set();

const initializeSocket = (io) => {
    io.on('connection', (socket) => {
       
        socket.on('join', async (userId) => {
            try {
                userSockets.set(userId, socket.id);
                userStatus.set(userId, { status: "online", lastSeen: null });
                if (!unreadCounts.has(userId)) {
                    unreadCounts.set(userId, {});
                }
                io.emit("statusUpdate", { userId, status: "online" });
                //console.log(`User ${userId} joined. Active connections:`, Array.from(userSockets.entries()));
            } catch (error) {
                console.error(`Error during join for user ${userId}:`, error);
            }
        });
        // socket.on('join', async (userId) => {
        //     try {
        //         console.log(`User joined: userId=${userId}, socketId=${socket.id}`);
        //         userSockets.set(userId, socket.id);
        //         console.log(`User ${userId} joined. Active connections:`, Array.from(userSockets.entries()));
        //         userStatus.set(userId, { status: "online", lastSeen: null });
        //         io.emit("statusUpdate", { userId, status: "online" });
                

        //     } catch (error) {
        //         console.error(`Error during join for user ${userId}:`, error);
        //     }
        // });

        // socket.on('openChat', ({ userId, chatWith }) => {
        //     console.log( userId, chatWith);
        //     const userUnread = unreadCounts.get(userId) || {};
        //     console.log(userUnread);
        //     if (userUnread[chatWith]) {
        //         userUnread[chatWith] = 0;
        //         unreadCounts.set(userId, userUnread);
        //         const userSocketId = userSockets.get(userId);
        //         if (userSocketId) {
        //             io.to(userSocketId).emit('updateUnreadCount', userUnread);
        //         }
        //         console.log(`Unread count reset for user ${userId} with chat ${chatWith}.`);
        //     }
        // });
        socket.on('openChat', async ({ userId, chatWith }) => {
            console.log("OpenChat Triggered:", { userId, chatWith });
        
           
            const userUnread = unreadCounts.get(userId) || {};
            console.log("Unread Counts Before Reset:", userUnread);
        
        
            if (userUnread[chatWith]) {
                console.log(`Resetting unread count for chat: ${chatWith}`);
                
            
                userUnread[chatWith] = 0;
                unreadCounts.set(userId, userUnread);
        
             
                try {
                    await Message.updateMany(
                        { sender: chatWith, receiver: userId, status: 'unread' },
                        { $set: { status: 'read' } } 
                    );
                    console.log(`Messages from ${chatWith} to ${userId} marked as read.`);
                } catch (error) {
                    console.error("Error updating message status:", error);
                }
        
                
                const userSocketId = userSockets.get(userId);
                if (userSocketId) {
                    io.to(userSocketId).emit('updateUnreadCount', userUnread);
                    console.log("Unread count emitted to user:", userId);
                } else {
                    console.log("User socket not found for emitting unread counts.");
                }
            } else {
                console.log(`No unread messages for chatWith: ${chatWith}`);
            }
        
            console.log("Unread Counts After Reset:", unreadCounts.get(userId));
        });
        socket.on('getUnreadCount', async (userId) => {
            try {
                const userUnread = unreadCounts.get(userId) || {};
                socket.emit('updateUnreadCount', userUnread);
            } catch (error) {
                console.error("Error fetching unread count:", error);
            }
        });
        socket.on('logout', (userId) => {
            if (userSockets.has(userId)) {
                userSockets.delete(userId);
                const lastSeen = new Date().toISOString();
                userStatus.set(userId, { status: "offline", lastSeen });
                io.emit("statusUpdate", { userId, status: "offline", lastSeen });
                //console.log(`User ${userId} logged out. Active connections:`, Array.from(userSockets.entries()));
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

       
        // socket.on('disconnect', () => {
        //     console.log('User disconnected:', socket.id);
        //     for (const [userId, socketIds] of userSockets.entries()) {
        //         if (Array.isArray(socketIds) && socketIds.includes(socket.id)) {
        //             const updatedSocketIds = socketIds.filter(id => id !== socket.id);
        //             if (updatedSocketIds.length > 0) {
        //                 userSockets.set(userId, updatedSocketIds);
        //             } else {
        //                 userSockets.delete(userId);
        //                 userStatus.set(userId, { status: "offline", lastSeen: new Date().toISOString() });
        //                 io.emit("statusUpdate", { userId, status: "offline" });
        //             }
        //             console.log(`User ${userId} disconnected. Active connections:`, Array.from(userSockets.entries()));
        //             break;
        //         }
        //     }
        // });

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

