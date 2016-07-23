var AlchemyAPI = require('alchemy-api');
var SimulatedData = require('./_simulated.js');

// For the purpose of this demo, we hard code the Alchemy key
var alchemy = new AlchemyAPI('<API_KEY>');

var numberPattern = /\d+/g;

// Simulate IOT Gateway Node / plugin configurations
// On the real IOT Gateway platform, this data needs to be returned by
// the plugin implementations themselves
var SemanticMapReferences = SimulatedData.SemanticMapReferences;

/**
 * [processRawCommand description]
 * @param  {[type]}   command  [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
exports.processRawCommand = function(command, callback) {
	extractRelations(command, function(err, relations) {
		if (err) {
			callback(err, 'Watson service error, please try again later');
		} else {
			var fullSemanticsObject = {
				command: command,
				relations: relations
			};

			// If we have a relations list that is not empty, then we do not
			// need keywords to process this request
			if (fullSemanticsObject.relations && fullSemanticsObject.relations.length > 0) {
				_evalResultAndCallback(mapSemanticsToCommand(fullSemanticsObject));
			}
			// Otherwise we will have to get the keywords for this command
			// in order to simplify the processing of the requested reading
			else {
				extractKeywords(command, function(err, keywords) {
					if (err) {
						callback(err, 'Watson service error, please try again later');
					} else {
						fullSemanticsObject.keywords = keywords;
						_evalResultAndCallback(mapSemanticsToCommand(fullSemanticsObject));
					}
				});
			}
		}
	});

	/**
	 * Private function that will evaluate the mapped result process the callback
	 * @param  {[type]} commandObject [description]
	 * @return {[type]}               [description]
	 */
	function _evalResultAndCallback(commandObject) {
		if (commandObject) {
			console.log('----------- Command mapped successfully:');
			console.log(JSON.stringify(commandObject, null, 4));

			// *********************************************************
			//
			// 			TODO: Execute command on IOT platform
			//
			// *********************************************************

			callback(null, 'Command executed');
		} else {
			console.log('----------- Command mapped successfully:');
			console.log(JSON.stringify(commandObject, null, 4));

			callback(new Error('Could not map command'), 'Sorry, but I could not understant your command. Please try again.');
		}
	}
};

/**
 * [mapSemantics description]
 * @param  {[type]} semanticObject [description]
 * @return {[type]}                [description]
 */
function mapSemanticsToCommand(semanticObject) {
	var IOTActionObject = null;

	// If Actuator command request
	if (semanticObject.relations.length > 0) {


		// Get the first relations verb and subject. If more than one relation, chances are that the others are not relevant or the command is too long and complex.
		var verb = semanticObject.relations[0].action.verb.text;
		var relationSubject = semanticObject.relations[0].subject.text;

		// Loop over Semantic Map Reference plugin data objects
		SemanticMapReferences.forEach(function(pluginData) {

			// Loop over classifiers for this plugin
			for (var classifierName in pluginData.classifiers) {

				// Test if this command matches the classifier sensor/actuator potential subjects
				if (pluginData.classifiers[classifierName].type === 'actuator') {
					var classifierSubject = semanticObject.command.match(pluginData.classifiers[classifierName].subjectRegex);
					if (classifierSubject && classifierSubject.length === 1) { // note: If more than one, we ignore it, that's too complicated and error prone

						// Loop over classifier target value type map objects
						pluginData.classifiers[classifierName].valueTargets.forEach(function(classifierValueMapper) {

							// Loop over known verbs for this classifier value target
							for (var mappingActionVerb in classifierValueMapper.actionValueMapping) {
								// If is a candidate...

								if (mappingActionVerb === verb) {
									// If the subject for this verb is the same than the global command subject identified 
									// by the regex above, then we know that the command is for the classifier device itself (ex: Turn off device). 
									// Otherwise the subject for this verb refers to a specific value for this device (ex: turn off fan of device).
									var setValue = null;
									if (relationSubject === classifierSubject[0] && !classifierValueMapper.valueTargetsRegex) {
										setValue = extractActionValue(semanticObject.command, classifierValueMapper, mappingActionVerb);
									} else if (classifierValueMapper.valueTargetsRegex) {
										// Now check if this value target subject matches the target subject of our command
										var classifierSubjectMatch = semanticObject.command.match(classifierValueMapper.valueTargetsRegex);
										if (classifierSubjectMatch && classifierSubjectMatch.length === 1) {
											setValue = extractActionValue(semanticObject.command, classifierValueMapper, mappingActionVerb);
										}
									}

									// If we found / mapped a value, then we are all set and should be able to put together our IOT action object
									if (setValue !== null) {
										IOTActionObject = {
											type: 'actuator',
											classifier: classifierName,
											targetActuator: classifierValueMapper.name,
											actuatorValue: setValue
										};
									}
								}
							}
						});
					}
				}
			}
		});

		if (IOTActionObject) {
			// Now let's look for the location the found relations
			semanticObject.relations.forEach(function(relation) {
				if (relation.location) {
					IOTActionObject.location = relation.location.text;
				}
			});

			if (!IOTActionObject.location) {
				// Should not happen, in this case we do not execute the command to be sure
				IOTActionObject = null;
			}
		}
	}
	// If simple reading request
	else {
		// TODO: Here, we have no relations response to work with, so we will have to exploit keywords instead

	}

	return IOTActionObject;
}

/**
 * [extractActionValue description]
 * @param  {[type]} command               [description]
 * @param  {[type]} classifierValueMapper [description]
 * @param  {[type]} mappingActionVerb     [description]
 * @return {[type]}                       [description]
 */
function extractActionValue(command, classifierValueMapper, mappingActionVerb) {
	var valueIdentifier = null;

	var possibleActions = classifierValueMapper.actionValueMapping[mappingActionVerb];
	if (typeof possibleActions === 'string' || possibleActions instanceof String) {
		// Only one possible value to look for, the string will tell us what to look for
		valueIdentifier = possibleActions;
	} else {
		var regexParams = '';
		for (var possibleAction in possibleActions) {
			regexParams += (regexParams.length > 0 ? '|' : '') + possibleAction;
		}
		var actionValue = command.match(new RegExp('(\\b)(' + regexParams + ')(\\b)', 'ig'));
		// Look for the actual value. If none found, chances are the possible actions are not configured right
		if (actionValue && actionValue.length === 1) {
			valueIdentifier = possibleActions[actionValue[0]];
		}
	}

	if (valueIdentifier !== null) {
		switch (valueIdentifier) {
			case '#number':
				return extractNumericValue(command);
				break;
			default:
				return valueIdentifier;
		}
	} else {
		return null;
	}
}

/**
 * [extractKeywords description]
 * @param  {[type]}   text     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function extractKeywords(text, callback) {
	alchemy.keywords(text, {}, function(err, response) {
		if (err) {
			callback(err);
		} else {
			var keywords = response.keywords;
			callback(null, keywords);
		}
	});
}

/**
 * [extractRelations description]
 * @param  {[type]}   text     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function extractRelations(text, callback) {
	alchemy.relations(text, {}, function(err, response) {
		if (err) {
			callback(err);
		} else {
			var relations = response.relations;
			callback(null, relations);
		}
	});
}

/**
 * [extractNumericValue description]
 * @param  {[type]} command [description]
 * @return {[type]}         [description]
 */
function extractNumericValue(command) {
	var numbers = command.match(numberPattern);
	return numbers && numbers.length === 1 ? numbers[0] : null;
}