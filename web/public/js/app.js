
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const statStatus = document.getElementById('stat-status');
const logoutBtn = document.getElementById('logout-btn');
const activeTasksContainer = document.getElementById('active-tasks');

// Global socket
let socket;

// --- Window Manager ---
const startMenu = document.getElementById('start-menu');

function commonKeyHandler(e) {
    if (e.ctrlKey && e.key === 'Tab') {
        return false; // Allow browser to switch tabs
    }
    // Allow Ctrl-b pass through (explicitly handled by default, but keeping intentionality)
    if (e.ctrlKey && e.code === 'KeyB') return true;
    return true;
}

function toggleStartMenu() {
    startMenu.classList.toggle('show');
}

function spawnApp(command) {
    startMenu.classList.remove('show');
    WindowManager.spawn(command);
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.start-btn') && !e.target.closest('.start-menu')) {
        startMenu.classList.remove('show');
    }
});

const WindowManager = {
    windows: {}, // id -> { elem, term, fitAddon, command }
    nextId: 1,

    create: function (command) {
        let id = `win-${this.nextId++}`;
        let title = 'Terminal';
        let icon = '💻';
        let w = '600px', h = '450px';
        let isStatic = false; // For 'about'

        if (command === 'fastfetch') { title = 'System Info'; icon = '🚀'; h = '600px'; }
        if (command === 'btop') { title = 'System Monitor'; icon = '📈'; w = '900px'; h = '600px'; }
        if (command === 'nvim') { title = 'NeoVim'; icon = '📝'; w = '800px'; h = '600px'; }
        if (command === 'terminal') { title = 'Terminal'; icon = '🐚'; }
        if (command === 'files') { title = 'Files'; icon = '📂'; w = '800px'; h = '600px'; isStatic = true; }
        if (command === 'browser') { title = 'Web Browser'; icon = '🌐'; w = '800px'; h = '600px'; isStatic = true; }
        if (command === 'bsod') { this.triggerBSOD(); return; }
        if (command === 'image-viewer') { title = 'Image Viewer'; icon = '🖼️'; w = 'auto'; h = 'auto'; isStatic = true; }
        if (command === 'about') {
            if (document.getElementById('win-about')) {
                this.restore('win-about');
                return;
            }
            id = 'win-about';
            title = 'About OOPS';
            icon = 'ℹ️';
            w = '500px';
            h = '400px';
            isStatic = true;
        }

        // DOM Structure
        const win = document.createElement('div');
        win.className = 'window';
        win.id = id;
        win.style.width = w;
        win.style.height = h;

        // Centering or Default Position
        if (command === 'about') {
            win.style.left = 'calc(50% - 250px)';
            win.style.top = 'calc(50% - 200px)';
        } else {
            win.style.left = '100px';
            win.style.top = '100px';
        }

        win.style.display = 'flex';
        win.style.flexDirection = 'column';

        win.innerHTML = `
            <div class="window-header">
                <div class="window-title"><span>${icon}</span> ${title}</div>
                <div class="window-controls">
                    <button class="win-btn win-btn-min" onclick="WindowManager.minimize('${id}')"></button>
                    <button class="win-btn win-btn-close" onclick="WindowManager.close('${id}')"></button>
                </div>
            </div>
            <div class="window-content" style="flex: 1; overflow: hidden; position: relative; color: #c9d1d9; padding: 20px;">
                    ${isStatic ? (
                command === 'about' ? `
                            <div style="text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
                                <h2 style="color:#58a6ff; margin-bottom:10px;">OOPS</h2>
                                <h4 style="margin:0 0 20px 0;">Openly Obnoxious Pretentious Shell</h4>
                                <div style="font-size:3rem; margin-bottom:20px;">☢️</div>
                                <p>Author: うしねこ</p>
                                <p>&copy; 2026. No rights reserved. Nobody cares.</p>
                                <p style="font-size:0.8rem; color:#8b949e;">Powered by Debian Trixie & Node.js & Dolphins (sorry dolphins)</p>
                            </div>` :
                    command === 'files' ? `
                            <div style="display:flex; flex-direction:column; height:100%;">
                                <div class="file-nav" id="nav-${id}">
                                     <button class="nav-btn" onclick="WindowManager.navigate('${id}', '..')">⬆️ Up</button>
                                     <div class="nav-path" id="path-${id}">/</div>
                                </div>
                                <div class="file-grid" id="grid-${id}" style="flex:1; overflow-y:auto; padding:10px;">Loading...</div>
                            </div>` :
                        command === 'image-viewer' ? `
                            <div style="display:flex; justify-content:center; align-items:center; height:100%; background:#000;">
                                <img id="img-${id}" src="" style="max-width:100%; max-height:100%; object-fit:contain;">
                            </div>` :
                            command === 'browser' ? `
                            <div style="display:flex; flex-direction:column; height:100%;">
                                <div class="browser-nav">
                                    <button class="browser-btn" onclick="document.getElementById('frame-${id}').contentWindow.history.back()">⬅️</button>
                                    <button class="browser-btn" onclick="document.getElementById('frame-${id}').contentWindow.history.forward()">➡️</button>
                                    <button class="browser-btn" onclick="WindowManager.navigateBrowser('${id}')">🔄</button>
                                    <input type="text" class="url-bar" id="url-${id}" value="https://en.m.wikipedia.org" onkeydown="if(event.key==='Enter') WindowManager.navigateBrowser('${id}')">
                                    <button class="browser-btn" onclick="WindowManager.navigateBrowser('${id}')">Go</button>
                                </div>
                                <iframe id="frame-${id}" src="about:blank" style="flex:1; border:none; background:#fff;"></iframe>
                            </div>` : ''
            ) : `<div class="term-target" style="width: 100%; height: 100%; padding:0;"></div>`}
            </div>
            <div class="window-resize-handle"></div>
        `;

        if (command === 'files') {
            setTimeout(() => this.navigate(id, ''), 100);
        }
        if (command === 'browser') {
            setTimeout(() => this.navigateBrowser(id), 100);
        }

        // Add to Desktop
        document.getElementById('desktop-layer').appendChild(win);
        this.bringToFront(win);

        // Add Taskbar Item
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item active';
        taskItem.id = `task-${id}`;
        taskItem.innerHTML = `<span>${icon}</span> <span class="label">${title}</span>`;
        taskItem.onclick = () => this.restore(id);
        activeTasksContainer.appendChild(taskItem);

        // Initialize Logic
        this.windows[id] = { elem: win, command };
        this.makeDraggable(win, win.querySelector('.window-header'));
        this.makeResizable(win, win.querySelector('.window-resize-handle'), id);
        win.onmousedown = () => this.bringToFront(win);

        if (isStatic) return;

        // Initialize Terminal
        const termContainer = win.querySelector('.term-target');
        const term = new Terminal({
            theme: { background: '#0d1117', foreground: '#c9d1d9', cursor: '#58a6ff' },
            fontFamily: document.getElementById('font-family').value,
            fontSize: parseInt(document.getElementById('font-size').value),
            lineHeight: 1.0,
            cursorBlink: true
        });
        term.attachCustomKeyEventHandler(commonKeyHandler);
        const fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);
        // try {
        //     term.loadAddon(new ImageAddon.ImageAddon({ sixelSupport: true }));
        // } catch (e) { console.warn("ImageAddon failed to load", e); }
        term.open(termContainer);

        // Register Extended
        this.windows[id].term = term;
        this.windows[id].fitAddon = fitAddon;

        // Spawn Request - DELAYED to ensure DOM paint and fit
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                try {
                    fitAddon.fit();
                    if (term.cols < 10) term.resize(80, 24);

                    if (socket?.connected) {
                        socket.emit('spawn', {
                            id,
                            command,
                            cols: term.cols,
                            rows: term.rows
                        });
                    }
                } catch (e) { console.error('Spawn error', e); }
            });
        });

        term.onData(data => {
            if (socket?.connected) socket.emit('input', { id, data });
        });

        new ResizeObserver(() => {
            if (!win.classList.contains('minimized')) {
                fitAddon.fit();
            }
        }).observe(win.querySelector('.window-content'));
    },

    spawn: function (command) {
        this.create(command);
    },

    close: function (id) {
        const win = this.windows[id];
        if (!win) return;

        if (socket?.connected) socket.emit('kill', { id });
        if (win.term) win.term.dispose();
        win.elem.remove();
        document.getElementById(`task-${id}`).remove();
        delete this.windows[id];
    },

    minimize: function (id) {
        const win = this.windows[id];
        if (win) {
            win.elem.classList.add('minimized');
            document.getElementById(`task-${id}`).classList.remove('active');
        }
    },

    restore: function (id) {
        const win = this.windows[id];
        if (win) {
            if (win.elem.classList.contains('minimized')) {
                win.elem.classList.remove('minimized');
                document.getElementById(`task-${id}`).classList.add('active');
            }
            this.bringToFront(win.elem);
            win.fitAddon.fit(); // Refit on restore
        }
    },

    bringToFront: function (elem) {
        document.querySelectorAll('.window').forEach(w => w.style.zIndex = 100);
        elem.style.zIndex = 101;
    },

    makeDraggable: function (elmnt, dragHandle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        dragHandle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    },

    makeResizable: function (elmnt, handle, id) {
        let startX, startY, startWidth, startHeight;

        handle.addEventListener('mousedown', initDrag, false);

        function initDrag(e) {
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(elmnt).width, 10);
            startHeight = parseInt(document.defaultView.getComputedStyle(elmnt).height, 10);
            document.documentElement.addEventListener('mousemove', doDrag, false);
            document.documentElement.addEventListener('mouseup', stopDrag, false);
            document.body.style.userSelect = 'none';
        }

        function doDrag(e) {
            elmnt.style.width = (startWidth + e.clientX - startX) + 'px';
            elmnt.style.height = (startHeight + e.clientY - startY) + 'px';
        }

        function stopDrag(e) {
            document.documentElement.removeEventListener('mousemove', doDrag, false);
            document.documentElement.removeEventListener('mouseup', stopDrag, false);
            document.body.style.userSelect = '';

            const win = WindowManager.windows[id];
            if (win) {
                win.fitAddon.fit();
                if (socket?.connected) {
                    socket.emit('resize', { id, cols: win.term.cols, rows: win.term.rows });
                }
            }
        }
    },

    navigate: async function (id, pathOrRel) {
        const grid = document.getElementById(`grid-${id}`);
        const pathEl = document.getElementById(`path-${id}`);
        if (!grid || !pathEl) return;

        let currentPath = pathEl.getAttribute('data-path') || ''; // Initial empty = home
        let targetPath = pathOrRel;

        if (pathOrRel === '..') {
            // Primitive parent logic
            const parts = currentPath.split('/').filter(p => p);
            parts.pop();
            targetPath = '/' + parts.join('/');
            if (targetPath === '/') targetPath = ''; // Reset to default (HOME)
        } else if (pathOrRel === '') {
            targetPath = '';
        }

        try {
            // If fetching root '' it implies HOME on server side
            const res = await fetch(`/api/fs/list?path=${encodeURIComponent(targetPath || '')}`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();

            // Render
            pathEl.innerText = data.path;
            pathEl.setAttribute('data-path', data.path);
            grid.innerHTML = '';

            data.items.forEach(item => {
                const el = document.createElement('div');
                el.className = 'file-item';
                el.innerHTML = `
                    <div class="file-icon">${item.isDirectory ? '📁' : (item.name.match(/\.(png|jpg|jpeg|gif)$/i) ? '🖼️' : '📄')}</div>
                    <div class="file-name">${item.name}</div>
                `;
                el.onclick = () => {
                    if (item.isDirectory) {
                        this.navigate(id, item.path);
                    } else if (item.name.match(/\.(png|jpg|jpeg|gif)$/i)) {
                        WindowManager.spawn('image-viewer');
                        // Wait for simple spawn then hackily load image. 
                        // Ideally create returns ID, but spawn wraps it. 
                        // Let's modify create to return ID.
                        setTimeout(() => {
                            // Find the last image viewer window
                            // This is race-condition prone but "good enough" for this toy OS
                            const viewers = document.querySelectorAll('.window img[id^="img-win-"]');
                            if (viewers.length > 0) {
                                const lastViewer = viewers[viewers.length - 1];
                                lastViewer.src = `/api/fs/read?path=${encodeURIComponent(item.path)}`;
                                // Set title of window
                                const winId = lastViewer.id.replace('img-', '');
                                document.querySelector(`#${winId} .window-title`).innerHTML = `<span>🖼️</span> ${item.name}`;
                            }
                        }, 200);
                    }
                };
                grid.appendChild(el);
            });

        } catch (e) {
            grid.innerHTML = `<div style="color:red">Error loading path</div>`;
        }
    },
    navigateBrowser: function (id, url) {
        const frame = document.getElementById(`frame-${id}`);
        const input = document.getElementById(`url-${id}`);
        if (!frame || !input) return;

        let target = url || input.value;
        if (!target.startsWith('http')) target = 'https://' + target;

        input.value = target;
        frame.src = target;
        input.value = target;
        frame.src = target;
    },

    triggerBSOD: function () {
        const bsod = document.createElement('div');
        bsod.className = 'bsod-overlay';
        bsod.innerHTML = `
            <div class="bsod-face">:)</div>
            <div class="bsod-text">
                Your PC ran into a problem and has joined the choir invisible. It's Microsoft's fault, so install Linux instead.<br><br>
                -100% (estimated time: approximate heat death of the universe)<br><br>
                <span style="font-size:1rem; opacity:0.8;">STOP CODE: CRITICAL_PROCESS_HATES_YOU</span>
            </div>
        `;
        document.body.appendChild(bsod);

        // Enter full screen for effect (optional, might block)
        try { document.documentElement.requestFullscreen(); } catch (e) { }

        const remove = () => {
            bsod.remove();
            try { document.exitFullscreen(); } catch (e) { }
            document.removeEventListener('keydown', remove);
            document.removeEventListener('mousedown', remove);
        };

        // Delay slightly so the click that spawned it doesn't kill it immediately
        setTimeout(() => {
            document.addEventListener('keydown', remove);
            document.addEventListener('mousedown', remove);
        }, 500);
    }
};
// --- Main Terminal Logic (Desktop Wallpaper) ---
let mainTerm, mainFitAddon;

