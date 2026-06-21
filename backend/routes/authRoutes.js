const express = require('express');
const router = express.Router();
const { registerUser, loginUser, updateDriverStatus, registerAdmin } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/driver-status', protect, updateDriverStatus);
router.post('/register-admin', protect, authorize('admin'), registerAdmin);

module.exports = router;
