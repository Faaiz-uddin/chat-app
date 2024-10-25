const express = require('express');
const { sendFriendRequest, getFriendRequests } = require('../controllers/friendController');
const router = express.Router();

router.post('/friend/request', sendFriendRequest);
router.get('/friend/requests', getFriendRequests);

module.exports = router;