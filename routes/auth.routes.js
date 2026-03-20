const express = require("express");
const router = express.Router();

const { loginOrRegister } = require("../controllers/auth.controller");

router.post("/login", loginOrRegister);

module.exports = router;