// Add to Cart Function
async function addToCart(productId) {
    try {
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId: productId,
                quantity: 1
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            location.reload();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Error adding to cart');
    }
}

// Search Products (AJAX)
document.addEventListener('DOMContentLoaded', function () {
    const searchBox = document.getElementById('searchBox');
    const resultsDiv = document.getElementById('searchResults');
    let timeout;

    if (searchBox) {
        searchBox.addEventListener('input', function () {
            const query = this.value.trim();

            clearTimeout(timeout);

            // Debounce (wait 300ms)
            timeout = setTimeout(async () => {

                if (!query) {
                    resultsDiv.innerHTML = '';
                    return;
                }

                try {
                    const response = await fetch(`/products/api/search?query=${encodeURIComponent(query)}`);
                    const products = await response.json();

                    if (products.length === 0) {
                        resultsDiv.innerHTML = `<div class="search-item">No results found</div>`;
                        return;
                    }

                    resultsDiv.innerHTML = products.map(p => `
                        <div class="search-item" onclick="goToProduct('${p._id}')">
                            ${p.name}
                        </div>
                    `).join('');

                } catch (err) {
                    console.error('Search error:', err);
                }

            }, 150);
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!searchBox.contains(e.target) && !resultsDiv.contains(e.target)) {
                resultsDiv.innerHTML = '';
            }
        });
    }
});

// Redirect to product page
function goToProduct(productId) {
    window.location.href = `/products/${productId}`;
}

// Filter by Category
function filterByCategory(category) {
    if (category) {
        location.href = `/products?category=${category}`;
    } else {
        location.href = '/products';
    }
}

// Update Order Status (for delivery personnel)
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/orders/${orderId}/update-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (data.success) {
            alert('Order status updated');
            location.reload();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

function deleteProduct(productId) {
  fetch(`/admin/delete-product/${productId}`, {
    method: 'POST'
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert('Product deleted');
      location.reload(); // refresh page
    } else {
      alert(data.message);
    }
  })
  .catch(err => console.error(err));
}