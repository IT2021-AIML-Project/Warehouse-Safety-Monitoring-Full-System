const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI;

const users = [
  {
    username: 'msafety',
    email: 'msafety@safetyfirst.com',
    password: 'msafety123',
    fullName: 'Model Safety Administrator',
    role: 'model_inference',
    dashboardType: 'Model Inference Analysis, Validation and Logging'
  },
  {
    username: 'isafety',
    email: 'isafety@safetyfirst.com',
    password: 'isafety123',
    fullName: 'Inventory Safety Administrator',
    role: 'inventory_management',
    dashboardType: 'Safety Equipment Inventory Management'
  },
  {
    username: 'osafety',
    email: 'osafety@safetyfirst.com',
    password: 'osafety123',
    fullName: 'Operations Safety Administrator',
    role: 'operations_compliance',
    dashboardType: 'Safety Operations and Compliance Reporting'
  },
  {
    username: 'wsafety',
    email: 'wsafety@safetyfirst.com',
    password: 'wsafety123',
    fullName: 'Warehouse Safety Administrator',
    role: 'warehouse_config',
    dashboardType: 'Warehouse Configuration System'
  },
  {
    username: 'nsafety',
    email: 'nsafety@safetyfirst.com',
    password: 'nsafety123',
    fullName: 'Notification Safety Administrator',
    role: 'notification_reporting',
    dashboardType: 'Notification System and Monthly Reporting'
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Clear existing users (optional - comment out if you want to keep existing users)
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Insert new users
    const createdUsers = await User.insertMany(users);
    console.log(`✅ Successfully created ${createdUsers.length} users:`);

    createdUsers.forEach(user => {
      console.log(`   - Username: ${user.username} | Role: ${user.role} | Dashboard: ${user.dashboardType}`);
    });

    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.dashboardType}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Password: ${user.password}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
