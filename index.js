const express = require("express");
const cors = require('cors');
require("dotenv").config({ path: ".env" });
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const JWT_SIGNING_KEY = process.env.JWT_SIGNING_KEY;

// Initialize the express server
const app = express();
app.use(cookieParser());
app.use(cors({credentials: true, origin: process.env.UI_HOST}));
app.use(express.json());

// Middleware to check JWT token
app.use((req, res, next) => {
  if (req.cookies.session_id) {
      try {
          userDetails = jwt.verify(req.cookies.session_id, JWT_SIGNING_KEY)
      } catch (error) {
          console.error('Error in verifying JWT :: ', error)
          return res.status(401).json({ success: false, data: "Invalid session" })
      }
  }
  next()
})

// API endpoint for testing
app.get("/", (req, res) => {
  return res.json("success");
});

// Initialize routes
const urlRouter = require('./routes/url');
const userRouter = require('./routes/user');
app.use('/', urlRouter);
app.use('/user', userRouter);

// Set the port to listen
app.listen(process.env.PORT, () => {
  console.log(`server running at port ${process.env.PORT}`);
});
