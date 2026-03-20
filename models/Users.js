const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },

  role: {
    type: String,
    default: "user"
  },

  otp: String,
  otpExpire: Date

}, {
  timestamps: true
});

module.exports = mongoose.model("User", UserSchema);