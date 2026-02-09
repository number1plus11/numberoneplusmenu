const path = require('path');

// Check if we are running with a DATABASE_URL (Supabase/Postgres)
const isPostgres = !!process.env.DATABASE_URL;

let db;

if (isPostgres) {
    const { Pool } = require('pg');

    // Remove query params from connection string to avoid SSL conflicts
    // (e.g. sslmode=require in URL can override rejectUnauthorized: false)
    const connectionString = process.env.DATABASE_URL.split('?')[0];

    const pool = new Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase/Vercel
    });

    console.log("Connected to PostgreSQL (Supabase)");

    // Initialize Postgres Tables
    // Initialize Postgres Tables
    const initPostgres = async () => {
        const client = await pool.connect();
        try {
            // Sections Table
            await client.query(`CREATE TABLE IF NOT EXISTS sections (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                display_order INTEGER DEFAULT 0
            )`);

            // Items Table
            await client.query(`CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                section_id INTEGER REFERENCES sections(id),
                name TEXT NOT NULL,
                description TEXT,
                price REAL,
                available BOOLEAN DEFAULT true,
                image_url TEXT,
                options TEXT
            )`);

            // Standard Names
            await client.query(`CREATE TABLE IF NOT EXISTS standard_names (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            )`);
            /*
                        // Seeding Initial Data if empty
                        const res = await client.query('SELECT count(*) FROM sections');
                        if (parseInt(res.rows[0].count) === 0) {
                            console.log("Seeding initial data...");
                            const sections = ["Fast Food", "Plats Gourmands", "Desserts", "Boissons"];
                            for (let i = 0; i < sections.length; i++) {
                                await client.query('INSERT INTO sections (name, display_order) VALUES ($1, $2)', [sections[i], i]);
                            }
                        }
            **/
            console.log("Database initialized successfully.");
        } catch (e) {
            console.error("Error initializing database:", e);
        } finally {
            client.release();
        }
    };

    // Promise that resolves when DB is ready
    const dbReady = initPostgres();

    // Wrapper to mimic SQLite3 API for existing code compatibility
    db = {
        run: function (sql, params = [], callback) {
            dbReady.then(() => {
                // Adjust SQL for Postgres: ? -> $1, $2, etc.
                let paramCount = 1;
                const pgSql = sql.replace(/\?/g, () => `$${paramCount++}`);

                // Handle specific SQL syntax differences
                // 1. AUTOINCREMENT -> GENERATED ALWAYS AS IDENTITY (Handled in CREATE TABLE below)
                // 2. INSERT ... returning id (SQLite uses this.lastID context)
                const isInsert = /^\s*INSERT/i.test(pgSql);
                const finalSql = isInsert ? `${pgSql} RETURNING id` : pgSql;

                console.log("Executing SQL:", finalSql, params); // Debug Log

                pool.query(finalSql, params)
                    .then(res => {
                        const context = {
                            lastID: isInsert && res.rows.length > 0 ? res.rows[0].id : null,
                            changes: res.rowCount
                        };
                        if (callback) callback.call(context, null);
                    })
                    .catch(err => {
                        console.error("SQL Error:", err); // Debug Log
                        if (callback) callback(err);
                    });
            });
        },
        all: function (sql, params = [], callback) {
            dbReady.then(() => {
                let paramCount = 1;
                const pgSql = sql.replace(/\?/g, () => `$${paramCount++}`);
                pool.query(pgSql, params)
                    .then(res => {
                        if (callback) callback(null, res.rows);
                    })
                    .catch(err => {
                        if (callback) callback(err);
                    });
            });
        },
        get: function (sql, params = [], callback) {
            dbReady.then(() => {
                let paramCount = 1;
                const pgSql = sql.replace(/\?/g, () => `$${paramCount++}`);
                pool.query(pgSql, params)
                    .then(res => {
                        if (callback) callback(null, res.rows[0]);
                    })
                    .catch(err => {
                        if (callback) callback(err);
                    });
            });
        },
        serialize: function (callback) {
            dbReady.then(() => {
                if (callback) callback();
            });
        },
        init: initPostgres
    };

} else {
    // FALLBACK TO SQLITE (Local Development)
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'restaurant.db');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) console.error('Error opening database', err.message);
        else console.log('Connected to the SQLite database.');
    });

    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            display_order INTEGER DEFAULT 0
        )`);

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
        )`);

        // Ensure options column exists
        db.run("ALTER TABLE items ADD COLUMN options TEXT", (err) => { });

        db.run(`CREATE TABLE IF NOT EXISTS standard_names (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`);

        db.get("SELECT count(*) as count FROM sections", (err, row) => {
            if (row && row.count === 0) {
                const sections = ["Fast Food", "Plats Gourmands", "Desserts", "Boissons"];
                const stmt = db.prepare("INSERT INTO sections (name, display_order) VALUES (?, ?)");
                sections.forEach((sec, index) => stmt.run(sec, index));
                stmt.finalize();
            }
        });
    });
}

module.exports = db;

