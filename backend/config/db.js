const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pakmove');

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Automatically seed default accounts if User collection is empty
        const count = await User.countDocuments();
        if (count === 0) {
            console.log('Database empty. Seeding default PakMove accounts...');
            await User.create([
                { name: 'Zain Ahmed', email: 'customer@pakmove.com', password: 'password', role: 'customer' },
                { name: 'Khan Muhammad', email: 'driver@pakmove.com', password: 'password', role: 'driver', isOnline: true },
                { name: 'Asif Ali', email: 'driver2@pakmove.com', password: 'password', role: 'driver', isOnline: true },
                { name: 'Super Admin', email: 'admin@pakmove.com', password: 'adminpassword', role: 'admin' }
            ]);
            console.log('Database seeding complete: customer@pakmove.com, driver@pakmove.com, admin@pakmove.com created.');
        }
    } catch (err) {
        console.error(`Database connection error: ${err.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;
