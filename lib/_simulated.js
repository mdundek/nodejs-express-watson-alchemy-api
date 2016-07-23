exports.SemanticMapReferences = [{
	type: 'RF24_Node_Type_1',
	classifiers: {
		DIMMER: {
			type: 'actuator',
			subjectRegex: new RegExp('(\\b)(light|the light|dimmer|the dimmer)(\\b)', 'ig'),
			valueTargets: [{
				name: 'value',
				actionValueMapping: {
					dim: '#number',
					set: '#number',
					turn: {
						'on': 100,
						'off': 0
					}
				}
			}]
		},
		HEATER_AIRCON: {
			type: 'actuator',
			subjectRegex: new RegExp('(\\b)(heater|the heater|aircon|the aircon|air conditioner|the air conditioner)(\\b)', 'ig'),
			valueTargets: [{
				name: 'power',
				actionValueMapping: {
					turn: {
						'on': '1',
						'off': '0'
					}
				}
			}, {
				name: 'fan',
				valueTargetsRegex: new RegExp('(\\b)(fan speed|fan|ventilation)(\\b)', 'ig'),
				actionValueMapping: {
					set: {
						'low': '1',
						'medium': '2',
						'high': '3',
						'maximum': '3',
						'minimum': '1'
					}
				}
			}, {
				name: 'temperature',
				valueTargetsRegex: new RegExp('(\\b)(temperature|degrees)(\\b)', 'ig'),
				actionValueMapping: {
					set: '#number'
				}
			}],
		}
	}
}];


exports.testOne = {
	command: 'Please dim the light to 50 percent in the living room'
};

exports.testTwo = {
	command: 'Please turn the light off in the living room'
};

exports.testThree = {
	command: 'Please set the fan speed of the air conditioner to maximum in the living room'
};

exports.testFour = {
	command: 'Please turn the air conditioner off in the living room'
};