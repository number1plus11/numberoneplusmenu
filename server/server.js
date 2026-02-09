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

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname)) // Append extension
    }
})

const upload = multer({ storage: storage })

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
        // Construct URL for uploaded file. Assuming api is on same domain/port for now or handled by proxy.
        // In dev: http://localhost:3000/uploads/filename
        const protocol = req.protocol;
        const host = req.get('host');
        image_url = `${protocol}://${host}/uploads/${req.file.filename}`;
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
    db.run("DELETE FROM items WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted", changes: this.changes });
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
    db.run("DELETE FROM sections WHERE id = ?", req.params.id, function (err) {
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
