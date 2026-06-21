const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    pickupAddress: {
        type: String,
        required: [true, 'Please add a pickup address'],
        trim: true
    },
    dropAddress: {
        type: String,
        required: [true, 'Please add a drop-off address'],
        trim: true
    },
    packageType: {
        type: String,
        required: [true, 'Please specify the package type'],
        enum: ['Document', 'Electronics', 'Fragile Box', 'Apparel', 'Food/Groceries']
    },
    vehicleType: {
        type: String,
        required: [true, 'Please specify the vehicle type'],
        enum: ['bike', 'rickshaw', 'truck']
    },
    weight: {
        type: Number,
        required: [true, 'Please add package weight in kg']
    },
    contactNumber: {
        type: String,
        required: [true, 'Please add a recipient contact number']
    },
    status: {
        type: String,
        enum: ['paid_pending', 'assigned', 'transit', 'delivered'],
        default: 'paid_pending'
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    driverName: {
        type: String,
        default: null
    },
    driverEmail: {
        type: String,
        default: null
    },
    paymentMethod: {
        type: String,
        required: [true, 'Please specify the payment method']
    },
    transactionId: {
        type: String,
        required: [true, 'Please specify the transaction ID']
    },
    paymentStatus: {
        type: String,
        default: 'Paid Upfront'
    },
    price: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema);
