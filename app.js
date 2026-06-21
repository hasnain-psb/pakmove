// PakMove - Live API Connected Frontend Controller Logic

const API_BASE_URL = 'http://localhost:5000/api';

// 1. Session Storage Helpers
const db = {
    getCurrentUser: () => JSON.parse(sessionStorage.getItem('pm_current_user')),
    setCurrentUser: (user) => sessionStorage.setItem('pm_current_user', JSON.stringify(user)),
    clearSession: () => {
        sessionStorage.removeItem('pm_current_user');
        sessionStorage.removeItem('pm_token');
    }
};

// Global Request Wrapper
async function request(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    const token = sessionStorage.getItem('pm_token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const config = {
        method,
        headers
    };
    if (body) {
        config.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || 'API request failed');
    }
    return result;
}

// 2. Application State Variables
let currentUser = null;
let activeTrackingOrder = null;
let activePaymentMethod = 'wallet'; // 'wallet' or 'card'
let tempBookingData = null; // Stores booking fields while payment modal is authorized

// Cache list of online drivers and sub-admins fetched from backend
let cachedDriversList = [];
let cachedAdminsList = [];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    currentUser = db.getCurrentUser();
    setupNavigation();
    setupForms();
    setupFareCalculator();
    setupAdminPortalRouting();
    renderApp();
});

