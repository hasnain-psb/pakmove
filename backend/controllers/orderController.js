const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Create a new delivery order
// @route   POST /api/orders
// @access  Private (Customer only)
exports.createOrder = async (req, res) => {
    try {
        const { pickupAddress, dropAddress, packageType, vehicleType, weight, contactNumber, paymentMethod, transactionId } = req.body;

        if (req.user.role !== 'customer') {
            return res.status(403).json({ success: false, message: 'Only customers can book deliveries' });
        }

        if (!vehicleType || !paymentMethod || !transactionId) {
            return res.status(400).json({ success: false, message: 'Please provide vehicle type, payment method, and transaction ID' });
        }

        // Pricing logic matches the frontend fare calculator
        let base = 150;
        let multiplier = 50;

        if (vehicleType === 'rickshaw') {
            base = 350;
            multiplier = 80;
        } else if (vehicleType === 'truck') {
            base = 800;
            multiplier = 150;
        }

        const price = Math.round(base + (parseFloat(weight) * multiplier));

        const order = await Order.create({
            customer: req.user._id,
            customerName: req.user.name,
            customerEmail: req.user.email,
            pickupAddress,
            dropAddress,
            packageType,
            vehicleType,
            weight,
            contactNumber,
            price,
            paymentMethod,
            transactionId,
            status: 'paid_pending',
            paymentStatus: 'Paid Upfront'
        });

        res.status(201).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all orders for the logged-in customer
// @route   GET /api/orders/my-orders
// @access  Private (Customer only)
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get assigned tasks for the logged-in driver
// @route   GET /api/orders/driver-tasks
// @access  Private (Driver only)
exports.getDriverTasks = async (req, res) => {
    try {
        const orders = await Order.find({ 
            driver: req.user._id,
            status: { $ne: 'delivered' } 
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Driver only)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        if (!['transit', 'delivered'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status update transition' });
        }

        let order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if the driver is the one assigned
        if (order.driver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
        }

        order.status = status;
        await order.save();

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Assign driver to an order
// @route   PUT /api/orders/:id/assign
// @access  Private (Admin only)
exports.assignDriver = async (req, res) => {
    try {
        const { driverId } = req.body;
        const orderId = req.params.id;

        const driverUser = await User.findById(driverId);
        if (!driverUser || driverUser.role !== 'driver') {
            return res.status(400).json({ success: false, message: 'Invalid driver assigned' });
        }

        let order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.driver = driverUser._id;
        order.driverName = driverUser.name;
        order.driverEmail = driverUser.email;
        order.status = 'assigned';

        await order.save();

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all orders and stats analytics
// @route   GET /api/orders/analytics
// @access  Private (Admin only)
exports.getAdminAnalytics = async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 });
        const drivers = await User.find({ role: 'driver', isOnline: true }).select('-password');
        const admins = await User.find({ role: 'admin' }).select('-password');

        const totalOrders = orders.length;
        const activeDrivers = drivers.length;
        const totalRevenue = orders.reduce((sum, o) => sum + o.price, 0);

        res.json({
            success: true,
            data: {
                stats: {
                    totalOrders,
                    activeDrivers,
                    totalRevenue
                },
                orders,
                drivers,
                admins
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
