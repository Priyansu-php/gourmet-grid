const express = require('express');
const router = express.Router();
const db = require('../config/db');


// ===============================
// CREATE ORDER
// ===============================
router.post('/', async (req, res) => {
    try {
        const { user_id, restaurant_id, items, total_amount } = req.body;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {

            const [result] = await connection.query(
                `INSERT INTO orders 
                (user_id, restaurant_id, total_amount, status) 
                VALUES (?, ?, ?, 'Placed')`,
                [user_id, restaurant_id, total_amount]
            );

            const orderId = result.insertId;

            if (items && items.length > 0) {

                const itemValues = items.map(item => [
                    orderId,
                    item.menu_item_id,
                    item.quantity,
                    item.price
                ]);

                await connection.query(
                    `INSERT INTO order_items 
                    (order_id, menu_item_id, quantity, price) 
                    VALUES ?`,
                    [itemValues]
                );
            }

            await connection.commit();

            res.status(201).json({
                message: 'Order placed successfully',
                orderId: orderId
            });

        } catch (err) {

            await connection.rollback();
            throw err;

        } finally {

            connection.release();

        }

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Server error' });

    }
});



// ===============================
// GET ORDERS FOR USER
// ===============================
router.get('/user/:id', async (req, res) => {
    try {

        const [orders] = await db.query(
            `SELECT 
                id,
                total_amount,
                status,
                created_at
            FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC`,
            [req.params.id]
        );

        res.json(orders);

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Server error' });

    }
});



// ===============================
// GET ORDERS FOR RESTAURANT
// ===============================
router.get('/restaurant/:id', async (req, res) => {
    try {

        const [orders] = await db.query(
            `SELECT 
                id,
                total_amount,
                status,
                created_at
            FROM orders
            WHERE restaurant_id = ?
            ORDER BY created_at DESC`,
            [req.params.id]
        );

        res.json(orders);

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Server error' });

    }
});



// ===============================
// GET ALL ORDERS (ADMIN)
// ===============================
router.get('/', async (req, res) => {
    try {

        const [orders] = await db.query(
            `SELECT 
                id,
                user_id,
                restaurant_id,
                total_amount,
                status,
                created_at
            FROM orders
            ORDER BY created_at DESC`
        );

        res.json(orders);

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Server error' });

    }
});



// ===============================
// CANCEL ORDER
// ===============================
router.put('/cancel/:id', async (req, res) => {
    try {

        const [order] = await db.query(
            `SELECT status FROM orders WHERE id = ?`,
            [req.params.id]
        );

        if (order.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order[0].status !== "Placed") {
            return res.json({
                message: "Order cannot be cancelled after confirmation"
            });
        }

        await db.query(
            `UPDATE orders SET status = 'Cancelled' WHERE id = ?`,
            [req.params.id]
        );

        res.json({ message: "Order cancelled successfully" });

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Server error' });

    }
});



// ===============================
// UPDATE ORDER STATUS
// ===============================
router.put('/status/:id', async (req, res) => {
    try {

        const { status } = req.body;

        await db.query(
            `UPDATE orders SET status = ? WHERE id = ?`,
            [status, req.params.id]
        );

        res.json({ message: "Order status updated" });

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Server error' });

    }
});



// ===============================
// GET ORDER DETAILS (TRACK)
// ===============================
router.get('/details/:id', async (req, res) => {
    try {

        const [order] = await db.query(
            `SELECT * FROM orders WHERE id = ?`,
            [req.params.id]
        );

        const [items] = await db.query(
            `SELECT 
                oi.quantity,
                oi.price,
                m.name
            FROM order_items oi
            JOIN menu_items m 
            ON oi.menu_item_id = m.id
            WHERE oi.order_id = ?`,
            [req.params.id]
        );

        res.json({
            order: order[0],
            items: items
        });

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Server error' });

    }
});
// ===============================
// REPORTS - SUMMARY
// ===============================
router.get('/reports/summary', async (req, res) => {
    try {

        const [[totalOrders]] = await db.query(
            `SELECT COUNT(*) as total FROM orders`
        );

        const [[totalRevenue]] = await db.query(
            `SELECT SUM(total_amount) as revenue FROM orders WHERE status != 'Cancelled'`
        );

        const [[totalUsers]] = await db.query(
            `SELECT COUNT(*) as users FROM users`
        );

        const [[totalRestaurants]] = await db.query(
            `SELECT COUNT(*) as restaurants FROM restaurants`
        );

        res.json({
            totalOrders: totalOrders.total,
            totalRevenue: totalRevenue.revenue || 0,
            totalUsers: totalUsers.users,
            totalRestaurants: totalRestaurants.restaurants
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});


// ===============================
// REPORTS - POPULAR DISHES
// ===============================
router.get('/reports/popular-dishes', async (req, res) => {
    try {

        const [rows] = await db.query(
            `SELECT 
                m.name,
                SUM(oi.quantity) as total_orders
            FROM order_items oi
            JOIN menu_items m ON oi.menu_item_id = m.id
            GROUP BY oi.menu_item_id
            ORDER BY total_orders DESC
            LIMIT 5`
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});


// ===============================
// REPORTS - RESTAURANT PERFORMANCE
// ===============================
router.get('/reports/restaurants', async (req, res) => {
    try {

        const [rows] = await db.query(
            `SELECT 
                r.name,
                COUNT(o.id) as total_orders,
                SUM(o.total_amount) as revenue
            FROM restaurants r
            LEFT JOIN orders o ON r.id = o.restaurant_id
            GROUP BY r.id
            ORDER BY revenue DESC`
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;