const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
    console.log('Connecting to database...');

    // Connect without database first to create it if it doesn't exist
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    try {
        console.log('Reading schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema.sql...');
        await connection.query(schemaSql);

        // Switch to the database for inserting seed data
        await connection.query('USE food_delivery');

        console.log('Schema created successfully. Seeding mock data...');

        // Check if users exist
        const [users] = await connection.query('SELECT * FROM users');

        if (users.length === 0) {
            console.log('Inserting mock users...');
            const customerPass = await bcrypt.hash('password123', 10);
            const adminPass = await bcrypt.hash('admin123', 10);
            const restPass = await bcrypt.hash('rest123', 10);

            const [userResult] = await connection.query(
                `INSERT INTO users (name, email, password_hash, role) VALUES 
                ('Alice Customer', 'alice@example.com', ?, 'customer'),
                ('Bob Admin', 'admin@example.com', ?, 'admin'),
                ('Chef Mario', 'mario@example.com', ?, 'restaurant')`,
                [customerPass, adminPass, restPass]
            );

            const restaurantOwnerId = userResult.insertId + 2; // Chef Mario

            console.log('Inserting mock restaurants...');
            const [restResult] = await connection.query(
                `INSERT INTO restaurants (owner_id, name, cuisine_type, rating, is_active) VALUES 
                (4, "Mario's Italian", 'Italian', 4.8, TRUE),
                (3, "Burger Haven", 'American', 4.5, TRUE),
                (5, "Spicy Dragon", 'Chinese', 4.7, TRUE)`,
                [restaurantOwnerId, restaurantOwnerId, restaurantOwnerId]
            );

            const firstRestId = restResult.insertId;

            console.log('Inserting mock menu items...');
            await connection.query(
                `INSERT INTO menu_items (restaurant_id, name, description, price, is_available) VALUES 
                (?, 'Spaghetti Carbonara', 'Classic Roman pasta dish with egg, cheese, pancetta, and black pepper.', 18.50, TRUE),
                (?, 'Margherita Pizza', 'Wood-fired crust with San Marzano tomatoes and mozzarella.', 16.00, TRUE),
                (?, 'Tiramisu', 'Coffee-flavoured Italian dessert.', 8.50, TRUE),
                (?, 'Cheeseburger', 'Double patty with cheddar cheese, lettuce, and tomato.', 14.00, TRUE),
                (?, 'Kung Pao Chicken', 'Spicy, stir-fried Chinese dish made with cubes of chicken, peanuts, vegetables, and chili peppers.', 15.50, TRUE)`,
                [firstRestId, firstRestId, firstRestId, firstRestId + 1, firstRestId + 2]
            );

            console.log('Mock data inserted successfully!');
        } else {
            console.log('Database already contains users. Skipping mock data insertion.');
        }

    } catch (error) {
        console.error('Error during seeding:', error);
    } finally {
        await connection.end();
        console.log('Database connection closed.');
    }
}

seed();
