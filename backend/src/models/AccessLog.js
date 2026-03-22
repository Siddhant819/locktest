const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: String,
      required: [true, 'User identifier is required'],
      trim: true,
    },
    method: {
      type: String,
      enum: ['pin', 'fingerprint', 'face', 'web'],
      required: [true, 'Access method is required'],
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: [true, 'Access status is required'],
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
    },
  },
  { timestamps: false }
);

accessLogSchema.index({ timestamp: -1 });
accessLogSchema.index({ user: 1 });
accessLogSchema.index({ status: 1 });

module.exports = mongoose.model('AccessLog', accessLogSchema);
