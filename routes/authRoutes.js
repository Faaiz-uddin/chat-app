const express = require('express');
const passport = require('passport');
const auth = require('../middleware/authMiddleware.js');
const upload = require('../middleware/upload');
const router = express.Router();
const { register,login,getAllUsers,updateProfile } = require('../controllers/authController');


router.post('/register', register);
router.post('/login', login);
router.get('/users',auth, getAllUsers);
router.put('/update', auth, upload.single('profileImage'), updateProfile);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/dashboard'); 
    }
);




module.exports = router;