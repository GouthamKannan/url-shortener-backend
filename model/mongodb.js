const mongodb = require("mongodb")
require("dotenv").config();

// Password for MongoDB database
const mongodbPassword = process.env.MONGODB_PASSWORD;

// MongoDB Atlas URL
const url = `mongodb+srv://goutham:${mongodbPassword}@database.0mmh4.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

// Connect to MongoDB Atlas
const client = new mongodb.MongoClient(url);
console.log(`DB connected :: ${mongodbPassword}`);

// Error if cannot connect to MongoDB Atlas
client.connect().catch((err) => {
  console.error("Error in connecting to mongodb :: ", err);
});

module.exports = { client };
