const info = (... params) => {
	console.log(params)
	
}

const error = (... params) => {
	console.error(params)
}

const debug = (... params) => {
	console.debug(params)
}

const warn = (... params) => {
	console.warn(params)
}

export default {
	info, error, debug, warn
}