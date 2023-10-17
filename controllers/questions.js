const questionRouter = require('express').Router()
const Question = require('../models/question')

questionRouter.get('/', async (request, response) => {
	const questions = await Question.find({})

	response.json(questions)
})

module.exports = questionRouter
