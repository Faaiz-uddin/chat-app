const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
console.log("Faaiz uddin");

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    console.log(req.body);
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });
        if (user.googleId) {
            return res.status(400).json({ message: 'Use Google login for this account' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(400).json({ message: 'Invalid credentials' });
        user.status = 'online';
        await user.save();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        req.io.emit('statusUpdate', { userId: user._id, status: 'online' });
        res.json({ token, user });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: err.message });
    }
};
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('username email profileImage status lastSeen');
        const updatedUsers = users.map(user => ({
            ...user.toObject(),
            profileImage: `${req.protocol}://${req.get('host')}/${user.profileImage}`
        }));
        
        res.status(200).json(updatedUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getProfile = async (req, res) => {
    const userId = req.user.id;
    console.log("Faaiz----->>",userId);
    try {
        const user = await User.findById(userId).select('username email profileImage');

        if (!user) {
        return res.status(404).json({ error: 'User not found' });
        }
        const profileImageUrl = `${req.protocol}://${req.get('host')}/${user.profileImage}`;
        res.status(200).json({
        email: user.email,
        username: user.username,
        image: profileImageUrl,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};
exports.updateProfile = async (req, res) => {
    const { username, email } = req.body;
    const profileImage = req.file ? req.file.path : null; 
    console.log(profileImage,req.body);
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (username) user.username = username;
        if (email) user.email = email;
        if (profileImage) user.profileImage = profileImage;

        await user.save();

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.logout = async (req, res) => {
    const userId = req.user.id;
    try {
       
        await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() }, { new: true });

         // Emit offline status with last seen
         req.io.emit('statusUpdate', { userId, status: 'offline', lastSeen: new Date() });
        res.status(200).json({ message: 'User logged out successfully' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.forgetPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const otp = Math.floor(1000 + Math.random() * 9000);
        const otpExpiry = Date.now() + 10 * 60 * 1000;
        user.resetOtp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail', 
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'OTP sent to email' });
    } catch (err) {
        console.error('Forget Password Error:', err);
        res.status(500).json({ error: err.message });
    }
};
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        
        if (user.resetOtp !== parseInt(otp) || user.otpExpiry < Date.now()) {
            return res.status(400).json({ message: 'Invalid OTP or OTP expired' });
        }

        res.status(200).json({ message: 'OTP verified successfully' });
    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.status(500).json({ error: err.message });
    }
};
exports.resetPassword = async (req, res) => {
    const { email,  newPassword } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

       
        const hashedPassword = await bcrypt.hash(newPassword, 12);

      
        user.password = hashedPassword;
        

        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ error: err.message });
    }
};