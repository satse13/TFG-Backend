const questionRouter = require('express').Router()
const Question = require('../models/question')


const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'l', 'm', 'n', 'ñ', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z']


// Habria que añadir api keys para que no cualquiera pueda acceder a la api

questionRouter.get('/', async (request, response) => {
	const questions = await Question.find({})
	response.json(questions)
})

questionRouter.get('/local',async (request, response) => {
	const result = {}

	for (const letter of letters) {
		// Realiza una consulta para obtener dos preguntas aleatorias con la letra actual
		const questions = await Question.aggregate([
			{ $match: { letter } },
			{ $sample: { size: 2 } }
		])

		// Agrega las preguntas aleatorias al objeto de resultado
		result[letter] = questions
	}

	response.json(result)
})

questionRouter.get('/solo',async (request, response) => {
	const result = {}

	for (const letter of letters) {
		// Realiza una consulta para obtener dos preguntas aleatorias con la letra actual
		const questions = await Question.aggregate([
			{ $match: { letter } },
			{ $sample: { size: 1 } }
		])

		// Agrega las preguntas aleatorias al objeto de resultado
		result[letter] = questions
	}

	response.json(result)
})

module.exports = questionRouter