// Toast Notifications Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb';
    toast.innerHTML = `
        <span style="font-size: 1.2rem;">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        <div>${message}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 3. Navigation Controller
function setupNavigation() {
    // Nav Click Listeners
    document.getElementById('loginNavBtn')?.addEventListener('click', () => openModal('loginModal'));
    document.getElementById('signupNavBtn')?.addEventListener('click', () => openModal('signupModal'));
    document.getElementById('logoutNavBtn')?.addEventListener('click', logout);
    document.getElementById('logoutSidebarBtn')?.addEventListener('click', logout);

    // Modal Close Buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.closest('.modal-overlay').id;
            closeModal(modalId);
        });
    });

    // Close on click outside
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });

    // Switch Modal Links
    document.getElementById('toSignupLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('loginModal');
        openModal('signupModal');
    });

    document.getElementById('toLoginLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('signupModal');
        openModal('loginModal');
    });

    // Navbar Smooth Scrolling
    document.querySelectorAll('.navbar .nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.navbar .nav-links a').forEach(a => a.classList.remove('active'));
            e.currentTarget.classList.add('active');

            const targetId = e.currentTarget.getAttribute('href');
            if (targetId.startsWith('#')) {
                e.preventDefault();
                switchView('landing');
                const element = document.querySelector(targetId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Hero CTAs
    document.getElementById('heroBookBtn')?.addEventListener('click', () => {
        if (currentUser && currentUser.role === 'customer') {
            switchView('customer-portal');
        } else {
            openModal('loginModal');
            showToast('Please login as Customer to book shipments', 'info');
        }
    });

    document.getElementById('heroTrackBtn')?.addEventListener('click', () => {
        if (currentUser && currentUser.role === 'customer') {
            switchView('customer-portal');
        } else {
            openModal('loginModal');
            showToast('Please login as Customer to view active tracking', 'info');
        }
    });

    // Pricing Tier Buttons
    document.querySelectorAll('.pricing-book-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const vehicles = ['bike', 'rickshaw', 'truck'];
            const selectedVehicle = vehicles[index];

            if (currentUser && currentUser.role === 'customer') {
                switchView('customer-portal');
                const selectElement = document.getElementById('bookingVehicleType');
                if (selectElement) {
                    selectElement.value = selectedVehicle;
                    calculateEstimatedFare();
                }
                document.getElementById('pickupAddress').focus();
            } else {
                openModal('loginModal');
                showToast('Please login as a Customer to select pricing tiers', 'info');
            }
        });
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function switchView(viewId) {
    document.getElementById('landingView').style.display = 'none';
    document.getElementById('customerPortal').style.display = 'none';
    document.getElementById('driverPortal').style.display = 'none';
    document.getElementById('adminPortal').style.display = 'none';

    // Toggle landing footer display based on view (hide in dashboards)
    const footer = document.querySelector('.footer');
    if (footer) {
        if (viewId === 'landing') {
            footer.style.display = 'block';
        } else {
            footer.style.display = 'none';
        }
    }

    if (viewId === 'landing') {
        document.getElementById('landingView').style.display = 'block';
    } else if (viewId === 'customer-portal') {
        document.getElementById('customerPortal').style.display = 'flex';
        renderCustomerPortal();
    } else if (viewId === 'driver-portal') {
        document.getElementById('driverPortal').style.display = 'flex';
        renderDriverPortal();
    } else if (viewId === 'admin-portal') {
        document.getElementById('adminPortal').style.display = 'flex';
        switchAdminPortalTab('dashboard');
    }
}

// 4. Admin Portal Tab Routing
function setupAdminPortalRouting() {
    document.getElementById('adminDashboardLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchAdminPortalTab('dashboard');
    });

    document.getElementById('adminManageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchAdminPortalTab('manage');
    });
}

async function switchAdminPortalTab(tab) {
    const dashLink = document.getElementById('adminDashboardLink');
    const manageLink = document.getElementById('adminManageLink');
    const dashSection = document.getElementById('adminDashboardSection');
    const manageSection = document.getElementById('adminManageSection');

    if (tab === 'dashboard') {
        dashLink.classList.add('active');
        manageLink.classList.remove('active');
        dashSection.classList.add('active');
        manageSection.classList.remove('active');
        await renderAdminPortal();
    } else if (tab === 'manage') {
        dashLink.classList.remove('active');
        manageLink.classList.add('active');
        dashSection.classList.remove('active');
        manageSection.classList.add('active');
        await renderAdminPortal(); // Fetch data first
        renderAdminManageAdmins(); // Render second using fetched cached data
    }
}

// 5. Dynamic Live Fare Calculator
function setupFareCalculator() {
    const weightInput = document.getElementById('packageWeight');
    const vehicleSelect = document.getElementById('bookingVehicleType');

    weightInput?.addEventListener('input', calculateEstimatedFare);
    vehicleSelect?.addEventListener('change', calculateEstimatedFare);
}

function calculateEstimatedFare() {
    const weightInput = document.getElementById('packageWeight');
    const vehicleSelect = document.getElementById('bookingVehicleType');
    const fareDisplay = document.getElementById('bookingEstimatedFare');

    if (!weightInput || !vehicleSelect || !fareDisplay) return;

    const weight = parseFloat(weightInput.value) || 0;
    const vehicle = vehicleSelect.value;

    let base = 150;
    let multiplier = 50;

    if (vehicle === 'rickshaw') {
        base = 350;
        multiplier = 80;
    } else if (vehicle === 'truck') {
        base = 800;
        multiplier = 150;
    }

    const calculatedPrice = Math.round(base + (weight * multiplier));
    fareDisplay.textContent = `Rs. ${calculatedPrice.toLocaleString()}`;
}

// 6. Upfront Payment Selection Controller
window.switchPaymentMethod = function(method) {
    activePaymentMethod = method;
    const tabWallet = document.querySelector('.payment-tab-btn:nth-child(1)');
    const tabCard = document.querySelector('.payment-tab-btn:nth-child(2)');
    const panelWallet = document.getElementById('panel-wallet');
    const panelCard = document.getElementById('panel-card');

    if (method === 'wallet') {
        tabWallet.classList.add('active');
        tabCard.classList.remove('active');
        panelWallet.classList.add('active');
        panelCard.classList.remove('active');
    } else if (method === 'card') {
        tabWallet.classList.remove('active');
        tabCard.classList.add('active');
        panelWallet.classList.remove('active');
        panelCard.classList.add('active');
    }
};

// 7. Form Operations (Auth, Inquiries, Bookings, Sub-Admins)
function setupForms() {
    // 7.1 Contact Us form (Static mock inquiry logger)
    document.getElementById('contactForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const subject = document.getElementById('contactSubject').value.trim();
        const message = document.getElementById('contactMessage').value.trim();

        const inquiries = JSON.parse(localStorage.getItem('pm_inquiries') || '[]');
        inquiries.push({ name, email, subject, message, date: new Date().toISOString() });
        localStorage.setItem('pm_inquiries', JSON.stringify(inquiries));

        showToast('Inquiry submitted! We will respond shortly.', 'info');
        document.getElementById('contactForm').reset();
    });

    // 7.2 Sign-In Form (Connected to API)
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        try {
            const result = await request('/auth/login', 'POST', { email, password });
            const user = result.data;
            
            db.setCurrentUser(user);
            sessionStorage.setItem('pm_token', user.token);
            currentUser = user;
            
            closeModal('loginModal');
            showToast(`Welcome back, ${user.name}!`);
            
            if (user.role === 'customer') switchView('customer-portal');
            else if (user.role === 'driver') switchView('driver-portal');
            else if (user.role === 'admin') switchView('admin-portal');
            
            renderApp();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // 7.3 Public Registration Form (Connected to API)
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const role = document.getElementById('regRole').value;

        try {
            const result = await request('/auth/register', 'POST', { name, email, password, role });
            const user = result.data;
            
            db.setCurrentUser(user);
            sessionStorage.setItem('pm_token', user.token);
            currentUser = user;
            
            closeModal('signupModal');
            showToast('Registration successful!');

            if (role === 'customer') switchView('customer-portal');
            else if (role === 'driver') switchView('driver-portal');

            renderApp();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // 7.4 Booking Form (Connects to Payment Modal)
    document.getElementById('newBookingForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser || currentUser.role !== 'customer') {
            showToast('Only customers can book deliveries', 'error');
            return;
        }

        const pickupAddress = document.getElementById('pickupAddress').value.trim();
        const dropAddress = document.getElementById('dropoffAddress').value.trim();
        const packageType = document.getElementById('packageType').value;
        const vehicleType = document.getElementById('bookingVehicleType').value;
        const weight = parseFloat(document.getElementById('packageWeight').value);
        const contactNumber = document.getElementById('contactNumber').value.trim();

        let base = 150;
        let multiplier = 50;
        let vehicleLabel = "Bike Delivery";

        if (vehicleType === 'rickshaw') {
            base = 350;
            multiplier = 80;
            vehicleLabel = "Rickshaw Cargo";
        } else if (vehicleType === 'truck') {
            base = 800;
            multiplier = 150;
            vehicleLabel = "Loader Truck";
        }
        const price = Math.round(base + (weight * multiplier));

        tempBookingData = {
            pickupAddress,
            dropAddress,
            packageType,
            vehicleType,
            weight: weight.toString(),
            contactNumber,
            price
        };

        document.getElementById('payModalVehicle').textContent = vehicleLabel;
        document.getElementById('payModalWeight').textContent = `${weight} kg`;
        document.getElementById('payModalFare').textContent = `Rs. ${price.toLocaleString()}`;

        document.getElementById('walletNumber').value = '';
        document.getElementById('cardNumber').value = '';
        document.getElementById('cardExpiry').value = '';
        document.getElementById('cardCvv').value = '';
        document.getElementById('cardHolderName').value = '';
        
        switchPaymentMethod('wallet');
        openModal('paymentModal');
    });

    // 7.5 Payment Modal Form Submit (Creates Live Booking in MongoDB)
    document.getElementById('paymentModalForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!tempBookingData) return;

        if (activePaymentMethod === 'wallet') {
            const walletNum = document.getElementById('walletNumber').value.trim();
            if (walletNum.length !== 11) {
                showToast('Please enter a valid 11-digit wallet number', 'error');
                return;
            }
        } else {
            const cardNum = document.getElementById('cardNumber').value.trim();
            const cardExpiry = document.getElementById('cardExpiry').value.trim();
            const cardCvv = document.getElementById('cardCvv').value.trim();
            const cardHolder = document.getElementById('cardHolderName').value.trim();

            if (!cardNum || !cardExpiry || !cardCvv || !cardHolder) {
                showToast('Please complete all card details fields', 'error');
                return;
            }
        }

        const loader = document.getElementById('paymentLoaderOverlay');
        loader.classList.add('active');

        try {
            const txnId = `TXN-${Math.floor(100000000 + Math.random() * 900000000)}`;
            const payMethod = activePaymentMethod === 'wallet' ? 
                document.getElementById('walletProvider').value.toUpperCase() : 'CARD';

            const orderPayload = {
                pickupAddress: tempBookingData.pickupAddress,
                dropAddress: tempBookingData.dropAddress,
                packageType: tempBookingData.packageType,
                vehicleType: tempBookingData.vehicleType,
                weight: tempBookingData.weight,
                contactNumber: tempBookingData.contactNumber,
                paymentMethod: payMethod,
                transactionId: txnId
            };

            const result = await request('/orders', 'POST', orderPayload);
            
            loader.classList.remove('active');
            closeModal('paymentModal');
            showToast(`Transaction ${txnId} Approved! Shipment Placed.`);
            
            tempBookingData = null;
            activeTrackingOrder = result.data;

            document.getElementById('newBookingForm').reset();
            calculateEstimatedFare();
            renderCustomerPortal();
        } catch (error) {
            loader.classList.remove('active');
            showToast(error.message, 'error');
        }
    });

    // 7.6 Create Sub-Admin Account Form (Connected to API)
    document.getElementById('createAdminForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('adminName').value.trim();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        try {
            await request('/auth/register-admin', 'POST', { name, email, password });
            showToast(`Sub-Admin ${name} registered successfully!`);
            document.getElementById('createAdminForm').reset();
            
            await switchAdminPortalTab('manage');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

function logout() {
    db.clearSession();
    currentUser = null;
    activeTrackingOrder = null;
    showToast('Logged out successfully');
    switchView('landing');
    renderApp();
}

// 8. Dynamic Views Rendering
function renderApp() {
    const authBox = document.getElementById('navAuthBox');
    if (currentUser) {
        document.querySelectorAll('.profile-name').forEach(el => el.textContent = currentUser.name);
        document.querySelectorAll('.profile-role').forEach(el => el.textContent = currentUser.role);
        document.querySelectorAll('.profile-avatar').forEach(el => {
            el.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        });

        let roleBadge = '';
        if (currentUser.role === 'driver') {
            roleBadge = `<span class="badge driver-badge mr-2">Driver</span>`;
        } else if (currentUser.role === 'admin') {
            const isSuper = currentUser.email === 'admin@pakmove.com';
            roleBadge = `<span class="badge badge-assigned mr-2">${isSuper ? 'Super Admin' : 'Sub-Admin'}</span>`;
        }
        
        authBox.innerHTML = `
            <div style="display:flex; align-items:center; gap: 1rem;">
                ${roleBadge}
                <button class="btn btn-primary" onclick="switchView('${currentUser.role}-portal')">My Dashboard</button>
                <button class="btn btn-outline" id="navLogoutBtn">Logout</button>
            </div>
        `;
        document.getElementById('navLogoutBtn').addEventListener('click', logout);
    } else {
        authBox.innerHTML = `
            <button class="btn btn-outline" id="loginNavBtn2">Login</button>
            <button class="btn btn-accent" id="signupNavBtn2">Book Delivery</button>
        `;
        document.getElementById('loginNavBtn2').addEventListener('click', () => openModal('loginModal'));
        document.getElementById('signupNavBtn2').addEventListener('click', () => openModal('signupModal'));
    }
}

// 8.1 Customer Dashboard Portal Rendering
async function renderCustomerPortal() {
    const bookingsList = document.getElementById('customerBookingsList');
    bookingsList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 1.5rem;">Syncing shipments...</p>';
    
    try {
        const result = await request('/orders/my-orders');
        const orders = result.data || [];
        
        bookingsList.innerHTML = '';
        
        if (orders.length === 0) {
            bookingsList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 2rem;">No bookings found. Create your first delivery booking!</p>';
            renderTimeline(null);
            return;
        }

        // Default tracking view mapping
        if (!activeTrackingOrder) {
            activeTrackingOrder = orders[0];
        } else {
            const freshOrder = orders.find(o => o._id === activeTrackingOrder._id || o.id === activeTrackingOrder.id);
            activeTrackingOrder = freshOrder || orders[0];
        }

        orders.forEach(order => {
            const item = document.createElement('div');
            const isActive = activeTrackingOrder && (activeTrackingOrder._id === order._id || activeTrackingOrder.id === order.id);
            
            item.style.padding = '1rem';
            item.style.borderBottom = '1px solid var(--border)';
            item.style.cursor = 'pointer';
            item.style.backgroundColor = isActive ? 'rgba(16, 185, 129, 0.05)' : 'transparent';
            item.style.transition = 'var(--transition)';
            item.style.borderLeft = isActive ? '4px solid var(--accent)' : '4px solid transparent';
            
            let statusLabelText = order.status;
            if (order.status === 'paid_pending') statusLabelText = 'Paid & Pending';

            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                    <span style="font-weight:700; color:var(--primary);">${order.id || order._id.substring(0, 7).toUpperCase()}</span>
                    <span class="badge badge-${order.status.replace('_', '-')}">${statusLabelText}</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); display:flex; justify-content:space-between;">
                    <span>To: ${order.dropAddress.split(',')[0]}</span>
                    <span>Rs. ${order.price}</span>
                </div>
            `;

            item.addEventListener('click', () => {
                activeTrackingOrder = order;
                renderCustomerPortal();
            });

            bookingsList.appendChild(item);
        });

        renderTimeline(activeTrackingOrder);
    } catch (error) {
        bookingsList.innerHTML = `<p style="color:red; text-align:center; padding: 1.5rem;">Error loading orders: ${error.message}</p>`;
    }
}

