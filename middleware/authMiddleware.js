const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    try {
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded.id;
        } else if (req.isAuthenticated()) {
            req.user = req.user._id; 
        } else {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        next();
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

module.exports = authMiddleware;