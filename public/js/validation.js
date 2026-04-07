// Form Validation
document.addEventListener('DOMContentLoaded', function() {
    // Signup Form Validation
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            let isValid = true;

            // Username validation
            const username = document.querySelector('input[name="username"]').value;
            if (username.length < 3) {
                document.getElementById('usernameError').textContent = 'Username must be at least 3 characters';
                isValid = false;
            }

            // Email validation
            const email = document.querySelector('input[name="email"]').value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                document.getElementById('emailError').textContent = 'Invalid email format';
                isValid = false;
            }

            // Password validation
            const password = document.getElementById('password').value;
            if (password.length < 6) {
                document.getElementById('passwordError').textContent = 'Password must be at least 6 characters';
                isValid = false;
            }

            // Confirm password validation
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (password !== confirmPassword) {
                document.getElementById('confirmError').textContent = 'Passwords do not match';
                isValid = false;
            }

            if (!isValid) {
                e.preventDefault();
            }
        });
    }

    // Address validation on checkout
    const checkoutForm = document.querySelector('form[action="/cart/checkout"]');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            const address = document.querySelector('textarea[name="deliveryAddress"]').value;
            if (address.length < 10) {
                alert('Please enter a valid delivery address');
                e.preventDefault();
            }
        });
    }
});

// DOM Manipulation - Show/Hide loading spinner
function showLoader() {
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.innerHTML = '<div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>';
    loader.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999;';
    document.body.appendChild(loader);
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.remove();
}