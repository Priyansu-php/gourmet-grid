const express = require('express');
const router = express.Router();
const db = require('../config/db');


/* =================================
   GET ALL ADDRESSES OF A USER
================================= */

router.get('/user/:id', async (req, res) => {
    try {

        const userId = req.params.id;

        const [rows] = await db.query(
            "SELECT * FROM addresses WHERE user_id = ?",
            [userId]
        );

        res.json(rows);

    } catch (err) {
        console.error("Get Address Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


/* =================================
   ADD NEW ADDRESS
================================= */

router.post('/', async (req, res) => {
    try {

        const { user_id, address_line, city, state, pincode } = req.body;

        if (!user_id || !address_line || !city || !state || !pincode) {
            return res.status(400).json({ message: "All fields required" });
        }

        const [result] = await db.query(
            `INSERT INTO addresses 
            (user_id, address_line, city, state, pincode) 
            VALUES (?, ?, ?, ?, ?)`,
            [user_id, address_line, city, state, pincode]
        );

        res.json({
            message: "Address added successfully",
            address_id: result.insertId
        });

    } catch (err) {
        console.error("Add Address Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


/* =================================
   DELETE ADDRESS
================================= */

router.delete('/:id', async (req, res) => {
    try {

        const addressId = req.params.id;

        await db.query(
            "DELETE FROM addresses WHERE id = ?",
            [addressId]
        );

        res.json({ message: "Address deleted" });

    } catch (err) {
        console.error("Delete Address Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;