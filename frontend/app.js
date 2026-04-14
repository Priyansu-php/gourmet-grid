const API_URL = 'http://localhost:3000/api';
let currentCart = [];
let currentRestaurantId = null;
let allRestaurants = [];

// Auth Check Helper
function initApp() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    const navDashboard = document.getElementById('nav-dashboard');

    if (user && token) {
        if (navLogin) navLogin.style.display = 'none';
        if (navLogout) navLogout.style.display = 'inline-block';
        if (navDashboard) navDashboard.style.display = 'inline-block';
    } else {
        if (navLogin) navLogin.style.display = 'inline-block';
        if (navLogout) navLogout.style.display = 'none';
        if (navDashboard) navDashboard.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// Fetch and display restaurants
async function fetchRestaurants(cuisine = null) {
    const listEl = document.getElementById('restaurant-list');
    if (!listEl) return;

    try {
        const res = await fetch(`${API_URL}/restaurants`);
        let restaurants = await res.json();

        if (!Array.isArray(restaurants)) {
            restaurants = [];
        }

        allRestaurants = restaurants;

        if (cuisine) {
            const cuisineFilter = document.getElementById('cuisine-filter');
            if (cuisineFilter) cuisineFilter.value = cuisine;
        }

        applyRestaurantFilters();

    } catch (err) {
        console.error(err);
        listEl.innerHTML = '<p>Error loading restaurants. Is the backend running?</p>';
    }
}

function applyRestaurantFilters() {
    const listEl = document.getElementById('restaurant-list');
    if (!listEl) return;

    const searchInput = document.getElementById('search-input');
    const cuisineFilter = document.getElementById('cuisine-filter');
    const ratingFilter = document.getElementById('rating-filter');
    const availabilityFilter = document.getElementById('availability-filter');

    const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const cuisineValue = cuisineFilter ? cuisineFilter.value : '';
    const ratingValue = ratingFilter ? ratingFilter.value : '';
    const availabilityValue = availabilityFilter ? availabilityFilter.value : '';

    let filteredRestaurants = [...allRestaurants];

    if (searchValue) {
        filteredRestaurants = filteredRestaurants.filter(r =>
            (r.name && r.name.toLowerCase().includes(searchValue)) ||
            (r.cuisine_type && r.cuisine_type.toLowerCase().includes(searchValue))
        );
    }

    if (cuisineValue) {
        filteredRestaurants = filteredRestaurants.filter(r => r.cuisine_type === cuisineValue);
    }

    if (ratingValue) {
        filteredRestaurants = filteredRestaurants.filter(r => parseFloat(r.rating || 0) >= parseFloat(ratingValue));
    }

    if (availabilityValue === 'open') {
        filteredRestaurants = filteredRestaurants.filter(r => Number(r.is_open) === 1 || r.is_open === true);
    }

    if (availabilityValue === 'closed') {
        filteredRestaurants = filteredRestaurants.filter(r => !(Number(r.is_open) === 1 || r.is_open === true));
    }

    renderRestaurants(filteredRestaurants);
}

function resetRestaurantFilters() {
    const searchInput = document.getElementById('search-input');
    const cuisineFilter = document.getElementById('cuisine-filter');
    const ratingFilter = document.getElementById('rating-filter');
    const availabilityFilter = document.getElementById('availability-filter');

    if (searchInput) searchInput.value = '';
    if (cuisineFilter) cuisineFilter.value = '';
    if (ratingFilter) ratingFilter.value = '';
    if (availabilityFilter) availabilityFilter.value = '';

    renderRestaurants(allRestaurants);
}

function renderRestaurants(restaurants) {
    const listEl = document.getElementById('restaurant-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!restaurants || restaurants.length === 0) {
        listEl.innerHTML = '<p>No restaurants found for the selected filters.</p>';
        return;
    }

    restaurants.forEach(r => {
        const isOpen = Number(r.is_open) === 1 || r.is_open === true;

        const card = document.createElement('div');
        card.className = 'glass-card';

        card.innerHTML = `
            <h3>${r.name}</h3>

            <div class="restaurant-meta">
                <span>${r.cuisine_type || 'Cuisine not available'}</span>
                <span>⭐ ${r.rating || '4.0'}</span>
                <span class="availability-badge ${isOpen ? 'open-badge' : 'closed-badge'}">
                    ${isOpen ? 'Open' : 'Closed'}
                </span>
            </div>

            <p>${r.location || 'Premium delivery available in your area.'}</p>

            <div class="restaurant-actions">
                <button class="btn btn-secondary" onclick="viewMenu(${r.id}, '${(r.name || '').replace(/'/g, "\\'")}')">
                    View Menu
                </button>
            </div>
        `;

        listEl.appendChild(card);
    });
}

// Open modal and load menu
async function viewMenu(restaurantId, restName) {
    currentRestaurantId = restaurantId;
    currentCart = [];
    updateCartUI();

    const user = JSON.parse(localStorage.getItem('user'));

    const modalTitle = document.getElementById('modal-rest-name');
    const menuEl = document.getElementById('menu-list');
    const modal = document.getElementById('menu-modal');
    const cartSection = document.getElementById('cart-section');

    if (modalTitle) modalTitle.innerText = `${restName} Menu`;
    if (menuEl) menuEl.innerHTML = '<p class="loading-skeleton">Loading...</p>';
    if (modal) modal.style.display = 'flex';
    if (cartSection) cartSection.style.display = 'block';

    try {
        const res = await fetch(`${API_URL}/restaurants/${restaurantId}`);
        const data = await res.json();

        menuEl.innerHTML = '';

        // =============================
        // MENU ITEMS
        // =============================
        if (data.menu && data.menu.length > 0) {
            data.menu.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'menu-item';

                itemEl.innerHTML = `
                    <div class="menu-item-info">
                        <h4>${item.name}</h4>
                        <span class="menu-item-price">₹${item.price}</span>
                        <p style="font-size:0.85em; color:var(--text-secondary);">${item.description || ''}</p>
                    </div>
                    <button class="btn btn-secondary"
                        onclick="addToCart(${item.id}, '${item.name}', ${item.price})">
                        Add
                    </button>
                `;

                menuEl.appendChild(itemEl);
            });
        }

        // =============================
        // REVIEWS SECTION
        // =============================
        let reviewsHtml = `<h3 style="margin-top:2rem;">Customer Reviews</h3>`;

        if (data.reviews && data.reviews.length > 0) {
            data.reviews.forEach(r => {
                reviewsHtml += `
                    <div class="glass-card" style="margin-top:0.5rem;">
                        <strong>${r.name}</strong> ⭐ ${r.rating}/5
                        <p>${r.comment || ""}</p>
                    </div>
                `;
            });
        } else {
            reviewsHtml += `<p>No reviews yet.</p>`;
        }

        // =============================
        // ADD REVIEW FORM
        // =============================
        if (user) {
            reviewsHtml += `
                <div class="glass-card" style="margin-top:1rem;">
                    <h4>Add Review</h4>

                    <select id="review-rating" style="margin-bottom:10px;">
                        <option value="">Select Rating</option>
                        <option value="5">5 ⭐</option>
                        <option value="4">4 ⭐</option>
                        <option value="3">3 ⭐</option>
                        <option value="2">2 ⭐</option>
                        <option value="1">1 ⭐</option>
                    </select>

                    <textarea id="review-comment"
                        placeholder="Write your review..."
                        style="width:100%; margin-bottom:10px;"></textarea>

                    <button class="btn btn-primary"
                        onclick="submitReview(${restaurantId})">
                        Submit Review
                    </button>
                </div>
            `;
        }

        menuEl.innerHTML += reviewsHtml;

    } catch (err) {
        console.error(err);
        menuEl.innerHTML = '<p>Error loading data.</p>';
    }
}

