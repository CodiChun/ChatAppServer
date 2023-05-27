const Pushy = require('pushy');

// Plug in your Secret API Key 
const pushyAPI = new Pushy(process.env.PUSHY_API_KEY);

//use to send message to a specific client by the token
function sendMessageToIndividual(token, message) {

    //build the message for Pushy to send
    var data = {
        "type": "msg",
        "message": message,
        "chatid": message.chatid
    }


    // Send push notification via the Send Notifications API 
    // https://pushy.me/docs/api/send-notifications 
    pushyAPI.sendPushNotification(data, token, {}, function (err, id) {
        // Log errors to console 
        if (err) {
            return console.log('Fatal Error', err);
        }

        // Log success 
        console.log('Push sent successfully! (ID: ' + id + ')')
    })
}

//add other "sendTypeToIndividual" functions here. Don't forget to export them
function sendNewChatroomNotification(deviceTokens, chatRoomId) {
    //build the data for Pushy to send
    var data = {
        "type": "newchatroom",
        "chatRoomId": chatRoomId
    }

    // Use the "Send to Multiple Devices" API
    // https://pushy.me/docs/api/send-notifications#multiple
    pushyAPI.sendPushNotification(data, null, deviceTokens, {}, function(err, id) {
        // Log errors to console
        if (err) {
            return console.log('New Chat Room Notification Error', err);
        }

        // Log success
        console.log('Push sent successfully! (ID: ' + id + ')')
    });
}

module.exports = {
    sendMessageToIndividual,
    sendNewChatroomNotification
}