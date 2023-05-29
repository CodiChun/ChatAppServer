
/**
 * Backend routes for contacts
 * @author Julia Kulev
 */

const { response } = require('express')
const express = require('express')
const { request } = require('express')
const { CLIENT_MULTI_RESULT } = require('mysql/lib/protocol/constants/client.js')

const pool = require('../utilities').pool

const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided
const message_func = require('../utilities').messaging

const middleware = require('../middleware')
const jwt = require('../middleware/jwt')


const url = require('url');
const querystring = require('querystring');
const { nextTick } = require('process');

const router = express.Router()


/**
 * @api {get} /list of contacts both existing and pending
 * @apiName getList
 * @apiGroup Contacts
 * 
 * @apiParam {Number} memberid_a memberid of user
 * 
 * @apiSuccess (200: Success) {JSON} contacts json array
 * 
 * @apiError (404: Missing Parameters) {String} message "Contacts not found"
 * @apiError (400: SQL Error) {String} message contacts getting error
 */ 
router.get('/list',
    (request, response, next) => {
        //if no memberid is provided send an error
        if (request.params.memberid === null) {
            response.status(400).send({message: 'No memberid present',});
        } else {
            next();
        }
    },
    (request, response, next) => {
        //make sure the memberid provided exists in the database
        let query = `SELECT * FROM Credentials WHERE MemberID=$1`;
        let values = [request.params.memberid];

        pool.query(query, values)
            .then((result) => {
                next();
            })
            .catch((error) => {
                response.status(400).send({
                    message: 'SQL Error',
                    error: error,
                });
            });
    },
    (request, response) => {
        // perform the Select*
        let query = `SELECT Members.MemberId as id, Members.FirstName AS FirstName, Members.LastName AS LastName, Members.Nickname AS Nickname, Members.Email AS Email
                        FROM Contacts LEFT JOIN Members ON Members.MemberID = Contacts.MemberID_A
                        WHERE MemberID_B=$1 AND Contacts.verified = $2
                        ORDER BY LastName ASC`;
        let values = [request.params.memberid, request.params.verified];

        pool.query(query, values)
            .then((result) => {
                response.send({
                    userId: request.params.memberid,
                    rowCount: result.rowCount,
                    rows: result.rows,
                });
            })
            .catch((err) => {
                response.status(400).send({
                    message: 'SQL Error',
                    error: err,
                });
            });
    }
);

router.post('/request', middleware.checkToken,
    (request, response, next) => {
        let query = 'SELECT * FROM Contacts WHERE MemberID_A=$1';
        let values = [request.decoded.memberid];
        console.log(request.decoded.memberid)
        pool.query(query, values)
            .then((result) => {
                if (result.rowCount == 0) {
                    response.status(400).send({
                        message: 'memberid not found!',
                    });
                } else {
                    response.firstname = result.rows[0].firstname;
                    response.lastname = result.rows[0].lastname;
                    response.nickname = result.rows[0].nickname;
                    response.email = result.rows[0].email;
                    next();
                }
            })
            .catch((err) => {
                console.log('error finding user: ' + err);
                response.status(400).send({
                    message: 'SQL error',
                });
            });
    }, (request, response, next) => {
        // verify that friend does not already exist!
        let query = `SELECT MemberID_B FROM Contacts WHERE (MemberID_A=$1 AND MemberID_B=$2)
                    OR (MemberID_B=$1 AND MemberID_A=$2)`
        let values = [request.decoded.memberid, request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                if (result.rowCount!=0) {
                    response.status(200).send({
                        message: 'pending friend request already exists.'
                    })
                } else {
                    next()
                }
            })
    },(request, response) => {
        // insert new unverified friend
        let query =
            `INSERT into Contacts (PrimaryKey, MemberID_A, MemberID_B, Verified) VALUES (DEFAULT, $1, $2, 0)
            RETURNING MemberID_B, Verified`;
        let values = [request.decoded.memberid, request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                if (result.rowCount == 0) {
                    response.status(200).send({
                        message: 'Error inserting friend request!'
                    })
                } else {
                    response.memberid_b = result.rows[0].memberid_b;
                    response.verify = result.rows[0].verified;
                    //next()
                }
            })
            .catch((err) => {
                console.log('error adding: ' + err);
                response.status(400).send({
                    message: 'SQL Error: Insert failed',
                });
            });
    }
    
);
module.exports = router
