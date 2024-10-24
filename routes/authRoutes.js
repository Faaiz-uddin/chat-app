const express = require('express');
const passport = require('passport');
const router = express.Router();
const { register, login, updateProfile } = require('../controllers/authController');

// Manual Authentication Routes
router.post('/register', register);  // Register user manually
router.post('/login', login);        // Manual login

// Google Authentication Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/'); // Redirect after successful login
    }
);

// Profile Update Route
router.put('/update', updateProfile);

module.exports = router;