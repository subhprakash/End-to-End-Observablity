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
    log('INFO', 'Home route accessed and simulating database query.', req);
    await simulateWork(50, 150); // Simulate some work/latency

    res.send(`
        <html>
        <head><title>Cloud-Native Observability Demo</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align:center; margin-top: 50px; background-color: #f4f7f6; color: #333; }
            .container { max-width: 800px; margin: auto; padding: 20px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
            h1 { color: #007bff; margin-bottom: 5px; }
            h2 { color: #5cb85c; margin-top: 0; }
            p { color: #555; }
            ul { list-style: none; padding: 0; display: flex; justify-content: center; gap: 20px; margin-top: 30px;}
            li a { text-decoration: none; padding: 10px 20px; border-radius: 5px; transition: background-color 0.3s; color: white; font-weight: bold; }
            .metrics-link { background-color: #f39c12; }
            .status-link { background-color: #2ecc71; }
            .error-link { background-color: #e74c3c; }
            li a:hover { opacity: 0.9; }
            .trace-id { margin-top: 40px; font-size: 0.9em; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
        </head>
        <body>
            <div class="container">
                <h1>🛰️ Cloud-Native Observability Demo App</h1>
                <h2>A unified view of Logs, Metrics, & Traces</h2>
                <p>This application is designed to generate rich **Logs (JSON format)**, **Metrics (Prometheus)**, and demonstrate **Trace Correlation**.</p>
                <ul>
                    <li><a href="/metrics" class="metrics-link">📊 Prometheus Metrics</a></li>
                    <li><a href="/status" class="status-link">💡 Check App Status (Simulated Latency)</a></li>
                    <li><a href="/simulate-error" class="error-link">🔥 Simulate Error Log (500 Status)</a></li>
                </ul>
                <div class="trace-id">
                    <strong>Current Trace ID (for Logs):</strong> ${req.traceId}
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

// ---------------- Start Server ----------------
app.listen(PORT, () => {
    // Start-up log does not have a req object, so we log directly
    console.log(JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        message: `Server running on http://localhost:${PORT}`
    }));
});