function fitAndResizeMain() {
    if (!mainFitAddon || !mainTerm) return;
    mainFitAddon.fit();
    if (socket?.connected && mainTerm.cols > 0 && mainTerm.rows > 0) {
        socket.emit('resize', { id: 'root', cols: mainTerm.cols, rows: mainTerm.rows });
    }
    mainTerm.refresh(0, mainTerm.rows - 1);
}

async function initDesktop() {
    await document.fonts.ready;

    mainTerm = new Terminal({
        theme: { background: '#0d1117', foreground: '#c9d1d9', cursor: '#58a6ff' },
        fontFamily: document.getElementById('font-family').value,
        fontSize: 14,
        lineHeight: 1.0,
        cursorBlink: true,
        allowProposedApi: true
    });

    // Allow Ctrl-b pass through
    mainTerm.attachCustomKeyEventHandler(commonKeyHandler);

    mainFitAddon = new FitAddon.FitAddon();
    mainTerm.loadAddon(mainFitAddon);
    // try {
    //     mainTerm.loadAddon(new ImageAddon.ImageAddon({ sixelSupport: true }));
    // } catch (e) { console.warn("ImageAddon failed to load", e); }

    mainTerm.open(document.getElementById('terminal-container')); // Opens in #terminal-container

    window.addEventListener('resize', fitAndResizeMain);

    // Input
    mainTerm.onData(data => {
        if (socket?.connected) socket.emit('input', { id: 'root', data });
    });

    // Global Font Listeners
    document.getElementById('font-family').addEventListener('change', (e) => {
        const font = e.target.value;
        mainTerm.options.fontFamily = font;
        localStorage.setItem('term_font', font);
        Object.values(WindowManager.windows).forEach(w => w.term.options.fontFamily = font);
        setTimeout(() => { fitAndResizeMain(); }, 100);
    });

    document.getElementById('font-size').addEventListener('change', (e) => {
        const size = parseInt(e.target.value);
        mainTerm.options.fontSize = size;
        localStorage.setItem('term_size', size);
        Object.values(WindowManager.windows).forEach(w => w.term.options.fontSize = size);
        setTimeout(() => { fitAndResizeMain(); }, 50);
    });
}

