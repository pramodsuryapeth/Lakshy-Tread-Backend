// routes/admin.routes.js
const express = require("express");
const router = express.Router();

const { loginAdmin, getDashboardStats } = require("../controllers/admin.controller");

router.post("/login", loginAdmin);
router.get("/dashboard", getDashboardStats);

module.exports = router;