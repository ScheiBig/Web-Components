
/**
 * Uses template to create innerHTML with all special html characters escaped in passed values 
 * @param {TemplateStringsArray} strings 
 * @param  {...string} values 
 * @returns {string}
 */
export function html(strings, ...values) {
    /** @type {string[]} */
    const ret = []
    
    for (let i = 0; i < values.length; i++) {
        let p = strings[ i ]
        let c = values[ i ]
        let n = strings[ i + 1 ]
        
        let pLast = p.trim().at(-1)
        let nFirst = n.trim().at(0)

        if (pLast === nFirst
            && pLast === "\"" || pLast == "'") {
            // Inside attribute 
            ret.push(p)
            ret.push(c)
        } else {
            // Elsewhere
            ret.push(p)
            ret.push(
                c.replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
            )
        }
    }

    ret.push(strings.at(-1))

    return ret.join("")
}
