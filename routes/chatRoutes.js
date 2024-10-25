const express = require('express');
const { getUserChats, sendMessage } = require('../controllers/chatController');
const router = express.Router();

router.get('/chats', getUserChats);
router.post('/message', sendMessage);

module.exports = router;