const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/send', authMiddleware, sendMessage);

module.exports = router;