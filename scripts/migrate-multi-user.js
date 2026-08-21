require('dotenv').config();
const mongoose = require('mongoose');
const Mail = require('../models/Mail');
const Counter = require('../models/Counter');
const User = require('../models/User');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const owner = await User.findOne().sort({ createdAt: 1 });
  if (!owner) throw new Error('Opret den første bruger før migrationen køres.');

  const [projects, mails] = await Promise.all([
    Counter.updateMany({ ownerId: { $exists: false } }, { $set: { ownerId: owner._id } }),
    Mail.updateMany({ ownerId: { $exists: false } }, { $set: { ownerId: owner._id } })
  ]);

  const indexes = await Mail.collection.indexes();
  const oldIndex = indexes.find(index => index.unique && Object.keys(index.key).length === 1 && index.key.gmail_id === 1);
  if (oldIndex) await Mail.collection.dropIndex(oldIndex.name);
  await Mail.syncIndexes();

  console.log(`Migration færdig: ${projects.modifiedCount} projekter og ${mails.modifiedCount} mails til ${owner.email}.`);
  await mongoose.disconnect();
}

migrate().catch(async error => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
