// public/admin/app.js
let currentPage = 1;
const ITEMS_PER_PAGE = 50;

// Login handling
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('adminToken', data.data.token);
                window.location.href = '/admin/dashboard.html';
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            alert('Login failed');
        }
    });
}

// Form handling
function showAddForm() {
    clearForm();
    document.getElementById('restaurantForm').style.display = 'block';
}

function hideForm() {
    document.getElementById('restaurantForm').style.display = 'none';
    clearForm();
}

function clearForm() {
    document.getElementById('restaurantId').value = '';
    document.getElementById('name').value = '';
    document.getElementById('address').value = '';
    document.getElementById('cuisine_type').value = '';
    document.getElementById('is_kosher').checked = false;
}

// Dashboard functionality
async function loadRestaurants(page = 1) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }

    try {
        const response = await fetch(`/admin/restaurants?page=${page}&limit=${ITEMS_PER_PAGE}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();
        if (data.success) {
            displayRestaurants(data.data);
            updatePagination(data.pagination);
        }
    } catch (error) {
        console.error('Failed to load restaurants:', error);
    }
}

function displayRestaurants(restaurants) {
    const list = document.getElementById('restaurantList');
    if (!list) return;

    list.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Cuisine</th>
                    <th>Kosher</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${restaurants.map(r => `
                    <tr>
                        <td>${r.name}</td>
                        <td>${r.address}</td>
                        <td>${r.cuisine_type}</td>
                        <td>${r.is_kosher ? 'Yes' : 'No'}</td>
                        <td>
                            <button onclick="editRestaurant(${r.id})">Edit</button>
                            <button onclick="deleteRestaurant(${r.id})">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="pagination">
            <button onclick="loadPage(currentPage - 1)" id="prevBtn">Previous</button>
            <span id="pageInfo">Page ${currentPage}</span>
            <button onclick="loadPage(currentPage + 1)" id="nextBtn">Next</button>
        </div>
    `;
}

function updatePagination(pagination) {
    currentPage = pagination.page;
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${pagination.page} of ${pagination.pages} (${pagination.total} total)`;
    }
    if (prevBtn) {
        prevBtn.disabled = pagination.page <= 1;
    }
    if (nextBtn) {
        nextBtn.disabled = pagination.page >= pagination.pages;
    }
}

function loadPage(page) {
    if (page < 1) return;
    loadRestaurants(page);
}

async function editRestaurant(id) {
    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch(`/admin/restaurants/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            const restaurant = data.data;
            document.getElementById('restaurantId').value = restaurant.id;
            document.getElementById('name').value = restaurant.name;
            document.getElementById('address').value = restaurant.address;
            document.getElementById('cuisine_type').value = restaurant.cuisine_type;
            document.getElementById('is_kosher').checked = restaurant.is_kosher;
            document.getElementById('restaurantForm').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load restaurant:', error);
        alert('Failed to load restaurant details');
    }
}

async function saveRestaurant(event) {
    event.preventDefault();
    const token = localStorage.getItem('adminToken');
    const id = document.getElementById('restaurantId').value;
    
    const data = {
        name: document.getElementById('name').value,
        address: document.getElementById('address').value,
        cuisine_type: document.getElementById('cuisine_type').value,
        is_kosher: document.getElementById('is_kosher').checked
    };

    try {
        const url = id ? `/admin/restaurants/${id}` : '/admin/restaurants';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            hideForm();
            loadRestaurants(currentPage); // Maintain current page
        } else {
            const errorData = await response.json();
            alert(errorData.message || 'Failed to save restaurant');
        }
    } catch (error) {
        console.error('Failed to save restaurant:', error);
        alert('Failed to save restaurant');
    }
}

async function deleteRestaurant(id) {
    if (!confirm('Are you sure you want to delete this restaurant?')) return;

    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch(`/admin/restaurants/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            // Reload current page after deletion
            loadRestaurants(currentPage);
        } else {
            const errorData = await response.json();
            alert(errorData.message || 'Failed to delete restaurant');
        }
    } catch (error) {
        console.error('Failed to delete restaurant:', error);
        alert('Failed to delete restaurant');
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

// Initialize dashboard if we're on that page
if (window.location.pathname.includes('dashboard')) {
    loadRestaurants(1);
    document.getElementById('restaurantDataForm')?.addEventListener('submit', saveRestaurant);
}