const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getDriverTasks,
    updateOrderStatus,
    assignDriver,
    getAdminAnalytics
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('customer'), createOrder);
router.get('/my-orders', protect, authorize('customer'), getMyOrders);
router.get('/driver-tasks', protect, authorize('driver'), getDriverTasks);
router.put('/:id/status', protect, authorize('driver'), updateOrderStatus);
router.put('/:id/assign', protect, authorize('admin'), assignDriver);
router.get('/analytics', protect, authorize('admin'), getAdminAnalytics);

module.exports = router;
