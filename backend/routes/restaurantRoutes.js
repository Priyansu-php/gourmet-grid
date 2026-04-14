const express = require('express');
const router = express.Router();
const db = require('../config/db');

// =============================
// GET ALL RESTAURANTS
// =============================
router.get('/', async (req, res) => {
    try {
        const [restaurants] = await db.query(
            'SELECT * FROM restaurants WHERE is_active = TRUE'
        );
        res.json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================
// GET RESTAURANT + MENU + REVIEWS
// =============================
router.get('/:id', async (req, res) => {
    try {
        const [restaurants] = await db.query(
            'SELECT * FROM restaurants WHERE id = ?',
            [req.params.id]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const restaurant = restaurants[0];

        const [menu] = await db.query(
            'SELECT * FROM menu_items WHERE restaurant_id = ?',
            [req.params.id]
        );

        const [reviews] = await db.query(
            `SELECT r.*, u.name 
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.restaurant_id = ?
             ORDER BY r.created_at DESC`,
            [req.params.id]
        );

        res.json({
            ...restaurant,
            menu,
            reviews
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================
// ADD REVIEW
// =============================
router.post('/:id/reviews', async (req, res) => {
    try {
        const { user_id, rating, comment } = req.body;

        if (!user_id || !rating) {
            return res.status(400).json({ message: 'Missing fields' });
        }

        await db.query(
            `INSERT INTO reviews (user_id, restaurant_id, rating, comment)
             VALUES (?, ?, ?, ?)`,
            [user_id, req.params.id, rating, comment]
        );

        const [avg] = await db.query(
            `SELECT AVG(rating) as avgRating 
             FROM reviews 
             WHERE restaurant_id = ?`,
            [req.params.id]
        );

        await db.query(
            `UPDATE restaurants SET rating = ? WHERE id = ?`,
            [avg[0].avgRating, req.params.id]
        );

        res.json({ message: "Review added successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================
// MENU MANAGEMENT 🔥
// =============================

// ADD MENU ITEM
router.post('/:id/menu', async (req, res) => {
    try {
        const { name, description, price } = req.body;

        await db.query(
            `INSERT INTO menu_items (restaurant_id, name, description, price)
             VALUES (?, ?, ?, ?)`,
            [req.params.id, name, description, price]
        );

        res.json({ message: "Item added" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error adding item" });
    }
});

// UPDATE MENU ITEM
router.put('/menu/:itemId', async (req, res) => {
    try {
        const { name, description, price } = req.body;

        await db.query(
            `UPDATE menu_items 
             SET name=?, description=?, price=? 
             WHERE id=?`,
            [name, description, price, req.params.itemId]
        );

        res.json({ message: "Item updated" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating item" });
    }
});

// DELETE MENU ITEM
router.delete('/menu/:itemId', async (req, res) => {
    try {
        await db.query(
            `DELETE FROM menu_items WHERE id=?`,
            [req.params.itemId]
        );

        res.json({ message: "Item deleted" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting item" });
    }
});

module.exports = router;