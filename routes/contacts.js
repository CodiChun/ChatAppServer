
/**
 * Backend routes for contacts
 * @author Julia Kulev
 */

//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool

const router = express.Router()

const validation = require('../utilities/exports').validation
let isStringProvided = validation.isStringProvided


/**
 * @api {get} /list Request to list contacts
 * @apiName getList
 * @apiGroup Contacts
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {Number} memberid_a memberid of user
 * 
 * @apiSuccess (200: Success) {JSON} contacts json array
 * 
 *  @apiSuccessExample {json} Success-Response:
 *    HTTP/1.1 200 OK
 *   {
 *     "contacts": [],
 *     "incoming_requests": [],
 *     "outgoing_requests": []
 *    }
 * 
 * @apiError (400: Bad Request) {String} message "🚫Bad request!"
 * 
 * @apiError (404: Missing Parameters) {String} message "Contacts not found"
 * 
 * @apiError (400: SQL Error) {String} message contacts getting error
 * 
 * @apiUse JSONError
 */ 
router.get('/list', function(req, res, next){
    const memberid_a = req.headers.memberid_a;
    if (memberid_a.length < 1) {
        res.status(400).send('🚫Bad request!') 
    }
    
    const theQuery = 'SELECT memberid,username,firstname,lastname,contacts.verified FROM contacts INNER JOIN Members ON contacts.memberid_b = members.memberid WHERE memberid_a=$1 AND verified=$2'
    const values = [memberid_a,1]

    pool.query(theQuery, values)
            .then(result => { 
                
                    const contacts = JSON.stringify(Object.assign({}, result.rows))
                    req.contacts = contacts
                    req.memberid = memberid_a
                    next()
                 
            })
            .catch((error) => {
                console.log("contacts geting error")
                console.log(error)
            })
  }, (req, res, next) => {
    const theQuery = 'SELECT memberid,username,firstname,lastname,contacts.verified FROM contacts INNER JOIN Members ON contacts.memberid_a = members.memberid WHERE memberid_b=$1 AND verified=$2'
    const values = [req.memberid,0]

    pool.query(theQuery, values)
            .then(result => { 

                    const contacts = JSON.stringify(Object.assign({}, result.rows))
                    req.incoming_requests = contacts
                    next()
                
            })
            .catch((error) => {
                console.log("contacts geting error")
                console.log(error)
            })

  }, (req, res) => {
    const theQuery = 'SELECT memberid,username,firstname,lastname,contacts.verified FROM contacts INNER JOIN Members ON contacts.memberid_b = members.memberid WHERE memberid_a=$1 AND verified=$2'
    const values = [req.memberid,0]

    pool.query(theQuery, values)
            .then(result => { 

                    const contacts = JSON.stringify(Object.assign({}, result.rows))
                    req.outgoing_requests = contacts
                    res.send('{"friends":' + req.contacts + ',"incoming_requests":' + req.incoming_requests + ',"outgoing_requests":' + req.outgoing_requests + '}')

            })
            .catch((error) => {
                console.log("contacts geting error")
                console.log(error)
            })

  })

  /**
 * @api {post} contacts/request Request to send friend request
 * @apiName postRequest
 * @apiGroup Contacts
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {String} email email of user
 * 
 * @apiSuccess (200: Success) {JSON} memberid_a memberid of user, memberid_b memberid of friend, verified
 * 
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *  {
 *   "memberid_a": 1,
 *   "memberid_b": 2,
 *   "verified": 0
 * }
 * 
 * @apiError (400: Bad Request) {String} message "🚫Bad request!"
 * @apiErorr (404: Missing Parameters) {String} message "invalid input, error 22"
 * @apiError (409: Conflict) {String} message "request already exists"
 * 
 * 
 * @apiUse JSONError
 */ 
router.post('/request', function(req, res, next) {
    //get user info by email
    const email = req.headers.email;

    theQuery = 'SELECT memberid, username, firstname, lastname, email FROM MEMBERS WHERE email = $1'
    const values = [email]

    pool.query(theQuery, values)
            .then(result => { 
                if (result.rowCount == 0) {
                    res.status(404).send('User is not found')
                    return
                } else {
                        req.memberid_a = req.decoded.memberid
                        req.memberid_b = result.rows[0].memberid
                        req.username = result.rows[0].username
                        req.firstname = result.rows[0].firstname
                        req.lastname = result.rows[0].lastname
                        req.email = result.rows[0].email
                        req.user = result.rows
                        console.log("found user")
                        next();
                }   
                
            })
            .catch((error) => {
                console.log("member lookup error")
                console.log(error)
            })
}, (req,res,next) =>{

    //check if request exists in db already
    theQuery = 'SELECT memberid_a, memberid_b, verified FROM CONTACTS WHERE memberid_a = $1 AND memberid_b = $2'
    const values = [req.memberid_a, req.memberid_b]

    pool.query(theQuery, values)
            .then(result => { 
                if (result.rowCount == 0) {
                    console.log("no duplicates")
                    if (req.memberid_a == req.memberid_b) {
                        res.status(408).send('You cannot send request to yourself!')
                        return
                    } else {
                        next();
                    }
                    
                } else {
                        res.status(409).send('Friend request already exists')
                        return
                }   
                
            })
            .catch((error) => {
                console.log("member lookup error")
                console.log(error)
            })

},
 (req, res) => {
    //add request to db
    let theQuery = "INSERT INTO CONTACTS(memberid_a, memberid_b, verified) VALUES ($1, $2, $3) RETURNING memberid_a, memberid_b, verified"
    const values = [req.memberid_a,req.memberid_b, 0]

    pool.query(theQuery, values)
            .then(result => { 
                if (result.rowCount == 0) {
                    res.status(404).send('invalid input, error 22')
                    return
                } else {
                        req.request = result.rows
                        console.log("added friend request")
                        res.status(200).send({
                            success: true,
                            memberid_a: req.memberid_a,
                            memberid_b: req.memberid_b,
                            verified: 0
                        })
                }   
                
            })
            .catch((error) => {
                console.log("contact insert error")
                console.log(error)
            })

})

/**
 * @api {get} contacts/request get friend request
 * @apiName getRequest
 * @apiGroup Contacts
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {String} memberid_a memberid of user
 * @apiParam {String} memberid_b memberid of another user
 * 
 * @apiError (404: Request not found) {String} message "Request not found"
 * 
 * @apiSuccess (200: Success) {JSON} memberid_a memberid of user, memberid_b memberid of friend, verified
 * 
 * @apiSuccessExample {json} Success-Response:
 *  HTTP/1.1 200 OK
 * {
 *  "memberid_a": 1,
 *  "memberid_b": 2,
 *  "verified": 0
 * }
 * 
 * 
 * @apiUse JSONError
 */ 

router.get('/request', function(req, res) {
    //get user info by email
    const memberid_b = req.headers.memberid_b;
    const memberid_a = req.decoded.memberid;

   //check if request exists in db already
   theQuery = 'SELECT memberid_a, memberid_b, verified FROM CONTACTS WHERE memberid_a = $1 AND memberid_b = $2'
   const values = [memberid_a, memberid_b]

   pool.query(theQuery, values)
           .then(result => { 
               if (result.rowCount == 0) {
                    res.status(404).send({
                        success: false,
                        message: 'Request not found'
                    })
                    return
               } else {
                res.status(200).send({
                    success: true,
                    memberid_a: result.rows[0].memberid_a,
                    memberid_b: result.rows[0].memberid_b,
                    verified: result.rows[0].verified
                })
               }   
               
           })
           .catch((error) => {
               console.log("request lookup error")
               console.log(error)
           })
})

module.exports = router