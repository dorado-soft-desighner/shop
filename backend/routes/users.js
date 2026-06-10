const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/mysqlDb');
const { pool } = require('../database/dbConfig');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/users - Get all users (Admin Only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await db.findAll('users');
    const safeUsers = users.map(({ password_hash, ...u }) => u);
    res.json(safeUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/users - Create new user login (Admin Only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Username, password, full name, and role are required.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Username '${username}' is already taken.` });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = await db.insert('users', {
      username: username.toLowerCase(),
      password_hash: passwordHash,
      full_name,
      role,
      status: 'active'
    });

    const { password_hash, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/users/:id - Update user / Reset password (Admin Only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { password, full_name, role, status } = req.body;
    const userId = Number(req.params.id);

    const user = await db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (role) {
      if (userId === req.user.id && role !== 'admin') {
        return res.status(400).json({ error: 'You cannot revoke your own admin credentials.' });
      }
      updates.role = role;
    }
    if (status) {
      if (userId === req.user.id && status !== 'active') {
        return res.status(400).json({ error: 'You cannot deactivate your own administrative login.' });
      }
      updates.status = status;
    }
    if (password) {
      updates.password_hash = bcrypt.hashSync(password, 10);
    }

    if (Object.keys(updates).length > 0) {
      const updatedUser = await db.update('users', userId, updates);
      const { password_hash, ...safeUser } = updatedUser;
      return res.json(safeUser);
    }
    
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/users/:id - Delete a user (Admin Only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own administrative login.' });
    }

    const success = await db.delete('users', userId);
    if (!success) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
