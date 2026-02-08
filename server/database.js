const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database
const dbPath = path.resolve(__dirname, 'restaurant.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Initialize Database Tables
db.serialize(() => {
    // Sections Table (e.g., Fast Food, Plats, Boissons)
    db.run(`CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        display_order INTEGER DEFAULT 0
    )`);

    // Items Table
    db.run(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        price REAL,
        available BOOLEAN DEFAULT 1,
        image_url TEXT,
        options TEXT,
        FOREIGN KEY (section_id) REFERENCES sections(id)
    )`, (err) => {
        // Migration: Attempt to add options column if it doesn't exist (for existing DBs)
        if (!err) {
            db.run("ALTER TABLE items ADD COLUMN options TEXT", (err) => {
                // Ignore error if column already exists
            });
        }
    });

    // Standard Names Table (for standardized item names)
    db.run(`CREATE TABLE IF NOT EXISTS standard_names (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`, (err) => {
        if (!err) {
            // Seed from existing items if empty
            db.get("SELECT count(*) as count FROM standard_names", (err, row) => {
                if (row && row.count === 0) {
                    console.log("Seeding standard_names from existing items...");
                    db.all("SELECT DISTINCT name FROM items", [], (err, rows) => {
                        if (!err && rows.length > 0) {
                            const stmt = db.prepare("INSERT OR IGNORE INTO standard_names (name) VALUES (?)");
                            rows.forEach(r => stmt.run(r.name));
                            stmt.finalize();
                        }
                    });
                }
            });
        }
    });

    // Seed some initial data if empty
    db.get("SELECT count(*) as count FROM sections", (err, row) => {
        if (row.count === 0) {
            console.log("Seeding initial data...");
            const sections = [
                "Fast Food", "Plats Gourmands", "Desserts", "Boissons"
            ];
            const stmt = db.prepare("INSERT INTO sections (name, display_order) VALUES (?, ?)");
            sections.forEach((sec, index) => {
                stmt.run(sec, index);
            });
            stmt.finalize();
        }
    });
});

module.exports = db;
