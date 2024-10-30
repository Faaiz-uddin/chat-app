const express = require('express');
const router = express.Router();

const { getMessages, sendMessage ,getConversationsWithUnreadCount} = require('../controllers/chatController');
const auth = require('../middleware/authMiddleware.js');


router.get('/chat/:userId',auth, getMessages);
router.post('/send',auth, sendMessage);
router.get('/conversations', auth, getConversationsWithUnreadCount); 

module.exports = router;