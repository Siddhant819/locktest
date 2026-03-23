const mongoose = require('mongoose');

const lockStateSchema = new mongoose.Schema(
  {
    isLocked: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    lastUpdatedBy: {
      type: String,
      default: 'system',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LockState', lockStateSchema);
