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
}

function clearForm() {
    document.getElementById('restaurantId').value = '';
    document.getElementById('name').value = '';
    document.getElementById('address').value = '';
    document.getElementById('cuisine_type').value = '';
    document.getElementById('is_kosher').checked = false;
}

// Dashboard functionality
async function loadRestaurants(page = currentPage) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }
    try {
        const response = await fetch(`/admin/restaurants?page=${page}&limit=${ITEMS_PER_PAGE}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        const data = await response.json();
        if (data.success) {
            currentPage = page;
            displayRestaurants(data.data, data.pagination);
        }
    } catch (error) {
        console.error('Failed to load restaurants:', error);
    }
}

function displayRestaurants(restaurants, pagination) {
    const list = document.getElementById('restaurantList');
    if (!list) return;
    list.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Website</th>
                    <th>Opening Hours</th>
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
                        <td>${r.website ? `<a href="${r.website}" target="_blank">${r.website}</a>` : '-'}</td>
                        <td>${formatOpeningHours(r.opening_hours)}</td>
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
            <button onclick="loadPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
            <span>Page ${currentPage} of ${pagination.pages} (Total: ${pagination.total})</span>
            <button onclick="loadPage(${currentPage + 1})" ${currentPage >= pagination.pages ? 'disabled' : ''}>Next</button>
        </div>
    `;
}

function formatOpeningHours(hours) {
    if (!hours) return '-';
    try {
        return Object.entries(hours)
            .map(([day, times]) => 
                `<div class="day-hours">
                    <span class="day">${capitalizeDay(day)}:</span> 
                    <span class="hours">${times.open}-${times.close}</span>
                </div>`
            )
            .join('');
    } catch (e) {
        return '-';
    }
}

function capitalizeDay(day) {
    return day.charAt(0).toUpperCase() + day.slice(1);
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

// Edit restaurant
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
            
            // Populate basic fields
            document.getElementById('restaurantId').value = restaurant.id;
            document.getElementById('name').value = restaurant.name;
            document.getElementById('address').value = restaurant.address;
            document.getElementById('website').value = restaurant.website || '';
            document.getElementById('cuisine_type').value = restaurant.cuisine_type;
            document.getElementById('is_kosher').checked = restaurant.is_kosher;
            
            // Populate opening hours
            if (restaurant.opening_hours) {
                const hours = restaurant.opening_hours;
                Object.keys(hours).forEach(day => {
                    const openInput = document.querySelector(`input[data-day="${day}"][data-type="open"]`);
                    const closeInput = document.querySelector(`input[data-day="${day}"][data-type="close"]`);
                    if (openInput && closeInput) {
                        openInput.value = hours[day].open;
                        closeInput.value = hours[day].close;
                    }
                });
            }
            
            // Show form
            document.getElementById('restaurantForm').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load restaurant:', error);
        alert('Failed to load restaurant details');
    }
}

function getOpeningHours() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hours = {};
    
    days.forEach(day => {
        const open = document.querySelector(`input[data-day="${day}"][data-type="open"]`).value;
        const close = document.querySelector(`input[data-day="${day}"][data-type="close"]`).value;
        if (open && close) {
            hours[day] = { open, close };
        }
    });
    
    return Object.keys(hours).length > 0 ? hours : null;
}

// Save restaurant
async function saveRestaurant(event) {
    event.preventDefault();
    const token = localStorage.getItem('adminToken');
    const id = document.getElementById('restaurantId').value;
    const form = document.getElementById('restaurantDataForm');
    
    form.classList.add('loading');
    
    const data = {
        name: document.getElementById('name').value,
        address: document.getElementById('address').value,
        website: document.getElementById('website').value || null,
        cuisine_type: document.getElementById('cuisine_type').value,
        is_kosher: document.getElementById('is_kosher').checked,
        opening_hours: getOpeningHours()
    };
    try {
        const url = id ? `/admin/restaurants/${id}` : '/admin/restaurants';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            hideForm();
            // Go to last page if adding new restaurant
            if (!id && result.data.pagination) {
                await loadRestaurants(result.data.pagination.pages);
            } else {
                await loadRestaurants(currentPage);
            }
            showMessage('Restaurant saved successfully!', 'success');
        } else {
            const errorMessage = result.message || 'Failed to save restaurant';
            showMessage(errorMessage, 'error');
            
            if (response.status === 409) { // Conflict/Duplicate
                showMessage('A restaurant with this name already exists', 'error');
            }
        }
    } catch (error) {
        console.error('Failed to save restaurant:', error);
        showMessage('Failed to save restaurant', 'error');
    } finally {
        form.classList.remove('loading');
    }
}

function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    document.querySelector('.container').insertBefore(messageDiv, document.getElementById('restaurantList'));
    
    // Remove message after 3 seconds
    setTimeout(() => messageDiv.remove(), 3000);
}

// Delete restaurant
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