const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = process.env.USERS_DB || path.join(__dirname, 'users.json');

// Helper to read users
function readUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

// Helper to save users
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log(`Updated user database at ${USERS_FILE}`);
}

async function addUser(username, password) {
    const users = readUsers();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    users[username] = hash;
    saveUsers(users);
    console.log(`User '${username}' added/updated.`);
}

async function deleteUser(username) {
    const users = readUsers();
    if (users[username]) {
        delete users[username];
        saveUsers(users);
        console.log(`User '${username}' deleted.`);
    } else {
        console.log(`User '${username}' not found.`);
    }
}

async function initDefault() {
    const users = readUsers();
    if (Object.keys(users).length === 0) {
        console.log('Database empty or missing. Creating default admin user.');
        await addUser('admin', 'firewall');
    } else {
        console.log('User database already exists.');
    }
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        await initDefault();
        return;
    }

    const command = args[0];

    if (command === 'add') {
        const user = args[1];
        const pass = args[2];
        if (!user || !pass) {
            console.error('Usage: node manage-users.js add <username> <password>');
            return;
        }
        await addUser(user, pass);
    } else if (command === 'delete') {
        const user = args[1];
        if (!user) {
            console.error('Usage: node manage-users.js delete <username>');
            return;
        }
        await deleteUser(user);
    } else {
        console.log('Usage:');
        console.log('  node manage-users.js              (Initialize default if empty)');
        console.log('  node manage-users.js add <u?> <p> (Add/Update user)');
        console.log('  node manage-users.js delete <u>   (Delete user)');
    }
}

main().catch(console.error);
