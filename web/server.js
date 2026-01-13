const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

const PORT = 8765;
const USERS_FILE = process.env.USERS_DB || path.join(__dirname, 'users.json');

// Stats
let totalBytesOut = 0;
setInterval(() => {
    io.emit('stats', {
        date: new Date(),
        uptime: Math.floor(process.uptime()),
        bytesOut: totalBytesOut
    });
}, 1000);

// Session setup
const sessionMiddleware = session({
    secret: 'insecure-secret-key-demo-only',
    resave: false,
    saveUninitialized: false, // Don't create session until logged in
    cookie: { secure: false } // Set true if using HTTPS
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(sessionMiddleware);

// Auth Helpers
function readUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

// Routes
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();

    if (users[username] && await bcrypt.compare(password, users[username])) {
        req.session.user = username;
        return res.json({ success: true, user: username });
    }

    res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

app.get('/api/fs/list', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const queryPath = req.query.path || process.env.HOME;

    // Security check: ensure path starts with HOME
    if (!queryPath.startsWith(process.env.HOME)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const items = fs.readdirSync(queryPath, { withFileTypes: true }).map(dirent => {
            return {
                name: dirent.name,
                isDirectory: dirent.isDirectory(),
                path: path.join(queryPath, dirent.name)
            };
        });
        // Sort: folders first
        items.sort((a, b) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1));
        res.json({ path: queryPath, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/fs/read', (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const queryPath = req.query.path;
    if (!queryPath || !queryPath.startsWith(process.env.HOME)) {
        return res.status(403).send('Access denied');
    }
    if (fs.existsSync(queryPath)) {
        res.sendFile(queryPath);
    } else {
        res.status(404).send('Not found');
    }
});

// Socket Auth Middleware
io.engine.use(sessionMiddleware);
io.use((socket, next) => {
    const session = socket.request.session;
    if (session && session.user) {
        next();
    } else {
        next(new Error("unauthorized"));
    }
});

io.on('connection', (socket) => {
    const username = socket.request.session.user;
    console.log(`Client connected: ${socket.id} (${username})`);

    // Map to store multiple PTYs for this socket connection
    // Structure: { [windowId]: ptyProcess }
    const ptys = {};

    socket.on('spawn', ({ id, command, cols, rows }) => {
        if (ptys[id]) return; // Already exists

        // Allowlist validation
        const ALLOWED_COMMANDS = ['tmux', 'btop', 'fastfetch', 'nvim', 'os-release', 'terminal'];
        if (!ALLOWED_COMMANDS.includes(command)) {
            console.error(`Blocked unauthorized command: ${command}`);
            return;
        }

        console.log(`Spawning ${command} for window ${id} (${cols}x${rows})`);

        let cmd = command;
        let args = [];

        if (command === 'tmux') {
            args = ['new-session', '-A', '-s', `user-${username}`];
        } else if (command === 'fastfetch') {
            // Loop fastfetch. On resize, we will send '\n' to break the read and re-loop.
            cmd = 'bash';
            args = ['-c', 'while :; do clear; fastfetch; read -p "Press enter to close (or resize)..."; done'];
        } else if (command === 'os-release') {
            cmd = 'bash';
            args = ['-c', 'cat /etc/os-release; echo; read -p "Press enter to close..."'];
        } else if (command === 'terminal') {
            cmd = 'zsh';
            args = [];
        }

        const shell = pty.spawn(cmd, args, {
            name: 'xterm-256color',
            cwd: process.env.HOME,
            env: process.env,
            cols: cols || 80,
            rows: rows || 24
        });

        shell.appType = command; // Store type for resize handler
        ptys[id] = shell;

        // Data from PTY -> Client (Tagged with ID)
        shell.on('data', (data) => {
            totalBytesOut += data.length;
            socket.emit('output', { id, data });
        });

        shell.on('exit', () => {
            socket.emit('exit', { id });
            delete ptys[id];
        });
    });

    // Input from Client -> PTY
    socket.on('input', ({ id, data }) => {
        if (ptys[id]) {
            ptys[id].write(data);
        }
    });

    // Resize PTY
    socket.on('resize', ({ id, cols, rows }) => {
        if (ptys[id]) {
            try {
                ptys[id].resize(cols, rows);

                // Hack for fastfetch: Send newline to trigger re-draw loop
                // We need to know if this ID is fastfetch. 
                // Since we don't track metadata in ptys{}, we can infer or store it.
                // Let's store it in a separate map or extend ptys structure.
                if (ptys[id].appType === 'fastfetch') {
                    ptys[id].write('\n');
                }
            } catch (err) {
                console.error(`Resize failed for ${id}:`, err);
            }
        }
    });

    // Kill PTY
    socket.on('kill', ({ id }) => {
        if (ptys[id]) {
            ptys[id].kill();
            delete ptys[id];
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id} (${username})`);
        // Cleanup all PTYs for this socket
        Object.values(ptys).forEach(shell => shell.kill());
    });
});

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`OOPS (Openly Operating Public Shell) running at http://0.0.0.0:${PORT}`);
});
