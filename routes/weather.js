//express is the framework we're going to use to handle requests
const express = require('express');
//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool
const router = express.Router()
const msg_functions = require('../utilities/exports').messaging
const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided
//Handler for processing async external get requests.
//Source: https://gist.github.com/msmfsd/fca50ab095b795eb39739e8c4357a808
async function fetchAsync (u) {
    let response = await fetch(u);
    let data = await response.json();
    return data;
}
router.get("/", (request, response, next) => {
    if (isStringProvided(request.query.zipcode) && isStringProvided(request.query.forecast)) {
        next();
    } else {
        response.status(400).send({
          message: "Missing required information",
        });
    }
}, (request, response) => {
    let forecast = request.query.forecast
    let url

    if (forecast == "current"){
        url = "https://api.weatherbit.io/v2.0/current?city=Tacoma,WA&units=I&key=3533b5d42baa4fa5b8dbdebd88798450"
    }else if (forecast == "daily"){
        url = "https://api.weatherbit.io/v2.0/forecast/daily?city=Tacoma,WA&units=I&key=3533b5d42baa4fa5b8dbdebd88798450" 
    }else if (forecast == "hourly"){
        url = "https://api.weatherbit.io/v2.0/forecast/hourly?city=Tacoma,WA&units=I&key=3533b5d42baa4fa5b8dbdebd88798450&hours=24"
    }else{
        response.status(400).send({
            message: "Invalid argument for forecast."
        })
    }
    fetchAsync(url)
    .then(data => response.status(200).send(data))
    .catch(reason => response.status(400).send(reason.message));
});