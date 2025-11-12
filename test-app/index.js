const express = require('express');
const client = require('prom-client');
const app = express();
const PORT = 3000;

// ---------------- Prometheus Setup ----------------
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const requestCount = new client.Counter({
    name: 'app_requests_total',
    help: 'Total number of requests received',
    labelNames: ['route']
});

const responseTime = new client.Histogram({
    name: 'app_response_time_seconds',
    help: 'Response time in seconds',
    labelNames: ['route']
});

register.registerMetric(requestCount);
register.registerMetric(responseTime);

// ---------------- Helper Functions ----------------
function log(level, message) {
    console.log(JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
        message
    }));
}

// ---------------- Routes ----------------
app.get('/', (req, res) => {
    const end = responseTime.startTimer();
    requestCount.inc({ route: '/' });

    log('INFO', 'Home route accessed');
    end({ route: '/' });

    res.send(`
        <html>
        <head><title>Cloud-Native Observability Demo</title></head>
        <body style="font-family: Arial; text-align:center; margin-top: 80px;">
            <h1 style="color: #007bff;">🌐 Cloud-Native Observability App</h1>
            <p>This app demonstrates <b>Fluent Bit</b> logging, <b>Prometheus</b> metrics, and <b>Grafana</b> dashboards.</p>
            <ul style="list-style:none; padding:0;">
                <li><a href="/metrics">📊 View Prometheus Metrics</a></li>
                <li><a href="/status">💡 Check App Status</a></li>
                <li><a href="/simulate-error">🔥 Simulate Error Log</a></li>
            </ul>
        </body>
        </html>
    `);
});

app.get('/status', (req, res) => {
    const end = responseTime.startTimer();
    requestCount.inc({ route: '/status' });

    const status = Math.random() > 0.2 ? 'healthy' : 'unhealthy';
    log('INFO', `Health status checked: ${status}`);
    end({ route: '/status' });

    res.json({ status, timestamp: new Date().toISOString() });
});

app.get('/simulate-error', (req, res) => {
    const end = responseTime.startTimer();
    requestCount.inc({ route: '/simulate-error' });

    log('ERROR', 'Simulated application error occurred!');
    end({ route: '/simulate-error' });

    res.status(500).json({ error: 'Simulated error generated for testing logs.' });
});

// ---------------- Metrics ----------------
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        log('ERROR', `Metrics fetch failed: ${err.message}`);
        res.status(500).end(err);
    }
});

// ---------------- Start Server ----------------
app.listen(PORT, () => {
    log('INFO', `Server running on http://localhost:${PORT}`);
});
