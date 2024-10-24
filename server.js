const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const cors = require('cors');
require('dotenv').config();
require('./middleware/passportConfig');
const passport = require('passport');
const session = require('express-session');
const app = express();
// const server = http.createServer(app);
// const io = socketIo(server, {
//     cors: {
//         origin: "*",
//         methods: ["GET", "POST"]
//     }
// });

// Connect to Database
connectDB();

// // Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));
// // Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// // Socket.io for Real-Time Messaging
// io.on('connection', (socket) => {
//     console.log('A user connected');
    
//     socket.on('joinRoom', (room) => {
//         socket.join(room);
//     });

//     socket.on('chatMessage', (msg) => {
//         io.to(msg.room).emit('message', msg);
//     });

//     socket.on('disconnect', () => {
//         console.log('User disconnected');
//     });
// });

// Setup session handling
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
}));

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});