// --- Socket & Auth ---
function connectSocket() {
    if (socket) return;
    socket = io();

    socket.on('connect', () => {
        statStatus.innerText = 'Connected';
        statStatus.className = 'status-connected';

        // Spawn Main Terminal (root)
        setTimeout(() => {
            fitAndResizeMain();
            socket.emit('spawn', {
                id: 'root',
                command: 'tmux',
                cols: mainTerm.cols,
                rows: mainTerm.rows
            });
            mainTerm.focus();
        }, 200);
    });

    socket.on('disconnect', () => {
        statStatus.className = 'status-disconnected';
        statStatus.innerText = 'Disconnected';
        socket = null;
    });

    socket.on('output', ({ id, data }) => {
        if (id === 'root') {
            mainTerm.write(data);
        } else if (WindowManager.windows[id]) {
            WindowManager.windows[id].term.write(data);
        }
    });

    socket.on('exit', ({ id }) => {
        if (id === 'root') window.location.reload(); // Main session died
        else WindowManager.close(id);
    });

    socket.on('stats', (data) => {
        document.getElementById('stat-time').innerText = new Date(data.date).toLocaleTimeString();
        document.getElementById('stat-uptime').innerText = formatUptime(data.uptime);
        document.getElementById('stat-in').innerText = formatBytes(data.bytesOut);
    });

    function formatUptime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}h ${m}m ${s}s`;
    }

    function formatBytes(bytes, decimals = 1) {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    socket.on('connect_error', (err) => {
        if (err.message === 'unauthorized') showLogin();
    });
}

// --- Auth UI Listeners ---
function showLogin() {
    loginModal.style.display = 'flex';
    statStatus.className = 'status-auth';
    statStatus.innerText = 'Authentication Required';
    logoutBtn.style.display = 'none';
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    try {
        const res = await fetch('/api/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p })
        });
        if (res.ok) {
            loginModal.style.display = 'none';
            logoutBtn.style.display = 'block';
            connectSocket();
        } else {
            const d = await res.json();
            loginError.innerText = d.error || 'Login failed';
        }
    } catch (e) { loginError.innerText = 'Network Error'; }
});

logoutBtn.addEventListener('click', () => {
    fetch('/api/logout', { method: 'POST' }).then(() => window.location.reload());
});

// --- Start ---
initDesktop();
fetch('/api/me').then(r => {
    if (r.ok) { logoutBtn.style.display = 'block'; connectSocket(); }
    else showLogin();
});
