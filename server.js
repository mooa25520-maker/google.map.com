const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const locationLogs = [];

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // POST /api/location endpoint
    if (req.url === '/api/location' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

                const locationRecord = {
                    id: Date.now(),
                    latitude: data.latitude,
                    longitude: data.longitude,
                    address: data.address || 'N/A',
                    timestamp: data.timestamp || new Date().toISOString(),
                    userAgent: data.userAgent || req.headers['user-agent'],
                    ip: clientIp
                };

                locationLogs.unshift(locationRecord);

                // Save to local JSON file (locations_log.json)
                const logFilePath = path.join(__dirname, 'locations_log.json');
                fs.writeFile(logFilePath, JSON.stringify(locationLogs, null, 2), (err) => {
                    if (err) console.error('Failed to write location log file:', err);
                    else console.log(`[File System] Saved location to ${logFilePath}`);
                });

                console.log('\n[API /api/location] Location Received:');
                console.log(`- Latitude: ${locationRecord.latitude}`);
                console.log(`- Longitude: ${locationRecord.longitude}`);
                console.log(`- Address: ${locationRecord.address}`);
                console.log(`- Timestamp: ${locationRecord.timestamp}\n`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Coordinates, reverse-geocoded address, and client metadata received.',
                    data: locationRecord
                }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
            }
        });
        return;
    }

    // GET /api/location/logs endpoint
    if (req.url === '/api/location/logs' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: locationLogs.length, logs: locationLogs }));
        return;
    }

    // Static Files Handler
    let reqUrl = req.url === '/' ? '/index.html' : req.url;
    let filePath = path.join(PUBLIC_DIR, reqUrl);
    let ext = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`SwiftDrop Delivery GPS Server running on http://localhost:${PORT}`);
    console.log(`====================================================`);
});
