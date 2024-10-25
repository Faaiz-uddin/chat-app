const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
require('dotenv').config();
require('./utils/passport');


const app = express();

connectDB();

app.use(session({ 
    secret: process.env.SESSION_SECRET, 
}))
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));
// // Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);


console.log("Session Secret:", process.env.SESSION_SECRET);
app.use(
    session({
      secret: process.env.SESSION_SECRET, 
      resave: false,
      saveUninitialized: true,
    })
  );

  app.use((req, res, next) => {
    if (req.session) {
        console.log("Session middleware is active");

    } else {
        console.log("Session middleware is NOT active");
    }
    next();
});


app.use(passport.initialize());
app.use(passport.session());



app.get('/',(req,res) => {
    res.send('<h1>Faaiz here login</h1>');
});
app.get("/dashboard", (req, res) => {
 
    res.send("Welcome to Dashboard!");
  });
// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});