/**
 * Dynamically injects and loads the official Razorpay Checkout SDK.
 * Returns a Promise that resolves when the script completes loading.
 * 
 * @returns {Promise<boolean>} - Resolves true on load, false on error
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // 1. If script is already loaded/active, resolve immediately
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    // 2. Create script node element
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    // 3. Bind event listeners
    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      resolve(false);
    };

    // 4. Append to DOM body
    document.body.appendChild(script);
  });
};
