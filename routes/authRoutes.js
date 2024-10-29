const express = require('express');
const passport = require('passport');

const auth = require('../middleware/authMiddleware.js');
const upload = require('../middleware/upload');
const router = express.Router();
const { register,login,getAllUsers,updateProfile ,logout} = require('../controllers/authController');


router.post('/register', register);
router.post('/login', login);
router.get('/users',auth, getAllUsers);
router.post('/logout',auth, logout);
router.put('/update', auth, upload.single('profileImage'), updateProfile);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// router.get('/google/callback',
//     passport.authenticate('google', { failureRedirect: '/' }),
//     (req, res) => {
//         res.redirect('/dashboard'); 
//     }
// );
// Call back route
router.get(
    "/google/callback",
    passport.authenticate("google", {
      access_type: "offline",
      scope: ["email", "profile"],
      failureRedirect: "/", 
    }),
    (req, res) => {
      if (!req.user) {
        res.status(400).json({ error: "Authentication failed" });
      }
      // return user details
      console.log("User Authenticated:", req.user);
      res.json({
        success: true,
        message: "Authenticated successfully",
        user: req.user, // You may want to send only the essential user data or a token
      });
    // res.redirect("/dashboard");
    }
  );



module.exports = router;