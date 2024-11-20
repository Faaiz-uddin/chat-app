const Message = require('../models/Message');
const User = require('../models/User');
const userSockets = new Map(); // Map to store userId and socketId
const userStatus = new Map(); // Map to manage user online status
const activeChats = new Map(); // Track active chats of users

const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // Handle user join event
        socket.on('join', async (userId) => {
            try {
                handleUserJoin(socket, userId, io);
            } catch (error) {
                console.error(`Error during join for user ${userId}:`, error);
            }
        });

        // Handle opening chat between users
        socket.on('openChat', async ({ userId, chatWithUserId }) => {
            try {
                handleOpenChat(socket, userId, chatWithUserId);
            } catch (error) {
                console.error(`Error opening chat between users ${userId} and ${chatWithUserId}:`, error);
            }
        });

        // Handle user logout
        socket.on('logout', (userId) => {
            handleUserLogout(socket, userId, io);
        });

        // Handle disconnect event
        socket.on('disconnect', () => {
            handleUserDisconnect(socket, io);
        });
    });
};

// Function to handle user join
const handleUserJoin = async (socket, userId, io) => {
    userSockets.set(userId, socket.id);
    userStatus.set(userId, { status: "online", lastSeen: null });
    io.emit("statusUpdate", { userId, status: "online" });

    const unreadMessagesCount = await Message.countDocuments({ receiver: userId, status: 'unread' });
    socket.emit('unreadCount', { count: unreadMessagesCount });

    await loadUnreadMessages(userId, socket); // Load unread messages for the user
};

// Function to handle opening chat and updating message status
const handleOpenChat = async (socket, userId, chatWithUserId) => {
    activeChats.set(userId, chatWithUserId);

    await Message.updateMany(
        { sender: chatWithUserId, receiver: userId, status: 'delivered' },
        { $set: { status: 'read' } }
    );

    const unreadMessages = await Message.find({
        sender: chatWithUserId,
        receiver: userId,
        status: 'read'
    });

    unreadMessages.forEach((message) => {
        socket.emit('receiveMessage', message);
    });
};

// Function to handle user logout
const handleUserLogout = (socket, userId, io) => {
    if (userSockets.has(userId)) {
        userSockets.delete(userId);
        const lastSeen = new Date().toISOString();
        userStatus.set(userId, { status: "offline", lastSeen });
        io.emit("statusUpdate", { userId, status: "offline", lastSeen });
    }
};

// Function to handle user disconnect
const handleUserDisconnect = (socket, io) => {
    for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
            userSockets.delete(userId);
            userStatus.set(userId, { status: "offline" });
            io.emit("statusUpdate", { userId, status: "offline" });
            break;
        }
    }
};

// Function to send message and manage message status
const sendMessage = async (io, senderId, receiverId, message, attachments) => {
    const messageData = {
        sender: senderId,
        receiver: receiverId,
        message,
        attachments: attachments || [],
        status: 'sent',
        timestamp: new Date(),
    };

    try {
        const newMessage = await new Message(messageData).save();
        const receiverSocketId = userSockets.get(receiverId);
        
        if (receiverSocketId) {
            const isUserInChat = activeChats.get(receiverId) === senderId;

            newMessage.status = isUserInChat ? 'read' : 'delivered';
            await newMessage.save();

            io.to(receiverSocketId).emit('receiveMessage', newMessage);
            console.log(`Message sent to receiver ${receiverId}. Status: ${newMessage.status}`);
            return true;
        } else {
            console.log(`Receiver ${receiverId} is offline. Message saved with status 'unread'.`);
            return false;
        }
    } catch (error) {
        console.error("Error sending message:", error);
        return false;
    }
};

// Function to load unread messages for a user
const loadUnreadMessages = async (userId, socket) => {
    try {
        const unreadMessages = await Message.find({ receiver: userId, status: 'unread' });

        unreadMessages.forEach((message) => {
            socket.emit('receiveMessage', message);
        });

        await Message.updateMany(
            { receiver: userId, status: 'unread' },
            { $set: { status: 'delivered' } }
        );
    } catch (error) {
        console.error("Error loading unread messages:", error);
    }
};

module.exports = {
    initializeSocket,
    sendMessage,
    loadUnreadMessages
};