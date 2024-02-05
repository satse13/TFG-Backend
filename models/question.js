import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
	letter: String,
	word: String,
	diff: Number,
	description: String,
	startsWith: String,
	Idioma: String
})

questionSchema.set('toJSON', { 
	transform: (document, returnedObject) => {
		returnedObject.id = returnedObject._id.toString()
		delete returnedObject._id
		delete returnedObject.__v
	}
})

export default mongoose.model('Question', questionSchema)