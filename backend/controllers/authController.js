const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to sign JWT tokens
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'pakmove_jwt_secret_key_123', {
        expiresIn: '30d'
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Block public registration of administrative roles
        if (role === 'admin') {
            return res.status(403).json({ success: false, message: 'Public registration of admin accounts is restricted' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'customer',
            isOnline: role === 'driver' ? true : undefined // Set online by default if driver
        });

        if (user) {
            res.status(201).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isOnline: user.isOnline,
                    token: generateToken(user._id)
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid user data received' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Register a new sub-admin account
// @route   POST /api/auth/register-admin
// @access  Private (Admin only)
exports.registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: 'admin'
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isOnline: user.isOnline,
                    token: generateToken(user._id)
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update driver online status
// @route   PUT /api/auth/driver-status
// @access  Private (Driver only)
exports.updateDriverStatus = async (req, res) => {
    try {
        const { isOnline } = req.body;

        if (req.user.role !== 'driver') {
            return res.status(403).json({ success: false, message: 'Only driver accounts can update status' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { isOnline },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
