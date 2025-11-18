const express = require('express');
const client = require('prom-client');
const crypto = require = require('crypto'); // For generating a unique trace ID
const app = express();
const PORT = 3000;

// ---------------- Prometheus Setup ----------------
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Counter for total requests by route and status code
const requestCount = new client.Counter({
    name: 'app_requests_total',
    help: 'Total number of requests received by route and status code',
    labelNames: ['route', 'method', 'status_code']
});

// ⭐ NEW METRIC: Counter for specific business actions (Add to Cart)
const cartActionCount = new client.Counter({
    name: 'ecomm_cart_actions_total',
    help: 'Total number of items added to cart',
    labelNames: ['product_sku']
});

// Histogram for response time by route (with realistic buckets)
const responseTime = new client.Histogram({
    name: 'app_response_time_seconds',
    help: 'Response time in seconds',
    labelNames: ['route', 'method'],
    buckets: [0.005, 0.01, 0.02, 0.05, 0.1, 0.5, 1, 2] // common latency buckets
});

register.registerMetric(requestCount);
register.registerMetric(cartActionCount); // Register the new metric
register.registerMetric(responseTime);

// ---------------- Middleware & Helper Functions ----------------

// Middleware to start timing and assign a Trace ID
app.use((req, res, next) => {
    // Generate a simple Trace ID for log correlation (Simulated Tracing)
    req.traceId = crypto.randomBytes(12).toString('hex');
    req.endTimer = responseTime.startTimer();
    next();
});

function log(level, message, req) {
    // Inject the traceId into the log for correlation (Loki/Fluent Bit focus)
    const logEntry = {
        level,
        timestamp: new Date().toISOString(),
        trace_id: req.traceId,
        route: req.path,
        method: req.method,
        message
    };
    console.log(JSON.stringify(logEntry));
}

// Middleware to stop timing and record metrics
app.use((req, res, next) => {
    res.on('finish', () => {
        const route = req.path;
        const statusCode = res.statusCode;

        // 1. Record Request Count
        requestCount.inc({ route, method: req.method, status_code: statusCode });

        // 2. Record Response Time
        req.endTimer({ route, method: req.method });

        // Log the completion (optional, but good for context)
        log('DEBUG', `Request completed with status ${statusCode}`, req);
    });
    next();
});

function simulateWork(minMs, maxMs) {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
}

// ---------------- Routes ----------------

