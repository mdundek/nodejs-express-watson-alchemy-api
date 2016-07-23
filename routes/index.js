var express = require('express');
var router = express.Router();
var concat = require('concat-stream');

var SemanticProcessing = require('../lib/processWatsonRequest.js');
var SimulatedData = require('../lib/_simulated.js');

function urldecode(url) {
	return decodeURIComponent(url.replace(/\+/g, ' '));
}

/**
 * [description]
 */
router.get('/', function(req, res) {
	// Do semantic processing
	SemanticProcessing.processRawCommand(SimulatedData.testFour.command, function(err, ttsResponse) {
		if (err) {
			console.log(err);
		}
		res.send(ttsResponse);
	});
});

/**
 * [description]
 */
router.post('/watson/command', function(req, res) {
	// Extract command text from raw body
	req.pipe(concat(function(data) {
		data = decodeURIComponent(data.toString('utf8').replace(/\+/g, ' '));

		if (data && data.length > 0) {
			SemanticProcessing.processRawCommand(data.toLowerCase(), function(err, ttsResponse) {
				if (err) {
					console.log(err);
				}
				res.send(ttsResponse);
			});
		} else {
			res.send("Sorry, but I could not understand your request, please try again.");
		}
	}));
});

module.exports = router;