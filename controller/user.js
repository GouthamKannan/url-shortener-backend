/**
 * Controller to handle user registration and login
 */

 const mongodb = require("mongodb")
 const nodemailer = require('nodemailer')
 require("dotenv").config({ path: "../env" });
 const { client: mongoClient } = require("../model/mongodb");


 // Connect to database
 const dbConnection = mongoClient.db("url_shortener_application");

 // Get the collections from database
 const userCollection = dbConnection.collection("user_details");
 const codeCollection = dbConnection.collection("code_details");

 // Create a transport for sending mail
 var smtpTransport = nodemailer.createTransport({
   service: "Gmail",
   auth: {
       user: process.env.GMAIL_ID,
       pass: process.env.GMAIL_PASSWORD
   },
   tls : {
     rejectUnauthorized : false
   }

 });

 // Account status
 account_status = {
   inactive : "inactive",
   verified : "verified"
 }

 /**
 * Get user details using email address
 * @param {string} email : Email Address of the user
 * @returns : Array containing the details of the user
 */
 const getOneUser = async ( email ) => {
   const response = await userCollection.find({ email }).toArray();
   return response
 };

 /**
 * Get user based on the verification code
 * @param {string} ver_code : Verification code of the user
 * @returns : Array containing the details of the user
 */
 const getOneUserCode = async ( ver_code ) => {
   const response = await userCollection.find({ ver_code}).toArray();
   return response
 };

 /**
 * Get User details based on user_name and email
 * @param {string} user_name : User name of the user
 * @param {string} email : Email address of the user
 * @returns : Array containing the user details
 */
 const getOneUserName = async ( user_name, email ) => {
   const response = await userCollection.find({ user_name, email }).toArray();
   return response
 };

 const getOneUserId = async ( id ) => {
   const response = await userCollection.find({ _id : new mongodb.ObjectId(id) }).toArray();
   return response
 };

 const getAllUsers = async() => {
   const response = await userCollection.find({}).toArray();
   return response;
 }
 const approve_user = async (id) => {
   const response = await userCollection.updateOne({
     _id : new mongodb.ObjectId(id)
   },
   {
     $set : {
       admin_ver : true
     }
   })
 }

 const getUserResetCode = async(reset_code) => {
   const response = await codeCollection.find({reset_code}).toArray()
   return response;
 }

 const delete_user = async (id) => {
   const response = await userCollection.deleteOne({
     _id : new mongodb.ObjectId(id)
   })
 }


 /**
 * Create a new user in the database
 * @param {string} user_name : User name
 * @param {string} email : Email address
 * @param {string} password : Password
 * @param {string} ver_code : Verification code to verify email
 * @returns : Id of the inserted document
 */
 const create = async (user_name, email, password, ver_code) => {
   const response = await userCollection.insertOne({
     user_name,
     email,
     password,
     ver_code,
     status : account_status.inactive
   });
   return response;
 };

 /**
* Reset the password of the user
* @param {string} password : New passsword
* @param {string} reset_code : Password reset code
* @returns : true if password is reset else false
*/
const reset_password = async(password, reset_code) => {
  const response = await codeCollection.find({reset_code}).toArray()
  if (response.length == 1) {

      // Check for validity of the reset code
      var now = new Date()
      var seconds = (now.getTime() - response[0].createdAt.getTime()) /1000

      // The code is invalid if it is more than 1 hour from created time
      if (seconds <= 3600) {
        await userCollection.updateOne(
          {
            email : response[0].email
          },
          {
            $set : {
              password
            }
          }
        )
      }
      else {
        return "Expired link"
      }

      // Delete the code from DB
      await codeCollection.deleteOne({email : response[0].email})
      return true

  }
  else{
    return "Invalid link"
  }

}

 /**
 * Generate random code of given length
 * @param {number} length : Length to generate code
 * @returns : Random string
 */
 function generate_code(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() *
 charactersLength));
 }
 return result;
 }

 /**
 * Send Email to the given email address
 * @param {string} toAddress : The recipient Email address
 * @param {string} subject : Subject of the email
 * @param {string} body : Body of the email
 * @returns true if email is sent else message string
 */
 const send_email =  async (toAddress, subject, body) => {

     mailOptions={
       to : toAddress,
       subject : subject,
       html : body
     }
     try{
       await smtpTransport.sendMail(mailOptions)
     } catch(err) {
       console.log("error in sending mail ", err.message);
       return err.message;
     }

     return true;
 }

 /**
 * Send verification link to the user's email address to verify
 * @param {string} user_name : User name
 * @param {string} email : Email address of the user
 * @param {string} password : Password of the user
 * @param {string} protocol : 'http' or 'https'
 * @param {string} host : Server host address
 * @returns
 */
 const send_ver_link = async(user_name, email, password, protocol, host) => {

   var ver_code = generate_code(8)
   var link= protocol + "://" + host + "/user/verify_email/?id=" + ver_code;
   var body = "Hello, Please Click on the link to verify your email. <a href=" + link + ">Click here to verify</a>"
   var subject = "Email verification link"

   // Send the email to user's mail ID
   var sent =  await send_email(email, subject, body)
   console.log("Sent:", sent)

   // When mail is sent create a inactive account in database
   if(sent==true) {
     create(user_name, email, password, ver_code)
     return true
   }

   return sent
 }

 /**
* Send link to reset password
* @param {string} email : Email ID of the user
* @param {string} ui_host : Front end host to open password reset form
* @returns
*/
const send_reset_link = async(email, protocol, host) => {

  var reset_code = generate_code(8)
  var link = protocol + "://" + host + "/user/get_reset_form/?id=" + reset_code;
  console.log(link)
  var body = "Hello, Please Click on the link to reset your password. <a href=" + link + ">Click here to reset</a>"
  var subject = "Password reset link"

  // Send reset link to user's email
  var sent =  await send_email(email, subject, body)
  console.log("Sent:", sent)

  // When mail is sent, store the random token in the DB
  if(sent==true) {
    await codeCollection.deleteOne({email : email})
    await codeCollection.insertOne({
      createdAt: new Date(),
      email,
      reset_code
    })
    return true
  }

  return sent
}

 /**
 * Change th user account from inactive to active
 * @param {string} email : Email ID of the user
 */
 const verified_user = async (email) => {
   console.log(email, account_status.verified)
   userCollection.updateOne({
     email
   },
   {
     $set : {
       ver_code : "",
       status : account_status.verified
     }
   })
 }

 // Export functions
 module.exports = {
     create,
     getOneUser,
     send_reset_link,
     reset_password,
     send_ver_link,
     verified_user,
     getOneUserCode,
     getOneUserName,
     getOneUserId,
     approve_user,
     delete_user,
     getAllUsers,
     getUserResetCode,
     account_status
 }