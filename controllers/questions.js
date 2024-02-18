import { Router } from 'express';
const questionRouter = Router();
import Question from '../models/question.js'
import generateQuestion from '../services/ChatGPT_API.js'

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z']

questionRouter.get('/', async (request, response) => {
	const questions = await Question.find({})
	response.json(questions)
})

questionRouter.get('/local',async (request, response) => {
	const result = {}

	for (const letter of letters) {
		// Realiza una consulta para obtener dos preguntas aleatorias con la letra actual
		const questions = await Question.aggregate([
			{ $match: { $and: [ { letter }, { Idioma: 'Eng' } ]}},
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

questionRouter.get('/generate', async (request, response) => {
	const question = await generateQuestion(request.query.letter, request.query.theme, request.query.example)
	response.json(question)
})

questionRouter.post('/questions', async (request, response) => {
	const questions = request.body
	let added = []

	for(const key in questions){
		const repeatedQuestion = await Question.findOne({word: questions[key].word})
		if(repeatedQuestion == null){
            const newQuestion = new Question({
                letter: questions[key].letter,
                word: questions[key].word,
                description: questions[key].description,
                startsWith: questions[key].startsWith,
                Idioma: 'Eng'
            });
            newQuestion.save()
            .then(() => {
                console.log('Elemento añadido a la base de datos');
            })
            .catch((err) => {
                console.error('Error al añadir elemento:', err);
            });
			added.push('Y')
		}
		else{
			console.log('Elemento repetido y no añadido')
			added.push('N')
		}
	}
	
	response.json(added)
})

export default questionRouter
