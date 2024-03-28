export const validResponsePrompt = (realAnswer, possAnswer, definition) => {
    return `Answer me only with 1 if yes and 2 if not: 
    Is the word ${possAnswer} a valid answer for the definition ${definition}?`
    // or a synonym for the word ${realAnswer}?` TODO quito esto porque si la palabra esta mal no tiene sentido
}

export const getBotResponsePrompt = (firstPart, secondPart) => {
    return `Provide a real english word that ${firstPart}
    and means: ${secondPart}`
}