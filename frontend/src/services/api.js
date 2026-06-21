// PakMove Frontend API Request Service Client

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'http://localhost:5000/api';
// Set this to true to use client-side mock backend (LocalStorage DB)
// Set this to false to connect to the active Node/Express backend server
const USE_SIMULATED_BACKEND = false;

const getHeaders = () => {
    const token = localStorage.getItem('pm_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const api = {
    // 1. Authentication Services
    auth: {
        login: async (email, password) => {
            if (USE_SIMULATED_BACKEND) {
                return simulateApiCall(() => {
                    const users = JSON.parse(localStorage.getItem('pm_users') || '[]');
                    const user = users.find(u => u.email === email && u.password === password);
                    if (!user) throw new Error('Invalid email or password');
                    
                    const token = 'mock_jwt_token_' + Math.random().toString(36).substring(2);
                    localStorage.setItem('pm_token', token);
                    return { success: true, data: { ...user, token } };
                });
            }

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            return handleResponse(response);
        },

        register: async (name, email, password, role) => {
            if (USE_SIMULATED_BACKEND) {
                return simulateApiCall(() => {
                    const users = JSON.parse(localStorage.getItem('pm_users') || '[]');
                    if (users.some(u => u.email === email)) throw new Error('Email already registered');

                    const newUser = { name, email, password, role, isOnline: role === 'driver' };
                    users.push(newUser);
                    localStorage.setItem('pm_users', JSON.stringify(users));

                    const token = 'mock_jwt_token_' + Math.random().toString(36).substring(2);
                    localStorage.setItem('pm_token', token);
                    return { success: true, data: { ...newUser, token } };
                });
            }

            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role })
            });
            return handleResponse(response);
        },

        toggleDriverStatus: async (isOnline) => {
            if (USE_SIMULATED_BACKEND) {
                return simulateApiCall(() => {
                    const token = localStorage.getItem('pm_token');
                    if (!token) throw new Error('Not authenticated');
                    // Simulating updating driver online status
                    return { success: true, isOnline };
                });
            }

            const response = await fetch(`${API_BASE_URL}/auth/driver-status`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ isOnline })
            });
            return handleResponse(response);
        }
    },

    // 2. Shipping Order Services
    orders: {
        create: async (orderData) => {
            if (USE_SIMULATED_BACKEND) {
                return simulateApiCall(() => {
                    const orders = JSON.parse(localStorage.getItem('pm_orders') || '[]');
                    const price = Math.round(150 + (parseFloat(orderData.weight) * 100) + (Math.random() * 300));
                    const newOrder = {
                        id: `PM-${Math.floor(1000 + Math.random() * 9000)}`,
                        ...orderData,
                        status: 'placed',
                        driverEmail: null,
                        driverName: null,
                        createdAt: new Date().toISOString(),
                        price
                    };
                    orders.unshift(newOrder);
                    localStorage.setItem('pm_orders', JSON.stringify(orders));
                    return { success: true, data: newOrder };
                });
            }

            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(orderData)
            });
            return handleResponse(response);
        },

        getMyOrders: async () => {
            if (USE_SIMULATED_BACKEND) {
                return simulateApiCall(() => {
                    const orders = JSON.parse(localStorage.getItem('pm_orders') || '[]');
                    return { success: true, data: orders };
                });
            }

            const response = await fetch(`${API_BASE_URL}/orders/my-orders`, {
                method: 'GET',
                headers: getHeaders()
            });
            return handleResponse(response);
        },

        getDriverTasks: async () => {
            if (USE_SIMULATED_BACKEND) {
                return simulateApiCall(() => {
                    const orders = JSON.parse(localStorage.getItem('pm_orders') || '[]');
                    return { success: true, data: orders.filter(o => o.status !== 'delivered') };
                });
            }

            const response = await fetch(`${API_BASE_URL}/orders/driver-tasks`, {
                method: 'GET',
                headers: getHeaders()
            });
            return handleResponse(response);
        },

        updateStatus: async (orderId, status) => {
            if (USE_SIMULATED_BACKEND) {
                return simulateApiCall(() => {
                    const orders = JSON.parse(localStorage.getItem('pm_orders') || '[]');
                    const idx = orders.findIndex(o => o.id === orderId);
                    if (idx !== -1) {
                        orders[idx].status = status;
                        localStorage.setItem('pm_orders', JSON.stringify(orders));
                        return { success: true, data: orders[idx] };
                    }
                    throw new Error('Order not found');
                });
            }

            const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ status })
            });
            return handleResponse(response);
        },

        assignDriver: async (orderId, driverId) => {
            if (USE_SIMULATED_BACKEND) {
                return simulateApiCall(() => {
                    const orders = JSON.parse(localStorage.getItem('pm_orders') || '[]');
                    const users = JSON.parse(localStorage.getItem('pm_users') || '[]');
                    const orderIdx = orders.findIndex(o => o.id === orderId);
                    const driver = users.find(u => u.email === driverId || u._id === driverId);

                    if (orderIdx !== -1 && driver) {
                        orders[orderIdx].driverEmail = driver.email;
                        orders[orderIdx].driverName = driver.name;
                        orders[orderIdx].status = 'assigned';
                        localStorage.setItem('pm_orders', JSON.stringify(orders));
                        return { success: true, data: orders[orderIdx] };
                    }
                    throw new Error('Order or Driver not found');
                });
            }

            const response = await fetch(`${API_BASE_URL}/orders/${orderId}/assign`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ driverId })
            });
            return handleResponse(response);
        },

        getAnalytics: async () => {
            if (USE_SIMULATED_BACKEND) {
                return simulateApiCall(() => {
                    const orders = JSON.parse(localStorage.getItem('pm_orders') || '[]');
                    const users = JSON.parse(localStorage.getItem('pm_users') || '[]');
                    const driversCount = users.filter(u => u.role === 'driver' && u.isOnline).length;
                    const totalRevenue = orders.reduce((sum, o) => sum + o.price, 0);

                    return {
                        success: true,
                        data: {
                            stats: {
                                totalOrders: orders.length,
                                activeDrivers: driversCount,
                                totalRevenue
                            },
                            orders
                        }
                    };
                });
            }

            const response = await fetch(`${API_BASE_URL}/orders/analytics`, {
                method: 'GET',
                headers: getHeaders()
            });
            return handleResponse(response);
        }
    }
};

// Response processor
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }
    return data;
};

// Simulates network latency (200ms) for mock testing
const simulateApiCall = (callback) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                resolve(callback());
            } catch (err) {
                reject(err);
            }
        }, 200);
    });
};
