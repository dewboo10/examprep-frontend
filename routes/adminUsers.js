const express = require('express');
const router = express.Router();
const User = require('../models/User');
const adminAuth = require('../middleware/admin');

// GET /api/admin/users - Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, {
      _id: 1,
      name: 1,
      email: 1,
      tier: 1,
      status: 1,
      role: 1,
      createdAt: 1,
      lastLogin: 1,
      premiumExpiry: 1,
      stats: 1
    }).sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch users' 
    });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, tier, status } = req.body;
    const userId = req.params.id;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email, 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already taken by another user'
      });
    }

    // Prepare update data
    const updateData = { 
      name, 
      email, 
      status: status || 'active'
    };

    // Only update tier if it's a valid value
    if (tier && ['free', 'mid', 'premium'].includes(tier)) {
      updateData.tier = tier;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent deleting admin users
    const user = await User.findById(userId);
    if (user && user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }
    
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// GET /api/admin/users/stats - Get user statistics
router.get('/users/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ tier: 'premium' });
    const midUsers = await User.countDocuments({ tier: 'mid' });
    const freeUsers = await User.countDocuments({ tier: 'free' });
    const activeUsers = await User.countDocuments({ status: 'active' });
    
    // Count users active today (last login within 24 hours)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeToday = await User.countDocuments({
      lastLogin: { $gte: today }
    });

    res.json({
      totalUsers,
      premiumUsers,
      midUsers,
      freeUsers,
      activeUsers,
      activeToday
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

module.exports = router; 