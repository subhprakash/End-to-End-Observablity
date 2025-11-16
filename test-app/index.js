const express = require('express');
const client = require('prom-client');
const crypto = require('crypto'); // For generating a unique trace ID
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

// Histogram for response time by route (with realistic buckets)
const responseTime = new client.Histogram({
    name: 'app_response_time_seconds',
    help: 'Response time in seconds',
    labelNames: ['route', 'method'],
    buckets: [0.005, 0.01, 0.02, 0.05, 0.1, 0.5, 1, 2] // common latency buckets
});

register.registerMetric(requestCount);
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

app.get('/', async (req, res) => {
    log('INFO', 'E-commerce Home/Product page accessed and simulating backend operations.', req);
    await simulateWork(100, 300); // Simulate product data fetching, recommendations, etc.

    res.send(`
        <html>
        <head>
            <title>E-Commerce Observability Demo</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                body { 
                    font-family: 'Poppins', sans-serif; 
                    margin: 0; 
                    background-color: #f0f2f5; 
                    color: #333; 
                    line-height: 1.6; 
                }
                .navbar {
                    background-color: #ffffff;
                    padding: 15px 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
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
                    background-color: #ffffff; 
                    border-radius: 12px; 
                    box-shadow: 0 8px 20px rgba(0,0,0,0.1); 
                    text-align: center;
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
                    background-color: #2c3e50;
                    color: #ecf0f1;
                    font-size: 0.9em;
                    border-radius: 0 0 12px 12px;
                }
                .footer-links a {
                    color: #87ceeb;
                    text-decoration: none;
                    margin: 0 15px;
                    transition: color 0.3s;
                }
                .footer-links a:hover {
                    color: #fff;
                }
                .trace-id { 
                    margin-top: 25px; 
                    font-size: 0.85em; 
                    color: #aaa; 
                    padding-top: 15px; 
                    border-top: 1px solid #eee; 
                }
            </style>
        </head>
        <body>
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
                <div class="product-card">
                    <img src="https://picsum.photos/id/1015/400/300" alt="Stylish Headphones" class="product-image">
                    <h1 class="product-title">Premium Wireless Headphones</h1>
                    <p class="product-price">$199.99</p>
                    <p class="product-description">
                        Experience immersive audio with our state-of-the-art wireless headphones. 
                        Designed for comfort and superior sound quality, perfect for music lovers and professionals alike. 
                        Long-lasting battery and crystal-clear calls.
                    </p>
                    <a href="#" class="add-to-cart-btn">Add to Cart</a>
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

app.get('/status', async (req, res) => {
    log('INFO', 'Health status check initiated.', req);
    await simulateWork(10, 50); // Fast status check

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
    await simulateWork(100, 300); // Latency before failure

    res.status(500).json({
        error: 'Simulated internal server error generated for testing 5xx alerts and error logs.',
        trace_id: req.traceId,
        route: req.path,
        suggestion: 'Check the error log using the trace_id in your logging system (Loki/Elasticsearch).'
    });
});

// ---------------- Metrics Endpoint ----------------
app.get('/metrics', async (req, res) => {
    try {
        log('DEBUG', 'Metrics endpoint accessed.', req);
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        log('ERROR', `Metrics fetch failed: ${err.message}`, req);
        // The middleware will record this as a 500 error
        res.status(500).end('Failed to fetch metrics.');
    }
});

// Dummy routes for the navbar (just return empty responses for now)
app.get('/products', async (req, res) => {
    log('INFO', 'Products page accessed.', req);
    await simulateWork(50, 200);
    res.send(`<html><head><title>Products</title></head><body><h1>Products Page</h1><p>More products coming soon! Trace ID: ${req.traceId}</p></body></html>`);
});

app.get('/cart', async (req, res) => {
    log('INFO', 'Cart page accessed.', req);
    await simulateWork(30, 100);
    res.send(`<html><head><title>Cart</title></head><body><h1>Shopping Cart</h1><p>Your cart is empty. Trace ID: ${req.traceId}</p></body></html>`);
});

app.get('/account', async (req, res) => {
    log('INFO', 'Account page accessed.', req);
    await simulateWork(40, 120);
    res.send(`<html><head><title>Account</title></head><body><h1>My Account</h1><p>User profile here. Trace ID: ${req.traceId}</p></body></html>`);
});

// ---------------- Start Server ----------------
app.listen(PORT, () => {
    // Start-up log does not have a req object, so we log directly
    console.log(JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        message: `E-commerce Demo App running on http://localhost:${PORT}`
    }));
});