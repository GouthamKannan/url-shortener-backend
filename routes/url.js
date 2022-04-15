/**
 * API Endpoints to handle task relation functions
 */
const UrlController=require('../controller/url')
const router = require('express').Router();
const shortid = require('shortid');

/**
 * API Endpoint to add new url to the database
 */
router.post("/shorten_url", async (req, res) => {
  const {user_name, original_url} = req.body;
  try {
    const short_url = shortid.generate().toString()
    console.log(user_name, original_url, short_url)
    await UrlController.create(user_name, original_url ,short_url)

    console.log("returning")
    return res.status(200)
      .json({
        success : true,
        data : "url created"
      })
  } catch (err) {
    console.log(err);
    return res.status(200)
      .json({
        success : false,
        data : "Error in shortening url " + err.message
      })
  }
});

// API Endpoint to get url data from the database
router.post("/url_data", async (req, res) => {
  const {user_name} = req.body;
  try {
    var response = await UrlController.get_urls(user_name)
    return res.status(200)
    .json({
      success : true,
      data : response
    })
  } catch (err) {
    console.log(err);
    return res.status(200)
      .json({
        success : false,
        data : "Error in fetching data " + err.message
      })
  }
});

// API Endpont to get the created count and click count of url for last 30 days
router.post("/url_data_with_time", async (req, res) => {
  const {user_name} = req.body;
  try {
    var response = await UrlController.get_urls_with_time(user_name)
    return res.status(200)
    .json({
      success : true,
      data : response
    })
  } catch (err) {
    console.log(err);
    return res.status(200)
      .json({
        success : false,
        data : "Error in fetching data " + err.message
      })
  }
});

// API Endpoint to redirect to original url
router.get("/:short_url", async (req, res) => {
  const short_url = req.params.short_url
  try {
    var original_url = await UrlController.get_original_url(short_url)
    if(original_url) {
      await UrlController.increase_count(short_url)
      res.redirect(original_url)
    }
    else {
      return res.status(200)
      .json({
        success : false,
        data : "Invalid Link"
      })
    }
  } catch (err) {
    console.log(err);
    return res.status(200)
      .json({
        success : false,
        data : "Error in fetching data " + err.message
      })
  }
});


module.exports = router;