function closeModal() {
    const modal = document.getElementById('menu-modal');
    if (modal) modal.style.display = 'none';
}

// Cart logic
function addToCart(id, name, price) {
    const existing = currentCart.find(i => i.menu_item_id === id);

    if (existing) {
        existing.quantity += 1;
    } else {
        currentCart.push({
            menu_item_id: id,
            name,
            price,
            quantity: 1
        });
    }

    updateCartUI();
}

function removeFromCart(id) {
    currentCart = currentCart.filter(i => i.menu_item_id !== id);
    updateCartUI();
}

function updateCartUI() {
    const cartEl = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total-price');
    if (!cartEl) return;

    cartEl.innerHTML = '';
    let total = 0;

    currentCart.forEach(item => {
        total += item.price * item.quantity;
        cartEl.innerHTML += `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                <span>${item.quantity}x ${item.name}</span>
                <span>₹${(item.price * item.quantity).toFixed(2)} 
                    <button onclick="removeFromCart(${item.menu_item_id})" style="background:transparent; border:none; cursor:pointer; color:red; font-weight:bold; margin-left: 0.5rem;" title="Remove this item">✕</button>
                </span>
            </div>
        `;
    });

    if (totalEl) totalEl.innerText = total.toFixed(2);
}

// Redirect to Checkout Page
function goToCheckout() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token) {
        alert("Please log in to checkout.");
        window.location.href = 'login.html';
        return;
    }

    if (currentCart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    localStorage.setItem('cart', JSON.stringify(currentCart));
    localStorage.setItem('currentRestaurantId', currentRestaurantId);

    window.location.href = 'checkout.html';
}

