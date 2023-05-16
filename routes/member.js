//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool

const router = express.Router()

const validation = require('../utilities/exports').validation
let isStringProvided = validation.isStringProvided



/**
 * @api {get} /:memberId? Request to get the chats of user
 * @apiName GetChats
 * @apiGroup Chats
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {Number} memberId the chat to look up. 
 * 
 * @apiSuccess {Number} rowCount the number of chatIds returned
 * @apiSuccess {Object[]} chats List of memberId
 * 
 * @apiError (404: memberId Not Found) {String} message "Member ID Not Found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. memberId must be a number" 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get("/:memberId/", (request, response, next) => {
    //validate on missing or invalid (type) parameters
    if (!request.params.memberId) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.params.memberId)) {
        response.status(400).send({
            message: "Malformed parameter. memberId must be a number"
        })
    } else {
        next()
    }
},  (request, response, next) => {
    //validate member id exists
    let query = 'SELECT * FROM chatmembers WHERE chatmembers.memberid = $1'
    let values = [request.params.memberId]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Member ID not found"
                })
            } else {
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
    }, (request, response) => {
    //Retrieve the Chats
    let query = `SELECT chats.chatid, name 
    FROM chatmembers 
    JOIN chats on chatmembers.chatid = chats.chatid 
    WHERE chatmembers.memberid = $1`
    let values = [request.params.memberId]
    pool.query(query, values)
        .then(result => {
            response.json(result.rows); // directly send rows as a JSONArray
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
});




module.exports = router