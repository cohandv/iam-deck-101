const express = require('express');
const path = require('path');
const open = require('open');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from current directory
app.use(express.static('.'));

// API endpoint to get slides data
app.get('/api/slides', (req, res) => {
    try {
        const slidesData = fs.readFileSync('slides.json', 'utf8');
        res.json(JSON.parse(slidesData));
    } catch (error) {
        console.error('Error reading slides.json:', error);
        res.status(500).json({ error: 'Failed to load slides data' });
    }
});

// Watch slides.json for changes and broadcast to clients
const clients = new Set();

app.get('/api/reload', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    clients.add(res);
    
    req.on('close', () => {
        clients.delete(res);
    });
});

// Watch slides.json for changes
if (fs.existsSync('slides.json')) {
    fs.watchFile('slides.json', (curr, prev) => {
        console.log('📝 slides.json changed - broadcasting reload...');
        clients.forEach(client => {
            client.write('data: reload\n\n');
        });
    });
}

// Serve the presentation at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Presentation server running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Presentation server running at http://localhost:${PORT}`);
    console.log('📊 Opening presentation in browser...');
    console.log('📝 Auto-reload enabled for slides.json changes');
    
    // Open browser automatically
    open(`http://localhost:${PORT}`)
        .then(() => {
            console.log('✅ Browser opened successfully');
        })
        .catch((err) => {
            console.log('⚠️  Could not open browser automatically');
            console.log(`   Please open http://localhost:${PORT} manually`);
        });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down presentation server...');
    if (fs.existsSync('slides.json')) {
        fs.unwatchFile('slides.json');
    }
    process.exit(0);
});