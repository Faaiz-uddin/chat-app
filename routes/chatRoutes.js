const express = require('express');
const router = express.Router();

const { getMessages, sendMessage } = require('../controllers/chatController');
const auth = require('../middleware/authMiddleware.js');


router.get('/chat/:userId',auth, getMessages);
router.post('/send',auth, sendMessage);

module.exports = router;