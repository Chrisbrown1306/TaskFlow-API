/**
 * Seed the database with a default admin user.
 * Run once:  node src/utils/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const ADMIN = {
  id:       uuidv4(),
  name:     'Admin User',
  email:    'admin@taskflow.dev',
  password: 'Admin@1234',
  role:     'admin',
};

const DEMO = {
  id:       uuidv4(),
  name:     'Demo User',
  email:    'demo@taskflow.dev',
  password: 'Demo@1234',
  role:     'user',
};

function seed(user) {
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
  if (exists) {
    console.log(`⚠  User ${user.email} already exists – skipping.`);
    return;
  }
  const hash = bcrypt.hashSync(user.password, 12);
  db.prepare(`
    INSERT INTO users (id, name, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.id, user.name, user.email, hash, user.role);
  console.log(`✅ Created ${user.role}: ${user.email} / ${user.password}`);
}

seed(ADMIN);
seed(DEMO);

// Seed a few demo tasks for the demo user
const demoUserId = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO.email)?.id;
if (demoUserId) {
  const count = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ?').get(demoUserId).c;
  if (count === 0) {
    const tasks = [
      { title: 'Set up the project repository', status: 'done',        priority: 'high',   description: 'Init git, create README, push to GitHub.' },
      { title: 'Design database schema',        status: 'done',        priority: 'high',   description: 'ER diagram and migration scripts.' },
      { title: 'Build authentication APIs',     status: 'in_progress', priority: 'high',   description: 'JWT login/register/refresh endpoints.' },
      { title: 'Write Swagger documentation',   status: 'todo',        priority: 'medium', description: 'Document all endpoints with examples.' },
      { title: 'Deploy to production',           status: 'todo',        priority: 'low',    description: 'Docker + cloud deployment.' },
    ];
    const insert = db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    tasks.forEach(t => insert.run(uuidv4(), t.title, t.description, t.status, t.priority, demoUserId));
    console.log(`✅ Seeded ${tasks.length} demo tasks.`);
  }
}

console.log('\n🎉 Seeding complete!');
process.exit(0);
