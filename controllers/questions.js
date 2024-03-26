import { Router } from 'express';
const questionRouter = Router();
import Question from '../models/question.js'
import generateQuestion from '../services/ChatGPT_API.js'
import OpenAI from 'openai'

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z']

const dbURI =  process.env.MONGODB_URI;
const openai = new OpenAI({
    apiKey: process.env.API_KEY 
});

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
	/*const repeatedQuestion = await Question.findOne({word: question.word})
	if(repeatedQuestion == null){
		question.save()
		.then(() => {
			console.log('Elemento añadido a la base de datos');
		})
		.catch((err) => {
			console.error('Error al añadir elemento:', err);
		});
	}
	else{
		console.log('Elemento repetido y no añadido')
	}*/
	response.json(question)
})

questionRouter.post('/check',async (request, response) => {
	let result
	const {param1, param2, param3} = request.body //real solution, proposed solution, definition
	let apiUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + param2
	
	const respuesta  = await fetch(apiUrl)
	if(!respuesta.ok)
		result = 2
	else
		result = await getResponse("Answer me only with 1 if yes and 2 if not: Is the word "+param2+" a synonym for the word '"+ param1+"' or a meaning for the following definition: "+ param3 +"?", "1");	
	response.send(String(result))
})

//Función para llamar a la API de ChatGPT
const llamadaAPI = async (promptUser, promptAssistant, tokens, temperatura, modelo) => {
    const llam = await openai.chat.completions.create({
        model: modelo,
        temperature: temperatura,
        messages: [
          {
            role: 'user',
            content: promptUser,
          },
          {
            role: 'assistant',
            content: promptAssistant,
          },
        ],
        max_tokens: tokens,
    });
    return {
        contenido: llam.choices[0].message.content
    }
}

//Función para preguntar a ChatGPT si la palabra sirve o no
const getResponse = async (promptUser, ejemploSalida) => {
    //Pedir la palabra
    const pal = await llamadaAPI(promptUser, ejemploSalida, 2, 0.5, "gpt-3.5-turbo");
    
    let palabra = pal.contenido.toLowerCase();
    console.log(palabra);

    if(palabra == 1){ 
        return 1
    }
    else{
        return 2
    }
};

export default questionRouter
