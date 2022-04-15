/**
 * Controller for handling task related functions
 */
const { client: mongoClient } = require("../model/mongodb");

// Connect to MongoDB database
const dbConnection = mongoClient.db("url_shortener_application");

// Initialize the collections for the database
const urlCollection = dbConnection.collection("url_details");

// Add url to database
const create = async (user_name, original_url, short_url) => {
  var cur_date = new Date()
  const response = await urlCollection.insertOne({
    user_name,
    original_url,
    short_url,
    count : 0,
    createdAt : cur_date.toDateString(),
    createdDate : cur_date
  });
  return response;
}

// Get the urls from the database for particular user
const get_urls = async (user_name) => {
  const response = await urlCollection.find({user_name : user_name}).toArray();
  return response;
}

// Get last 30 days urls created count and click count
 const get_urls_with_time = async (user_name) => {
  const response = await urlCollection.find({user_name : user_name}).toArray();
  var daily_count = {}
  var click_count = {}
  cur_date = new Date()

  response.forEach(document => {
    if(((cur_date - document.createdDate) / (1000 * 60 * 60 * 24)) <= 30) {
      if(document.createdAt in daily_count){
        daily_count[document.createdAt]++;
      }else{
        daily_count[document.createdAt] = 1;
      }
      click_count[document.short_url] = document.count;
    }
  })

  console.log(daily_count, click_count)
  return {daily_count, click_count};
}

// Get the original url from the database
const get_original_url = async ( short_url ) => {

  const response = await urlCollection.find({short_url}).toArray();
  return response[0].original_url;
}

// Increase the count for url on clicking
const increase_count = async (short_url) => {
  var response = await urlCollection.find({short_url}).toArray()
  console.log(response)
  await urlCollection.updateOne({
    short_url
  },
  {
    $set : {
      count : response[0].count + 1
    }
  })
}

// Exports functions
module.exports = {
  create,
  get_urls,
  get_urls_with_time,
  get_original_url,
  increase_count
}