function renderTimeline(order) {
    const trackingWrapper = document.getElementById('trackingProgressView');
    if (!order) {
        trackingWrapper.innerHTML = `
            <div style="text-align:center; color:var(--text-muted); padding:3rem 0;">
                <span style="font-size:3rem; display:block; margin-bottom:1rem;">📦</span>
                Select a booking to view active tracking status
            </div>
        `;
        return;
    }

    const steps = [
        { status: 'paid_pending', label: 'Paid & Pending', desc: 'Upfront payment verified. Booking approved.' },
        { status: 'assigned', label: 'Driver Assigned', desc: 'Delivery partner assigned and packaging.' },
        { status: 'transit', label: 'In-Transit', desc: 'Package is moving towards destination.' },
        { status: 'delivered', label: 'Delivered', desc: 'Delivered successfully and signed.' }
    ];

    let currentStepIndex = steps.findIndex(s => s.status === order.status);
    
    let driverInfoHtml = '';
    if (order.driverName) {
        driverInfoHtml = `
            <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-main); border-radius: var(--radius); border: 1px solid var(--border); display: flex; align-items: center; gap: 0.75rem;">
                <div class="profile-avatar" style="width:2rem; height:2rem; font-size:0.8rem;">${order.driverName.split(' ').map(n=>n[0]).join('')}</div>
                <div>
                    <h5 style="font-size:0.85rem; font-weight:600; color:var(--primary);">${order.driverName}</h5>
                    <p style="font-size:0.75rem; color:var(--text-muted);">Assigned Courier Partner</p>
                </div>
            </div>
        `;
    }

    let statusLabelText = order.status;
    if (order.status === 'paid_pending') statusLabelText = 'Paid & Pending';

    let timelineHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
            <div>
                <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--primary);">${order.id || order._id.substring(0, 7).toUpperCase()}</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); text-transform:capitalize;">Package: ${order.packageType} (${order.weight} kg) via ${order.vehicleType}</p>
            </div>
            <span class="badge badge-${order.status.replace('_', '-')}" style="font-size: 0.85rem; padding: 0.4rem 1rem;">${statusLabelText}</span>
        </div>
        <div class="timeline">
    `;

    steps.forEach((step, idx) => {
        let stepClass = '';
        if (idx < currentStepIndex) {
            stepClass = 'completed';
        } else if (idx === currentStepIndex) {
            stepClass = 'active';
        }

        timelineHtml += `
            <div class="timeline-step ${stepClass}">
                <div class="timeline-icon">
                    ${idx < currentStepIndex ? '✓' : idx === currentStepIndex ? '●' : ''}
                </div>
                <div class="timeline-content">
                    <h4>${step.label}</h4>
                    <p>${step.desc}</p>
                </div>
            </div>
        `;
    });

    timelineHtml += `
        </div>
        ${driverInfoHtml}
        <div style="margin-top:1.5rem; font-size:0.85rem; color:var(--text-muted); border-top:1px solid var(--border); padding-top:1rem; line-height:1.6;">
            <p><strong>From:</strong> ${order.pickupAddress}</p>
            <p><strong>To:</strong> ${order.dropAddress}</p>
            <p><strong>Recipient Contact:</strong> ${order.contactNumber}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.75rem; border-top:1px dashed var(--border); padding-top:0.5rem;">
                <div style="font-size:0.75rem;">
                    <strong>Txn ID:</strong> ${order.transactionId || 'N/A'}<br>
                    <strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}
                </div>
                <span style="font-weight:700; color:var(--primary); font-size:1.05rem;">Paid: Rs. ${order.price}</span>
            </div>
        </div>
    `;

    trackingWrapper.innerHTML = timelineHtml;
}

// 8.2 Driver Dashboard Portal Rendering
async function renderDriverPortal() {
    const tasksList = document.getElementById('driverTasksList');
    tasksList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 1.5rem;">Syncing driver tasks...</p>';

    // Online switch configuration
    const onlineCheckbox = document.getElementById('driverOnlineStatus');
    if (onlineCheckbox) {
        onlineCheckbox.checked = currentUser.isOnline !== false;
    }

    onlineCheckbox?.replaceWith(onlineCheckbox.cloneNode(true));
    document.getElementById('driverOnlineStatus').addEventListener('change', async (e) => {
        try {
            const result = await request('/auth/driver-status', 'PUT', { isOnline: e.target.checked });
            currentUser.isOnline = result.data.isOnline;
            db.setCurrentUser(currentUser);
            showToast(currentUser.isOnline ? "You are now Online" : "You are now Offline", "info");
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    try {
        const result = await request('/orders/driver-tasks');
        const orders = result.data || [];
        
        tasksList.innerHTML = '';
        const activeTasks = orders.filter(o => o.status !== 'delivered');

        if (activeTasks.length === 0) {
            tasksList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 2rem;">No active deliveries assigned. Enjoy your day!</p>';
            return;
        }

        activeTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'driver-task-card';

            let actionsHtml = '';
            if (task.status === 'assigned') {
                actionsHtml = `
                    <button class="btn btn-accent" onclick="updateOrderStatus('${task._id || task.id}', 'transit')">Start Journey (In-Transit)</button>
                `;
            } else if (task.status === 'transit') {
                actionsHtml = `
                    <button class="btn btn-accent" style="background-color:#10b981;" onclick="updateOrderStatus('${task._id || task.id}', 'delivered')">Mark Delivered</button>
                `;
            }

            card.innerHTML = `
                <div class="driver-task-header">
                    <span style="font-weight:700; color:var(--primary);">${task.id || task._id.substring(0, 7).toUpperCase()}</span>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <span class="badge" style="background-color:#10b981; color:#ffffff; font-size:0.75rem;">Paid Upfront</span>
                        <span class="badge badge-${task.status}">${task.status}</span>
                    </div>
                </div>
                <div class="driver-task-body">
                    <div class="driver-task-info">
                        <p>Pickup Location</p>
                        <strong>${task.pickupAddress}</strong>
                    </div>
                    <div class="driver-task-info">
                        <p>Drop-off Location</p>
                        <strong>${task.dropAddress}</strong>
                    </div>
                    <div class="driver-task-info">
                        <p>Recipient Contact</p>
                        <strong>${task.contactNumber}</strong>
                    </div>
                    <div class="driver-task-info">
                        <p>Package Details</p>
                        <strong style="text-transform:capitalize;">${task.packageType} (${task.weight} kg) via ${task.vehicleType}</strong>
                    </div>
                </div>
                <div class="driver-task-actions">
                    ${actionsHtml}
                </div>
            `;

            tasksList.appendChild(card);
        });
    } catch (error) {
        tasksList.innerHTML = `<p style="color:red; text-align:center; padding: 1.5rem;">Error loading tasks: ${error.message}</p>`;
    }
}

window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        await request(`/orders/${orderId}/status`, 'PUT', { status: newStatus });
        showToast(`Order status updated to ${newStatus}`);
        renderDriverPortal();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// 8.3 Admin Intelligence Portal (Shipment Board Tab)
async function renderAdminPortal() {
    try {
        const result = await request('/orders/analytics');
        const { stats, orders, drivers, admins } = result.data;
        
        cachedDriversList = drivers || [];
        cachedAdminsList = admins || [];

        document.getElementById('adminTotalOrders').textContent = stats.totalOrders;
        document.getElementById('adminActiveDrivers').textContent = stats.activeDrivers;
        document.getElementById('adminTotalRevenue').textContent = `Rs. ${stats.totalRevenue.toLocaleString()}`;

        const tableBody = document.getElementById('adminOrdersTableBody');
        tableBody.innerHTML = '';

        orders.forEach(order => {
            const tr = document.createElement('tr');

            let driverAction = '';
            if (order.status === 'paid_pending') {
                let driverOptions = `<option value="">-- Assign Courier --</option>`;
                cachedDriversList.forEach(d => {
                    driverOptions += `<option value="${d._id}">${d.name}</option>`;
                });

                driverAction = `
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <select class="select-control" id="assign-select-${order._id || order.id}">
                            ${driverOptions}
                        </select>
                        <button class="btn btn-accent btn-sm" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="assignDriver('${order._id || order.id}')">Assign</button>
                    </div>
                `;
            } else {
                driverAction = `<span style="font-size:0.9rem; color:var(--text-muted); font-weight:500;">${order.driverName || 'Not Assigned'}</span>`;
            }

            let statusLabelText = order.status;
            if (order.status === 'paid_pending') statusLabelText = 'Paid & Pending';

            tr.innerHTML = `
                <td style="font-weight:700; color:var(--primary);">${order.id || order._id.substring(0, 7).toUpperCase()}</td>
                <td>
                    <div style="font-weight:500;">${order.customerName}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${order.customerEmail}</div>
                </td>
                <td>
                    <div style="max-width:180px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-size:0.85rem;" title="${order.pickupAddress}">
                        <strong>From:</strong> ${order.pickupAddress.split(',')[0]}
                    </div>
                    <div style="max-width:180px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-size:0.85rem;" title="${order.dropAddress}">
                        <strong>To:</strong> ${order.dropAddress.split(',')[0]}
                    </div>
                </td>
                <td><span class="badge badge-${order.status.replace('_', '-')}">${statusLabelText}</span></td>
                <td>
                    <div style="font-weight:700;">Rs. ${order.price}</div>
                    <span class="badge" style="background-color:#10b981; color:#ffffff; font-size:0.7rem; margin-top:0.25rem; font-weight:bold;">Paid Upfront</span>
                </td>
                <td>${driverAction}</td>
            `;

            tableBody.appendChild(tr);
        });
    } catch (error) {
        showToast(`Error fetching analytics: ${error.message}`, 'error');
    }
}

window.assignDriver = async function(orderId) {
    const select = document.getElementById(`assign-select-${orderId}`);
    const driverId = select.value;

    if (!driverId) {
        showToast('Please select a driver to assign', 'error');
        return;
    }

    try {
        await request(`/orders/${orderId}/assign`, 'PUT', { driverId });
        showToast(`Driver assigned successfully`);
        renderAdminPortal();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// 8.4 Admin Portal (Manage Admins Tab Rendering)
function renderAdminManageAdmins() {
    const tableBody = document.getElementById('adminUsersTableBody');
    tableBody.innerHTML = '';

    cachedAdminsList.forEach(admin => {
        const tr = document.createElement('tr');
        const isSuper = admin.email === 'admin@pakmove.com';

        tr.innerHTML = `
            <td style="font-weight:600; color:var(--primary);">${admin.name}</td>
            <td style="font-size:0.9rem; color:var(--text-muted);">${admin.email}</td>
            <td>
                <span class="badge" style="background-color: ${isSuper ? 'var(--primary)' : 'var(--accent)'}; color:#ffffff;">
                    ${isSuper ? 'Super Admin' : 'Sub-Admin'}
                </span>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}
