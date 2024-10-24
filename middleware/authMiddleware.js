const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {

    try {
    
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (token) {
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            req.user = await User.findById(decoded.id); // Populate the user from the database
        } else if (req.isAuthenticated()) {
           
            req.user = req.user._id; 
        } else {
            return res.status(401).json({ message: 'Unauthorized: No token or login detected' });
        }

     
        next();
    } catch (err) {
        
        return res.status(401).json({ message: 'Unauthorized: Invalid token or session expired' });
    }
};

module.exports = authMiddleware;

