const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
console.log("Faaiz uddin");
// Register User
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

// Login User
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

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// Get All Users
// exports.getAllUsers = async (req, res) => {
//     console.log("getAllUsers route hit"); // Log when the route is hit
//     try {
//         const users = await User.find(); // Use await to fetch users from the database
//         console.log("Users fetched:", users); // Log the fetched users
//         res.status(200).json(users); // Send the fetched users as a JSON response
//     } catch (err) {
//         console.log("Error in getAllUsers:", err); // Log any errors
//         res.status(500).json({ error: err.message });
//     }
// };
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('username email profileImage');
        const updatedUsers = users.map(user => ({
            ...user.toObject(),
            profileImage: `${req.protocol}://${req.get('host')}/${user.profileImage}`
        }));
        
        res.status(200).json(updatedUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    const { username, password } = req.body;
    const profileImage = req.file ? req.file.path : null; 
    console.log(profileImage);
    try {
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

       
        if (username) {
            user.username = username;
        }

        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 12);
            user.password = hashedPassword;
        }

       
        if (profileImage) {
            user.profileImage = profileImage;
        }

    
        await user.save();

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

