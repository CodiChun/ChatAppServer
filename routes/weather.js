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

/**
 * @apiDefine JSONError
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */ 

/**
 * @api {get} /weather Request to add a chat
 * @apiName GetWeather
 * @apiGroup Weather
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {String} must provide city, latitude and longitude, or zipcode
 * @apiParam {String} provide current, hourly, or daily as forecast argument
 * 
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: Bad Forecast Argument) {String} Invalid argument for forecast
 * 
 * 
 * @apiUse JSONError
 */ 
router.post("/", (request, response, next) => {
    if ((isStringProvided(request.body.zipcode) || isStringProvided(request.body.city) || isStringProvided(request.body.latlong))
     && isStringProvided(request.body.forecast)) {
        next();
    } else {
        response.status(400).send({
          message: "Missing required information",
        });
    }
}, (request, response,next) => {
    let city = request.body.city
    let zipcode = request.body.zipcode
    let latlong = request.body.latlong
    let forecast = request.body.forecast
    // console.log("city: " + city + "\n"
    //  + "zipcode: " + zipcode + "\n"
    //  + "latlong: " + latlong + "\n"
    //  + "forecast: " + forecast)
    let url
    
    if (forecast == "current" && city != "NA"){
        url = "https://api.weatherbit.io/v2.0/current?city=" + city + "&units=I&key=3533b5d42baa4fa5b8dbdebd88798450"
        request.url = url
        next();
    }else if (forecast == "daily" && city != "NA"){
        url = "https://api.weatherbit.io/v2.0/forecast/daily?city=" + city + "&units=I&key=3533b5d42baa4fa5b8dbdebd88798450" 
        request.url = url
        next();
    }else if (forecast == "hourly" && city != "NA"){
        url = "https://api.weatherbit.io/v2.0/forecast/hourly?city=" + city + "&units=I&key=3533b5d42baa4fa5b8dbdebd88798450&hours=24"
        request.url = url
        next();
    }else if (forecast == "current" && zipcode != "NA"){
        url = "https://api.weatherbit.io/v2.0/current?postal_code=" + zipcode + "&units=I&key=3533b5d42baa4fa5b8dbdebd88798450"
        request.url = url
        next();
    }else if (forecast == "daily" && zipcode != "NA"){
        url = "https://api.weatherbit.io/v2.0/forecast/daily?postal_code=" + zipcode + "&units=I&key=3533b5d42baa4fa5b8dbdebd88798450" 
        request.url = url
        next();
    }else if (forecast == "hourly" && zipcode != "NA"){
        url = "https://api.weatherbit.io/v2.0/forecast/hourly?postal_code=" + zipcode + "&units=I&key=3533b5d42baa4fa5b8dbdebd88798450&hours=24"
        request.url = url
        next();
    }else if (forecast == "current" && latlong != "NA"){
        let temp = latlong.split(",")
        //console.log(temp)
        let lat = temp[0]
        let lon = temp[1]
        url = "https://api.weatherbit.io/v2.0/current?lat=" + lat + "&lon=" + lon +"&units=I&key=3533b5d42baa4fa5b8dbdebd88798450"
        request.url = url
        next();
    }else if (forecast == "daily" && latlong != "NA"){
        let temp = latlong.split(",")
        //console.log(temp)
        let lat = temp[0]
        let lon = temp[1]
        url = "https://api.weatherbit.io/v2.0/forecast/daily?lat=" + lat + "&lon=" + lon + "&units=I&key=3533b5d42baa4fa5b8dbdebd88798450"
        request.url = url
        next();
    }else if (forecast == "hourly" && latlong != "NA"){
        let temp = latlong.split(",")
        //console.log(temp)
        let lat = temp[0]
        let lon = temp[1]
        url = "https://api.weatherbit.io/v2.0/forecast/hourly?lat=" + lat+ "&lon=" + lon + "&units=I&key=3533b5d42baa4fa5b8dbdebd88798450&hours=24"
        request.url = url
        next();
    }else{
        response.status(400).send({
            message: "Invalid argument for forecast."
        })
    }
},(request, response) => {
    //console.log(request.url)
    fetchAsync(request.url)
    .then(data => response.status(200).send(data))
    .catch(reason => response.status(400).send(reason.message));
});

router.post("/userlocations",(request,response) =>{
    let query = `SELECT City FROM Locations WHERE MemberID=$1`
    let values = [request.body.id]
    //console.log(request.body.id)
    pool.query(query, values)
        .then(result => {
            if (result.rowCount > 0) {
                response.send({
                    rowCount : result.rowCount,
                    rows: result.rows
                })
            }
        }).catch(error => {
            response.status(401).send({
                message: "SQL Error",
                error: error
            })
            console.log(err)
        })
})

router.post("/addlocation",(request,response,next) => {
    if(isStringProvided(request.body.city)){
        next()
    }else{
        response.status(401).send({
            message: "Missing City"
        })
    }

} ,(request,response)=> {
    let query = `INSERT INTO Locations(MemberID,City) Values($1,$2)`
    let values = [request.body.id,request.body.city]
    pool.query(query,values).then(result => {
        response.send({
            success: true
        })
    }).catch(err => {
        response.status(400).send({
            message: "SQL Error",
            error: err
        })
    })
})


module.exports = router