// Home Page Route with Video Background
app.get('/', async (req, res) => {
    log('INFO', 'E-commerce Home/Product page accessed and simulating backend operations.', req);
    await simulateWork(100, 300); // Simulate product data fetching

    res.send(`
        <html>
        <head>
            <title>E-Commerce Observability Demo</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                body { 
                    font-family: 'Poppins', sans-serif; 
                    margin: 0; 
                    color: #333; 
                    line-height: 1.6; 
                    overflow-x: hidden; /* Prevent horizontal scroll */
                }
                
                /* Video Background Styling */
                #video-background {
                    position: fixed;
                    right: 0;
                    bottom: 0;
                    min-width: 100%; 
                    min-height: 100%;
                    width: auto; 
                    height: auto;
                    z-index: -100; /* Send to background */
                    background-size: cover;
                    background-color: #f0f2f5; /* Fallback color */
                    filter: brightness(0.7); /* Darken video for better text readability */
                }

                .navbar {
                    background-color: rgba(255, 255, 255, 0.9); /* Slightly transparent */
                    padding: 15px 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: relative; /* Above video */
                    z-index: 10;
                }
                .navbar-brand {
                    font-weight: 600;
                    font-size: 1.5em;
                    color: #007bff;
                    text-decoration: none;
                }
                .navbar-links a {
                    margin-left: 25px;
                    text-decoration: none;
                    color: #555;
                    font-weight: 400;
                    transition: color 0.3s;
                }
                .navbar-links a:hover {
                    color: #007bff;
                }
                .container { 
                    max-width: 960px; 
                    margin: 40px auto; 
                    padding: 20px; 
                    background-color: rgba(255, 255, 255, 0.95); /* Semi-transparent white */
                    border-radius: 12px; 
                    box-shadow: 0 8px 20px rgba(0,0,0,0.1); 
                    text-align: center;
                    position: relative; /* Above video */
                    z-index: 5;
                }
                .product-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 30px;
                }
                .product-image {
                    width: 100%;
                    max-width: 400px;
                    height: auto;
                    border-radius: 8px;
                    margin-bottom: 25px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.08);
                }
                .product-title {
                    font-size: 2.2em;
                    color: #333;
                    margin-bottom: 10px;
                    font-weight: 600;
                }
                .product-price {
                    font-size: 1.8em;
                    color: #28a745;
                    font-weight: 600;
                    margin-bottom: 20px;
                }
                .product-description {
                    font-size: 1.1em;
                    color: #666;
                    max-width: 600px;
                    margin: 0 auto 30px auto;
                }
                .add-to-cart-btn {
                    background-color: #007bff;
                    color: white;
                    padding: 15px 35px;
                    border: none;
                    border-radius: 50px;
                    font-size: 1.1em;
                    cursor: pointer;
                    transition: background-color 0.3s, transform 0.2s;
                    text-decoration: none; /* Make it look like a button */
                }
                .add-to-cart-btn:hover {
                    background-color: #0056b3;
                    transform: translateY(-2px);
                }
                .footer {
                    margin-top: 50px;
                    padding: 30px 20px;
                    background-color: rgba(44, 62, 80, 0.9); /* Semi-transparent dark blue */
                    color: #ecf0f1;
                    font-size: 0.9em;
                    border-radius: 0 0 12px 12px;
                    position: relative; /* Above video */
                    z-index: 5;
                }
                .footer-links a {
                    color: #87ceeb;
                    text-decoration: none;
                    margin: 0 15px;
                    padding: 8px 15px;
                    border-radius: 5px;
                    transition: background-color 0.3s;
                }
                .footer-links a:hover {
                    background-color: #34495e;
                }
                .trace-id { 
                    margin-top: 25px; 
                    font-size: 0.85em; 
                    color: #aaa; 
                    padding-top: 15px; 
                    border-top: 1px solid #eee; 
                }
                .message-box {
                    padding: 15px;
                    margin: 20px auto;
                    max-width: 500px;
                    border-radius: 8px;
                    font-weight: 600;
                    color: white;
                    background-color: #28a745; /* Green for success */
                    display: ${req.query.message ? 'block' : 'none'};
                }
                /* End of CSS */
            </style>
        </head>
        <body>
            <video autoplay muted loop id="video-background">
                <source src="https://assets.mixkit.co/videos/preview/mixkit-curved-road-on-a-mountain-surrounded-by-trees-1226-large.mp4" type="video/mp4">
                Your browser does not support the video tag.
            </video>

            <div class="navbar">
                <a href="/" class="navbar-brand">🛍️ MyShop</a>
                <div class="navbar-links">
                    <a href="/">Home</a>
                    <a href="/products">Products</a>
                    <a href="/cart">Cart (0)</a>
                    <a href="/account">Account</a>
                </div>
            </div>

            <div class="container">
                <div class="message-box">
                    ${req.query.message ? decodeURIComponent(req.query.message) : ''}
                </div>
                
                <div class="product-card">
                    <img src="https://ubonindia.com/cdn/shop/files/HP-65_copy_1.jpg?v=1758175449&width=600" alt="Stylish Headphones" class="product-image">
                    <h1 class="product-title">Premium Wireless Headphones</h1>
                    <p class="product-price">$199.99</p>
                    <p class="product-description">
                        Experience immersive audio with our state-of-the-art wireless headphones. 
                        Designed for comfort and superior sound quality, perfect for music lovers and professionals alike. 
                        Long-lasting battery and crystal-clear calls.
                    </p>
                    
                    <a href="/add-to-cart?sku=WH001" class="add-to-cart-btn">Add to Cart</a>
                </div>
                
                <div class="footer">
                    <p>Cloud-Native Observability Demo | Generate logs & metrics by interacting.</p>
                    <div class="footer-links">
                        <a href="/metrics">📊 Metrics Dashboard</a>
                        <a href="/status">💡 Check App Status</a>
                        <a href="/simulate-error">🔥 Simulate Error</a>
                    </div>
                    <div class="trace-id">
                        <strong>Current Request Trace ID:</strong> ${req.traceId}
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

// ... (Rest of the routes /add-to-cart, /products, /cart, /account, /status, /simulate-error, /metrics remain unchanged) ...

// ⭐ NEW ROUTE: Simulates adding a product to the cart
app.get('/add-to-cart', async (req, res) => {
    const sku = req.query.sku || 'UNKNOWN';
    log('INFO', `Starting cart service transaction for SKU: ${sku}`, req);
    
    // Simulate database write/inventory check latency (critical operation)
    await simulateWork(150, 400); 

    // Increment the specific business metric
    cartActionCount.inc({ product_sku: sku });
    
    log('SUCCESS', `Product SKU ${sku} successfully added to shopping cart.`, req);
    
    // Redirect back to the home page with a success message in the URL
    res.redirect(`/?message=${encodeURIComponent('✅ Success! Wireless Headphones added to cart.')}`);
});


// ⭐ ENHANCED ROUTE: Products Page (Simulated Search)
app.get('/products', async (req, res) => {
    log('INFO', 'Products search service accessed. Simulating complex filtering.', req);
    await simulateWork(200, 500); // Simulate high latency for a complex search/filter query

    res.send(`<html><head><title>Products</title></head><body>
        <h1>Products Catalog</h1>
        <p>This page simulates a large product search query with high latency (200-500ms). Trace ID: ${req.traceId}</p>
        <a href="/">Back Home</a>
    </body></html>`);
});

// ⭐ ENHANCED ROUTE: Cart Page (Simulated Session Data)
app.get('/cart', async (req, res) => {
    log('INFO', 'Cart session data accessed. Simulating fast cache lookup.', req);
    await simulateWork(10, 50); // Simulate low latency for fast session/cache lookup

    res.send(`<html><head><title>Cart</title></head><body>
        <h1>Shopping Cart</h1>
        <p>This page simulates a quick session/cache lookup (10-50ms). Trace ID: ${req.traceId}</p>
        <a href="/">Back Home</a>
    </body></html>`);
});

// ⭐ ENHANCED ROUTE: Account Page (Simulated Profile Load)
app.get('/account', async (req, res) => {
    log('INFO', 'User profile service accessed. Simulating authentication check.', req);
    await simulateWork(50, 150); // Simulate medium latency for DB read/auth check

    res.send(`<html><head><title>Account</title></head><body>
        <h1>My Account</h1>
        <p>This page simulates an authentication and database profile load (50-150ms). Trace ID: ${req.traceId}</p>
        <a href="/">Back Home</a>
    </body></html>`);
});


// Status and Error routes remain the same for consistency
app.get('/status', async (req, res) => {
    log('INFO', 'Health status check initiated.', req);
    await simulateWork(10, 50); 

    const status = Math.random() > 0.1 ? '✅ healthy' : '🚨 unhealthy';
    log('INFO', `Health status reported: ${status}`, req);

    res.json({
        status,
        timestamp: new Date().toISOString(),
        trace_id: req.traceId,
        message: 'Quick health check. A small chance of "unhealthy" for testing alerts.',
    });
});

app.get('/simulate-error', async (req, res) => {
    log('ERROR', 'Simulated application error occurred due to bad request data!', req);
    await simulateWork(100, 300);

    res.status(500).json({
        error: 'Simulated internal server error generated for testing 5xx alerts and error logs.',
        trace_id: req.traceId,
        route: req.path,
        suggestion: 'Check the error log using the trace_id in your logging system (Loki/Elasticsearch).'
    });
});

// Metrics Endpoint remains the same
app.get('/metrics', async (req, res) => {
    try {
        log('DEBUG', 'Metrics endpoint accessed.', req);
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        log('ERROR', `Metrics fetch failed: ${err.message}`, req);
        res.status(500).end('Failed to fetch metrics.');
    }
});

// ---------------- Start Server ----------------
app.listen(PORT, () => {
    console.log(JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        message: `E-commerce Demo App running on http://localhost:${PORT}`
    }));
});