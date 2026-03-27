const fs = require('fs');
const path = require('path');
const dbPath = path.resolve('database.sqlite');
if (fs.existsSync(dbPath)) {
    try {
        fs.unlinkSync(dbPath);
        console.log('✅ database.sqlite deleted.');
    } catch (e) {
        console.error('❌ Failed to delete database.sqlite:', e.message);
    }
} else {
    console.log('ℹ️ database.sqlite not found.');
}
