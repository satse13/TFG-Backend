import Question from '../models/question.js'
import OpenAI from 'openai'
import axios from 'axios'

const openai = new OpenAI({
	apiKey: process.env.API_KEY // This is also the default, can be omitted
})

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
	//Vemos si existe en Wikipedia
	palabra = palabra.trim()
	const apiUrl = 'https://en.wikipedia.org/w/rest.php/v1/search/page?q=' + palabra
	const respuesta  = await axios.get(apiUrl)

	if(!respuesta.data.pages.length){
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
	const strMinuscula = str.toLowerCase()
	const palabraMinuscula = palabra.toLowerCase()
	const indice = strMinuscula.indexOf(palabraMinuscula)
	if (indice !== -1) {
		return str.substring(indice+1 + palabra.length)
	} else {
		return str
	}
}

//Función para buscar definiciones que sean válidas
const getDesc = async (palabra, promptPedirDesc, ejemploSalidaDesc, descripcion, theme) => {
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

		const caracter = descripcion.charAt(0).toUpperCase()

		descripcion = caracter + descripcion.substring(1)

		const descMinus = descripcion.toLowerCase()

		console.log(descripcion)

		//Si la definición contiene la palabra, error y volver a pedir
		if(descMinus.includes(palabra)){
			console.log('Error: La definición contiene la palabra ' + palabra)
			bucle++
			//Aqui puedo cambiar el prompt para que me de una definición sin la palabra
			continue
		}

		//Si la definición no contiene la palabra, comprobar si es válida
		let promptComprobarDefinición
		if(theme == ''){
			promptComprobarDefinición= 'Now: Answer yes or no:\nWord: ' + palabra + '\nDescription: ' + descripcion + '\nDoes the description accurately represent the provided word?'
		}
		else{
			promptComprobarDefinición= 'Now: Answer yes or no:\nWord: ' + palabra + '\nDescription: ' + descripcion + '\nDoes the description accurately represent the provided word? Is the definition related with ' + theme + '?'
			console.log("IN")
		}
		const promptEjemploComprobarDefinición = 'Sí.'

		const comprobarDefinicion = await llamadaAPI(promptComprobarDefinición, promptEjemploComprobarDefinición, 2, 0.5, 'gpt-3.5-turbo')

		console.log(comprobarDefinicion.contenido)

		//Si la definición es válida, descValida = 'Y', si no, descValida = 'N'
		const arraySoluciones = ['Sí', 'Si.', 'Yes.', 'Yes']

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
		const promptPedirPregunta = 'Generate only, without any unnecessary message and without punctuation, a word that exists in English, that starts with the letter '+ letter +' that is common and has to do with ' + theme + '.'
		const ejemploSalidaPregunta = example
		const descripcion = ''

		const promptPal = await getResponse(letter, promptPedirPregunta, ejemploSalidaPregunta)
		if (promptPal.valida == 'N') continue
		const promptPedirDesc = 'Generate a definition of the word '+ promptPal.word +' in 20 words. Include essential information about its meaning and common use.'
		const ejemploSalidaDesc = ''
            
		const promptDef = await getDesc(promptPal.word,promptPedirDesc, ejemploSalidaDesc, descripcion, theme)
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

export default generateQuestion