const express = require("express");
const userController = require("../controller/user");
var bcrypt = require('bcrypt')
const router = express.Router();
const jwt = require("jsonwebtoken");

const JWT_SIGNING_KEY = process.env.JWT_SIGNING_KEY;

/**
 * API Endpoint to register user
 */
router.post("/signup", async (req, res) => {
  const { user_name, email, password } = req.body;
  if (!user_name || !email || !password) {
    return res.status(200).json({
      success: false,
      data: "username, password and mail ID is required",
    });
  }
  try {
    users = await userController.getOneUserName(user_name, email);
    // If user with same user name and email found
    if (users.length) {
      return res
        .status(200)
        .json({ success: false, data: "Given mail ID already exists" });
    }
    // Encrpyt the password
    const hashOfPassword = await bcrypt.hash(password, 10);

    // Send verification link to email
    var sent = await userController.send_ver_link(user_name, email, hashOfPassword, req.protocol, req.get('host'));
    if (sent==true) {
      return res
      .status(200)
      .json({ success: true, data: "Signup successful" });
    }
    else{
    return res
      .status(200)
      .json({ success: false, data: "cannot send verification email " + sent });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: `Error in creating the data :: ${error.message}`,
    });
  }
});

/**
 * API Endpoint to login user
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({
      success: false,
      data: "email and password is required",
    });
  }
  try {
    const userDetails = await userController.getOneUser(email);
    if (userDetails.length == 1) {
      try {
        // Compare with encrpyted password
        var result = bcrypt.compareSync(password, userDetails[0].password)

        // When password is invalid
        if (!result) {
            return res.status(200).json({ success: false, data: "Invalid password"});
        }
        else {
          // when user account is invalid
          if(userDetails[0].status == userController.account_status.inactive){
            return res.status(200).json({ success: false, data: "Email ID not verified"});
          }
        }
      } catch (error) {
        return res.status(401).json({ success: false, data: error.message });
      }

      // Create JWT Token and store in cookie
      const token = jwt.sign(userDetails[0].email, JWT_SIGNING_KEY);
      res.clearCookie("session_id");
      res.cookie("session_id", token);
      return res.status(200).json({
        success: true,
        data: userDetails[0].user_name,
        session_id: token
      });
    } else {
      return res.status(401).json({ success: false, data: "Invalid user" });
    }
  } catch (error) {
    console.error("Error in logging in :: ", error);
    return res
      .status(500)
      .json({ success: false, data: `Error in logging in ${error.message}` });
  }
});

/**
 * API Endpoint to logout
 */
router.get("/logout", async (req, res) => {
  return res.clearCookie("session_id")
    .status(200)
    .json({ success: true, data: "Logged out sucessfully" });
});

/**
 * API Endpoint to send password reset link
 */
 router.post("/send_reset_link", async (req, res) => {

  const { email } = req.body;
  if (!email) {
    return res.status(200).json({
      success: false,
      data: "username is required",
    });
  }
  const response = await userController.getOneUser(email)
  if (response.length == 1){
      // Send password reset link
      var sent = await userController.send_reset_link(email, req.protocol, req.get('host'))

      // When email is sent
      if(sent==true) {
        return res.status(200).json({
          success: true,
          data: "Password reset link is sent to registered email ID",
        });
      }
      // When email is not sent
      else if(sent==false) {
          return res.status(200).json({
            success: false,
            data: "Invalid email ID",
          });
      }
      else {
        return res.status(200).json({
          success: false,
          data: "Cannot send password rest link" + sent,
        });
      }
    }
    else {
      return res.status(200).json({
        success: false,
        data: "Email ID not found",
      });
    }

})

router.get("/get_reset_form", async (req, res) => {
  var reset_code = req.query.id

  try {
    var response = await userController.getUserResetCode(reset_code);
    if (response.length == 1) {

      // Check for validity of the reset code
      var now = new Date()
      var seconds = (now.getTime() - response[0].createdAt.getTime()) /1000

      // The code is invalid if it is more than 1 hour from created time
      if (seconds <= 3600) {
        res.redirect(process.env.UI_HOST + "/reset-password/" + reset_code)
      }
      else {
        return res.status(200).json({
          message: "Expired link",
        });
      }
    }
    else {
      return res.status(200).json({
        message: "Invalid link",
      });
    }
  } catch (error) {
    console.error("Error in logging in :: ", error);
    return res
      .status(500)
      .json({ success: false, data: `Error in logging in ${error.message}` });
  }
})

/**
 * API Endpoint to reset password
 */
router.post("/reset_password", async (req, res) => {
  const { password, reset_code } = req.body;
  if (!password || !reset_code) {
    return res.status(200).json({
      success: false,
      data: "username, password and code is required",
    });
  }
  try {
    // Encrpyt new password
    const hashOfPassword = await bcrypt.hash(password, 10);

    // Reset the password
    var status = await userController.reset_password(hashOfPassword, reset_code);

    // Invalid or expired link
    if (status === "Expired link" || status === "Invalid link") {
      return res
        .status(200)
        .json({ success: false, data: status });
    }
    else
    {
      return res
        .status(200)
        .json({ success: true, data: "Password reset" });
    }
  }catch (error) {
    console.error("Error in logging in :: ", error);
    return res
      .status(500)
      .json({ success: false, data: `Error in logging in ${error.message}` });
  }

});

/**
 * API Endpoint to verify email address
 */
router.get("/verify_email", async(req, res) => {
  try {
    var ver_code = req.query.id

    // Get user details
    const response = await userController.getOneUserCode(ver_code)
    if(response.length==1)
    {
        // Change the account state to active
        await userController.verified_user(response[0].email)
        res.redirect(process.env.UI_HOST + "/login/email_verified")
    }
    else {
      return res.json("verification failed. Invalid link");
    }
  }catch (error) {
    console.error("Error in verifying :: ", error);
    return res.json("verification failed. " + error.message);
  }
})

module.exports = router;
