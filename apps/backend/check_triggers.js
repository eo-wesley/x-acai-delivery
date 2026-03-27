const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
async function check() {
  const db = await open({ filename: './database.sqlite', driver: sqlite3.Database });
  const triggers = await db.all("SELECT name, sql FROM sqlite_master WHERE type='trigger'");
  console.log(triggers);
}
check();
