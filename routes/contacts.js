
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
 */ 
router.get('/list/:memberId/:verified',
    (request, response, next) => {
        //if no memberid is provided send an error
        if (!request.params.memberId) {
            response.status(400).send({message: 'No memberid present',});
        } else {
            next();
        }
    },
    (request, response, next) => {
        //make sure the memberid provided exists in the database
        let query = `SELECT * FROM Credentials WHERE MemberID=$1`;
        let values = [request.params.memberId];

        pool.query(query, values)
            .then((result) => {
                if(result.rowCount > 0) {
                    next();
                } else {
                    response.status(404).send({
                        message: 'User not found',
                    });
                }
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
        let query = `SELECT Members.MemberId as id, Members.FirstName AS FirstName, Members.LastName AS LastName, Members.username AS Nickname, Members.Email AS Email
        FROM Members
        WHERE Members.MemberID IN (
            SELECT MemberID_B FROM Contacts WHERE MemberID_A=$1 AND Verified=$2
            UNION ALL
            SELECT MemberID_A FROM Contacts WHERE MemberID_B=$1 AND Verified=$2
        )
        ORDER BY LastName ASC`;
        let values = [request.params.memberId, request.params.verified];

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


/**
 * @api {post} /request to add a contact
 * @apiName contactRequest
 * @apiGroup Contacts
 * 
 * @apiParam {String} memberid_a memberid of user requesting
 * @apiParam {String} memberid_b memberid of contact being requested
 * 
 * @apidescription This endpoint is a post used to request a contact
 */

router.post('/request', middleware.checkToken,
    (request, response, next) => {

        //make sure that the requested contact actually exists
        let query = 'SELECT * FROM Contacts WHERE MemberID_A=$1';
        let values = [request.decoded.memberid];
        pool.query(query, values)
            .then((result) => {
                //if not send an error
                if (result.rowCount == 0) {
                    response.status(400).send({
                        message: 'User not found',
                    });
                    //otherwise populate the response object with the user's info
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
        //verify that the requested contact isnt already in the contact list
        let query = `SELECT MemberID_B FROM Contacts WHERE (MemberID_B=$1 AND MemberID_A=$2)
                    OR (MemberID_A=$1 AND MemberID_B=$2)`
        let values = [request.decoded.memberid, request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                //if contact exists send an error
                if (result.rowCount!=0) {
                    response.status(200).send({
                        message: 'Contact is already in the contact list'
                    })
                    //otherwise proceed to add contact
                } else {
                    next()
                }
            })
    },(request, response) => {
        //instert a new contact into the database with the verified flag set to 0
        let query =
            `INSERT into Contacts (PrimaryKey, MemberID_A, MemberID_B, Verified) VALUES (DEFAULT, $1, $2, 0)
            RETURNING MemberID_B, Verified`;
        let values = [request.decoded.memberid, request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                if (result.rowCount == 0) {
                    response.status(200).send({
                        message: 'Error inserting contact'
                    })
                } else {
                    response.memberid_b = result.rows[0].memberid_b;
                    response.verify = result.rows[0].verified;
                    
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


/**
 * @api {post} /verify to verify a contact
 * @apiName contactRequest
 * @apiGroup Contacts
 * 
 * @apiParam {String} memberid_a memberid of user requesting
 * @apiParam {String} memberid_b memberid of contact being requested
 * 
 * @apidescription This endpoint is a post used to accept a request from a contact
 */
router.post(
    '/verify/:memberid?',
    middleware.checkToken,
    (request, response, next) => {
        //make sure that tje contact being verified exists
        let query = 'SELECT * FROM Members WHERE MemberID=$1';
        let values = [request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                next();
            })
            .catch((err) => {
                console.log('error finding contact: ' + err);
                response.status(400).send({
                    message: 'Requested contact doesnt exist',
                });
            });
    },
    (request, response, next) => {
        //make sure that the contact is actually pending
        let query = `SELECT MemberID_A, MemberID_B, Verified FROM Contacts WHERE MemberID_A=$2 AND MemberID_B=$1`;
        let values = [request.params.memberid, request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                request.memberid_a = result.rows[0].memberid_a;
                request.memberid_b = result.rows[0].memberid_b;
                request.verified = result.rows[0].verified;
                //if there are no pending friend requests send an error
                if (result.rows == 0) {
                    response.status(400).send({
                        message: 'No contact request found',
                    });
                    //if the contact is already verified send an error
                } else if (request.verified != 0) {
                    console.log(request.verified);
                    response.status(400).send({
                        message: 'Contact is already verified',
                    });
                } else {
                    next();
                }
            })
            .catch((err) => {
                console.log('error getting contact info' + err);
                response.status(400).send({
                    message: 'Contact info unavailable',
                });
            });
    },
    (request, response, next) => {
        //update the contact for the user who requested
        let query =
            'UPDATE Contacts SET Verified=1 WHERE (MemberID_A=$1 AND MemberID_B=$2)';
        let values = [request.memberid_a, request.memberid_b];

        pool.query(query, values)
            .then((result) => {
                next()
            })
            .catch((err) => {
                console.log('SQL Error verifying contact');
                response.status(400).send({
                    message:
                        'SQL error updating Contacts table',
                });
            });
    },
    (request, response) => {
        //update the contacts table for the user who was requested
        let query =
            'INSERT into Contacts (PrimaryKey, MemberID_A, MemberID_B, Verified) VALUES (DEFAULT, $2, $1, 1)';
        let values = [request.memberid_a, request.memberid_b];

        pool.query(query, values)
            .then((result) => {
                response.status(200).send({
                    message: 'Contact verified',
                });
            })
            .catch((err) => {
                console.log('SQL Error verifying contact');
                response.status(400).send({
                    message:
                        'SQL error updating Contacts table',
                });
            });
    }
);


/**
 * @api {delete} /delete to delete a contact from the contact list
 * @apiName deleteContact
 * @apiGroup Contacts
 * 
 * @apiParam {String} memberid_a memberid of user requesting to delete a contact
 * @apiParam {String} memberid_b memberid of contact being deleted
 * 
 * @apidescription This endpoint is a delete used to delete a contact from the contact list
 */
router.delete(
    '/delete/:memberida/:memberidb',
    (request, response, next) => {
        //delete the contact from memeberid_a (the requesters) contact table
        let query = `DELETE FROM Contacts WHERE (MemberID_A=$1 AND MemberID_B=$2)`;
        let values = [request.params.memberida, request.params.memberidb];

        pool.query(query, values)
        .then((result) => {
                next()
        })
        .catch((err) => {
            console.log('error deleting: ' + err);
                response.status(400).send({
                    message: 'Error deleting user from friendsList'
            });
        });
    },
    (request, response) => {
        //delete the contact from memeberid_b (the contact) contact table
        let query = `DELETE FROM Contacts WHERE (MemberID_A=$2 AND MemberID_B=$1)`;
        let values = [request.params.memberida, request.params.memberidb];

        pool.query(query, values)
        .then((result) => {
                response.status(200)
                .send({
                    message: jwt.decoded
                })
        })
        .catch((err) => {
            console.log('error deleting: ' + err);
                response.status(400).send({
                    message: 'Error deleting user from friendsList'
            });
        });
    });

module.exports = router
