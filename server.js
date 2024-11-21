const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { initializeSocket, setupSocket } = require('./socket/socketManager');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const friendRoutes = require('./routes/friendRoutes');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
require('dotenv').config();
require('./utils/passport');

const app = express();

app.use(cors({origin: '*'}));
connectDB();

const httpServer = http.createServer(app);
const io = new Server(httpServer);



initializeSocket(io);



app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

app.use(express.json());


app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads', express.static('uploads'));
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/friends', friendRoutes);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = io;