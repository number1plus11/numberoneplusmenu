require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');
const jwt = require('jsonwebtoken');
const { authenticateToken, SECRET_KEY } = require('./auth');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "numberoneplusrayen";

// Middleware
app.use(cors());
app.use(express.json());

// Multer Config (Use Memory Storage for Vercel/Serverless)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    console.log("Login attempt. Received password length:", password ? password.length : 'null');
    console.log("Expected ADMIN_PASSWORD length:", ADMIN_PASSWORD.length);

    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: "Invalid password" });
    }
});

// Get Sections (for Admin)
app.get('/api/sections', (req, res) => {
    db.all("SELECT * FROM sections ORDER BY display_order", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Section (Protected)
app.post('/api/sections', authenticateToken, (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO sections (name) VALUES (?)", [name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

// Update Section (Protected)
app.put('/api/sections/:id', authenticateToken, (req, res) => {
    const { name } = req.body;
    db.run("UPDATE sections SET name = ? WHERE id = ?", [name, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Updated", changes: this.changes });
    });
});

// Delete Section (Protected)
app.delete('/api/sections/:id', authenticateToken, (req, res) => {
    // Optional: Delete items in section first or use cascade if enforced
    db.run("DELETE FROM items WHERE section_id = ?", [req.params.id], (err) => {
        if (err) console.error(err);
        db.run("DELETE FROM sections WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted" });
        });
    });
});

// Get Full Menu (Sections with Items)
app.get('/api/menu', (req, res) => {
    const query = `
        SELECT 
            s.id as section_id, s.name as section_name, s.display_order as section_order,
            i.id as item_id, i.name as item_name, i.description, i.price, i.available, i.image_url, i.options
        FROM sections s
        LEFT JOIN items i ON s.id = i.section_id
        ORDER BY s.display_order, i.id
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Group by section
        const menu = {};
        rows.forEach(row => {
            if (!menu[row.section_id]) {
                menu[row.section_id] = {
                    id: row.section_id,
                    name: row.section_name,
                    items: []
                };
            }
            if (row.item_id) {
                let parsedOptions = [];
                try {
                    parsedOptions = row.options ? JSON.parse(row.options) : [];
                } catch (e) {
                    console.error("Failed to parse options", e);
                }

                menu[row.section_id].items.push({
                    id: row.item_id,
                    name: row.item_name,
                    description: row.description,
                    price: row.price,
                    available: row.available,
                    image_url: row.image_url,
                    options: parsedOptions
                });
            }
        });

        res.json(Object.values(menu));
    });
});

// Add Item (Protected)
app.post('/api/items', authenticateToken, upload.single('image'), (req, res) => {
    const { section_id, name, description, price, options } = req.body;
    let image_url = req.body.image_url || '';

    if (req.file) {
        // In a real app, upload req.file.buffer to S3/Cloudinary here.
        // For Vercel demo without S3, we can't persist the file locally.
        // We'll use a placeholder or just keep the provided URL if any.
        console.log("File uploaded (in memory):", req.file.originalname, req.file.size);

        // Use a placeholder if no external URL provided, or maybe user sent a URL too?
        // For now, let's set a default if it's empty
        if (!image_url) {
            image_url = "https://placehold.co/600x400?text=Uploaded+Image";
        }
    }

    // Default image if none provided
    // if (!image_url) image_url = "https://placehold.co/600x400?text=No+Image";

    const sql = "INSERT INTO items (section_id, name, description, price, image_url, options) VALUES (?, ?, ?, ?, ?, ?)";

    // Options is a string in FormData if sent as string, or object if json.
    // Multer/BodyParser might keep it as string if sent as string.
    let optionsString = options;
    if (typeof options === 'object') {
        optionsString = JSON.stringify(options);
    }

    const params = [section_id, name, description, price, image_url, optionsString];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, ...req.body, image_url });
    });
});

// Update Item (Protected)
app.put('/api/items/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { section_id, name, description, price, options } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
        const protocol = req.protocol;
        const host = req.get('host');
        image_url = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    const sql = "UPDATE items SET section_id = ?, name = ?, description = ?, price = ?, image_url = ?, options = ? WHERE id = ?";

    let optionsString = options;
    if (typeof options === 'object') {
        optionsString = JSON.stringify(options);
    }

    const params = [section_id, name, description, price, image_url, optionsString, req.params.id];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Updated", changes: this.changes });
    });
});

// Delete Item (Protected)
app.delete('/api/items/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM items WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted", changes: this.changes });
    });
});

// Serve static files if in production (optional for now, focusing on API)

// Standard Names APIs

// Get All Names
app.get('/api/names', (req, res) => {
    db.all("SELECT * FROM standard_names ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Name
app.post('/api/names', authenticateToken, (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO standard_names (name) VALUES (?)", [name], function (err) {
        if (err) {
            // Handle unique constraint
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Name already exists" });
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, name });
    });
});

// Update Name (and sync items)
app.put('/api/names/:id', authenticateToken, (req, res) => {
    const { name } = req.body;
    const id = req.params.id;

    // First get old name
    db.get("SELECT name FROM standard_names WHERE id = ?", [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Name not found" });
        const oldName = row.name;

        // Update standard name
        db.run("UPDATE standard_names SET name = ? WHERE id = ?", [name, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Sync: Update all items that had the old name
            db.run("UPDATE items SET name = ? WHERE name = ?", [name, oldName], (err) => {
                if (err) console.error("Failed to sync items", err);
                // Return success even if sync failed partially (logs will show)
                res.json({ message: "Updated", changes: this.changes });
            });
        });
    });
});

// Delete Name
app.delete('/api/names/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM standard_names WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted" });
    });
});

// Bulk Import (Protected)
app.post('/api/import', authenticateToken, async (req, res) => {
    const sections = req.body;

    if (!Array.isArray(sections)) {
        return res.status(400).json({ error: "Input must be an array of sections" });
    }

    try {
        // We need to process sequentially to maintain order and get IDs
        // Using a transaction would be ideal, but for now we'll do best-effort linear processing
        // to stay compatible with our simple db wrapper.

        const results = { sections: 0, items: 0, errors: [] };

        // 0. Populate Standard Names Library first
        const allNames = new Set();
        sections.forEach(s => {
            if (Array.isArray(s.items)) {
                s.items.forEach(i => {
                    if (i.name) allNames.add(i.name);
                });
            }
        });

        for (const name of allNames) {
            // Best effort insert to library
            await new Promise(resolve => {
                // Postgres: ON CONFLICT DO NOTHING
                // SQLite: INSERT OR IGNORE
                // We'll try generic INSERT and ignore unique constraint error
                db.run("INSERT INTO standard_names (name) VALUES (?)", [name], (err) => {
                    resolve(); // Ignore error (likely duplicate)
                });
            });
        }

        for (const sectionData of sections) {
            // 1. Create Section
            try {
                const sectionName = sectionData.name || "Untitled Section";
                await new Promise((resolve, reject) => {
                    db.run("INSERT INTO sections (name) VALUES (?)", [sectionName], function (err) {
                        if (err) return reject(err);
                        const sectionId = this.lastID;
                        results.sections++;

                        // 2. Create Items for this Section
                        if (Array.isArray(sectionData.items)) {
                            const itemPromises = sectionData.items.map(item => {
                                return new Promise((resolveItem, rejectItem) => {
                                    const sql = "INSERT INTO items (section_id, name, description, price, image_url, options) VALUES (?, ?, ?, ?, ?, ?)";
                                    const params = [
                                        sectionId,
                                        item.name,
                                        item.description || '',
                                        item.price || 0,
                                        item.image_url || '',
                                        JSON.stringify(item.options || [])
                                    ];
                                    db.run(sql, params, function (err) {
                                        if (err) return rejectItem(err);
                                        results.items++;
                                        resolveItem();
                                    });
                                });
                            });

                            Promise.all(itemPromises)
                                .then(() => resolve())
                                .catch(err => {
                                    console.error("Error adding items for section " + sectionId, err);
                                    results.errors.push(`Failed to add items for section '${sectionName}': ${err.message}`);
                                    resolve(); // Resolve to continue with next section
                                });
                        } else {
                            resolve();
                        }
                    });
                });

            } catch (err) {
                console.error("Error importing section", err);
                results.errors.push(`Failed to import section '${sectionData.name}': ${err.message}`);
            }
        }

        res.json({ message: "Import completed", results });

    } catch (e) {
        res.status(500).json({ error: "Import failed: " + e.message });
    }
});

// Global Error Handler (Multer & others)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        return res.status(400).json({ error: `Upload Error: ${err.message}` });
    } else if (err) {
        // An unknown error occurred when uploading.
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
    next();
});

// Manual DB Init (for debugging)
app.get('/api/debug/init-db', async (req, res) => {
    try {
        if (db.init) {
            await db.init();
            res.send("Database initialization triggered manually. Check logs.");
        } else {
            res.send("Not running in Postgres mode or init not exposed.");
        }
    } catch (e) {
        res.status(500).send("Error: " + e.message);
    }
});

// DB Status Check (for debugging 500 errors)
app.get('/api/debug/status', (req, res) => {
    db.get("SELECT count(*) as count FROM sections", [], (err, row) => {
        if (err) {
            return res.json({
                status: "error",
                message: err.message,
                code: err.code || 'unknown',
                details: err
            });
        }
        res.json({ status: "ok", count: row.count, message: "Database is connected and tables exist!" });
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log("Server starting... v2 (Multer & DB fixes)");
    });
}

module.exports = app;
