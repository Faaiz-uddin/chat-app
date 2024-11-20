const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const { initializeSocket ,setupSocket} = require('./socket/socketManager');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const friendRoutes = require('./routes/friendRoutes');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
require('dotenv').config();
require('./utils/passport');


const app = express();
const server = http.createServer(app);

connectDB();
const io = require('socket.io')(server, {
    cors: {
        origin: '*', // Replace '*' with your frontend URL (e.g., 'http://192.168.100.169:3000')
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});


app.use(session({ 
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
}));

app.use(express.json());
app.use(cors());

// Attach Socket.IO to Express requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Set up Socket.IO
setupSocket(io);
initializeSocket(io);

// io.on('connection', (socket) => {
//     console.log('New client connected');
//     socket.on('sendMessage', (data) => {
//         io.emit('receiveMessage', data);
//     });
//     socket.on('disconnect', () => {
//         console.log('Client disconnected');
//     });
// });

app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/friends', friendRoutes);


app.use(
    session({
      secret: process.env.SESSION_SECRET, 
      resave: false,
      saveUninitialized: true,
    })
  );
app.use(passport.initialize());
app.use(passport.session());




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = io;