// =============================
// ADDRESS FUNCTIONS
// =============================

async function loadAddresses() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const list = document.getElementById("address-list");
    if (!list) return;

    list.innerHTML = "Loading addresses...";

    try {
        const res = await fetch(`${API_URL}/addresses/user/${user.id}`);
        const addresses = await res.json();

        list.innerHTML = "";

        if (!Array.isArray(addresses) || addresses.length === 0) {
            list.innerHTML = "<p>No saved addresses.</p>";
            return;
        }

        addresses.forEach(a => {
            const div = document.createElement("div");
            div.className = "glass-card";
            div.innerHTML = `
                <p>
                    ${a.address_line}<br>
                    ${a.city}, ${a.state} - ${a.pincode}
                </p>
            `;
            list.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        list.innerHTML = "<p style='color:red'>Failed to load addresses</p>";
    }
}

async function addAddress() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const addressLineEl = document.getElementById("address_line");
    const cityEl = document.getElementById("city");
    const stateEl = document.getElementById("state");
    const pincodeEl = document.getElementById("pincode");

    if (!addressLineEl || !cityEl || !stateEl || !pincodeEl) {
        alert("Address form not found");
        return;
    }

    const address_line = addressLineEl.value.trim();
    const city = cityEl.value.trim();
    const state = stateEl.value.trim();
    const pincode = pincodeEl.value.trim();

    if (!address_line || !city || !state || !pincode) {
        alert("Please fill all fields");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/addresses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.id,
                address_line,
                city,
                state,
                pincode
            })
        });

        const data = await res.json();

        alert(data.message || "Address added successfully");

        addressLineEl.value = "";
        cityEl.value = "";
        stateEl.value = "";
        pincodeEl.value = "";

        loadAddresses();

    } catch (err) {
        console.error(err);
        alert("Failed to add address");
    }
}

// =============================
// CANCEL ORDER
// =============================
async function cancelOrder(orderId) {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`${API_URL}/orders/cancel/${orderId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        alert(data.message || "Order updated");

        if (typeof fetchUserOrders === "function") {
            fetchUserOrders();
        }

    } catch (err) {
        console.error(err);
        alert("Failed to cancel order");
    }
}

// =============================
// VIEW ORDER DETAILS
// =============================
async function viewOrderDetails(orderId) {
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`${API_URL}/orders/details/${orderId}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!data || !data.order) {
            alert("Order details not found");
            return;
        }

        let itemsHtml = "";

        if (Array.isArray(data.items)) {
            data.items.forEach(item => {
                itemsHtml += `${item.quantity}x ${item.name} (₹${item.price})\n`;
            });
        }

        alert(
            `Order ID: #${data.order.id}
Status: ${data.order.status}

Items:
${itemsHtml}

Total: ₹${data.order.total_amount}`
        );

    } catch (err) {
        console.error(err);
        alert("Failed to fetch order details");
    }
}
async function submitReview(restaurantId) {

    const user = JSON.parse(localStorage.getItem('user'));

    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value;

    if (!rating) {
        alert("Please select rating");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/restaurants/${restaurantId}/reviews`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.id,
                rating,
                comment
            })
        });

        const data = await res.json();

        alert(data.message);

        // reload modal
        viewMenu(restaurantId, "Restaurant");

    } catch (err) {
        console.error(err);
        alert("Failed to submit review");
    }
}