const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
	letter: String,
	word: String,
	diff: Number,
	description: String,
	startsWith: String,
})

questionSchema.set('toJSON', { 
	transform: (document, returnedObject) => {
		returnedObject.id = returnedObject._id.toString()
		delete returnedObject._id
		delete returnedObject.__v
	}
})

module.exports = mongoose.model('Question', questionSchema)