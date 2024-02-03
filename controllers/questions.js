const questionRouter = require('express').Router()
const Question = require('../models/question')

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z']

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

let array = []

questionRouter.get('/generate', async (request, response) =>{
	const question = await generateQuestion(request.query.letter, request.query.theme, request.query.example)
	array.push(question)
	response.json(question)
})

questionRouter.put('/questions', async (request, response) => {
	await mongoose.connect(dbURI)
	console.log('Connected to the database')

	let added = []
	for(const key in array){
		console.log(array[key])
		const repeatedQuestion = await Question.findOne({word: array[key].word})
		console.log(repeatedQuestion)
		if(repeatedQuestion != null){
			array[key].save()
				.then(() => {
					console.log('Elemento añadido a la base de datos')
					added.push('Y')
				})
				.catch((err) => {
					console.error('Error al añadir elemento:', err)
					added.push('N')
				})
		}
		else{
			console.log('Elemento repetido y no añadido')
			added.push('N')
		}
	}
	
	array = []
	response.json(added)
})

module.exports = questionRouter


/*
----------------------------
Llamadas ChatGPT API
----------------------------
*/
const OpenAI = require('openai')
const mongoose = require('mongoose')

const dbURI =  process.env.MONGODB_URI
const openai = new OpenAI({
	apiKey: process.env.API_KEY // This is also the default, can be omitted
})

let descripcion
let promptPedirPregunta
let ejemploSalidaPregunta
let promptPedirDesc
let ejemploSalidaDesc

//Función para llamar a la API
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
	})
	return {
		contenido: llam.choices[0].message.content
	}
}



//Función para buscar palabras que sean válidas
const getResponse = async (letra, promptPedirPalabra, ejemploSalidaPalabra) => {
	//Variables
	let palValida = 'N'
	let empiezaCon = ''
	let palabra = ''

	//Pedir la palabra
	const pal = await llamadaAPI(promptPedirPalabra, ejemploSalidaPalabra, 10, 1.1, 'gpt-3.5-turbo')
    
	palabra = pal.contenido.toLowerCase()
	console.log(palabra)


	//********************************************//
	//Este fragmento de código habrá que ponerlo en un IF porque para personas/monumentos/etc no sirve
	//Vemos si existe en la RAE
	palabra = palabra.trim()
	let apiUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + palabra
	let respuesta  = await fetch(apiUrl)

	if(!respuesta.ok){
		console.log('NO está en el inglés')
		return {
			word: palabra,
			empieza: empiezaCon,
			valida: palValida
		}
	}
	else{
		console.log('SI está en el inglés')
	}
    
	//********************************************//

	//Si no contiene la letra, error y salir
	if(!palabra.includes(letra)){
		console.log('Error: Palabra que no contiene la letra '+ letra)
        
		return {
			word: palabra,
			empieza: empiezaCon,
			valida: palValida
		}
	}
	palValida = 'Y'

	//Si empieza por la letra, empiezaCon = 'Y', si no, empiezaCon = 'N'
	if(palabra.startsWith(letra)){
		empiezaCon = 'Y'
		console.log('Empieza por ' + letra)
	}
	else{
		empiezaCon = 'N'
		console.log('No empieza por ' + letra)
	}

	return {
		word: palabra,
		empieza: empiezaCon,
		valida: palValida
	}
}

function borrarHastaPalabra(str, palabra) {
	let strMinuscula = str.toLowerCase()
	let palabraMinuscula = palabra.toLowerCase()
	let indice = strMinuscula.indexOf(palabraMinuscula)
	if (indice !== -1) {
		return str.substring(indice+1 + palabra.length)
	} else {
		return str
	}
}

//Función para buscar definiciones que sean válidas
const getDesc = async (palabra,promptPedirDesc, ejemploSalidaDesc) => {
	//Variables
	let descValida = 'N'
	let bucle = 0

	//Bucle para pedir definiciones hasta que sea válida
	while(descValida == 'N' && bucle < 3){

		//Pedir definición
		const desc = await llamadaAPI(promptPedirDesc, ejemploSalidaDesc, 100, 0.5, 'gpt-3.5-turbo')

		descripcion = desc.contenido
        
		console.log(descripcion)

		descripcion = borrarHastaPalabra(descripcion,palabra)

		descripcion = descripcion.trim()

		let caracter = descripcion.charAt(0).toUpperCase()

		descripcion = caracter + descripcion.substring(1)

		let descMinus = descripcion.toLowerCase()

		console.log(descripcion)

		//Si la definición contiene la palabra, error y volver a pedir
		if(descMinus.includes(palabra)){
			console.log('Error: La definición contiene la palabra ' + palabra)
			bucle++
			//Aqui puedo cambiar el prompt para que me de una definición sin la palabra
			continue
		}

		//Si la definición no contiene la palabra, comprobar si es válida
		let promptComprobarDefinición= 'Now: Answer yes or no:\nWord: ' + palabra + '\nDescription: ' + descripcion + '\nDoes the description accurately represent the provided word?'
		let promptEjemploComprobarDefinición = 'Sí.'

		const comprobarDefinicion = await llamadaAPI(promptComprobarDefinición, promptEjemploComprobarDefinición, 2, 0.5, 'gpt-3.5-turbo')

		console.log(comprobarDefinicion.contenido)

		//Si la definición es válida, descValida = 'Y', si no, descValida = 'N'
		let arraySoluciones = ['Sí', 'Si.', 'Yes.', 'Yes']

		if(arraySoluciones.indexOf(comprobarDefinicion.contenido) !== -1){ 
			descValida = 'Y'
			console.log('Palabra válida')
		}
		else{
			descValida = 'N'
			bucle++
		}

	} 

	return {
		desc: descripcion,
		valida: descValida
	}
}

async function generateQuestion(letter, theme, example) {
	let newQuestion
	// eslint-disable-next-line no-constant-condition
	while(true){
		promptPedirPregunta = 'Generate only, without any unnecessary message and without punctuation, a word that exists in English, that starts with the letter '+ letter +' that is common and has to do with ' + theme + '.'
		ejemploSalidaPregunta = example
		descripcion = ''

		let promptPal = await getResponse(letter, promptPedirPregunta, ejemploSalidaPregunta)
		if (promptPal.valida == 'N') continue
		promptPedirDesc = 'Generate a definition of the word '+ promptPal.word +' in 20 words. Include essential information about its meaning and common use.'
		ejemploSalidaDesc = ''
            
		let promptDef = await getDesc(promptPal.word,promptPedirDesc, ejemploSalidaDesc)
		if (promptDef.valida == 'N') continue    

		// Crea una instancia del modelo y guarda en la base de datos
		newQuestion = new Question({
			letter: letter,
			word: promptPal.word,
			description: promptDef.desc,
			startsWith: promptPal.empieza,
			Idioma: 'Eng'
		})

		return newQuestion
	}
}