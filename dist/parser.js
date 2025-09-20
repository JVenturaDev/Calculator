// parser.ts
// Función que valida y tokeniza una ecuación
function parseEcuacion(input) {
    const permitidos = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-*/=!^.,→²³√()∛°'\"";
    // Verificar que cada carácter sea permitido
    for (let i = 0; i < input.length; i++) {
        if (!permitidos.includes(input[i])) {
            return { valido: false, error: `Carácter inválido: "${input[i]}"` };
        }
    }
    // Separar números, letras y operadores
    const regex = /[a-zA-Z]+|\d+(\.\d+)?|['"]|[+\-*/^=()]/g;
    const tokens = input.match(regex);
    // Revisar que existan tokens válidos
    if (!tokens || tokens.length === 0) {
        return { valido: false, error: "Ecuación vacía o inválida" };
    }
    // Todo válido
    return { valido: true, tokens };
}
// 2. Función auxiliar para validar la ecuación antes de calcular
export function parsear(inputValue) {
    const parsed = parseEcuacion(inputValue);
    if (!parsed.valido) {
        alert("Error: " + parsed.error);
        return false;
    }
    return true;
}
