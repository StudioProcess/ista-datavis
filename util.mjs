// Set the provided args in the global context i.e. on the window object
// args can be: 
//   object: will use keys as names
//   function: will use a functions' name-attribute if present
export function register_global(...args) {
    for (const arg of args) {
        if (typeof arg == 'function' && arg.name != undefined) {
            window[arg.name] = arg;
        }
        if (typeof arg == 'object') {
            for (const [key, val] of Object.entries(arg)) {
                window[key] = val;
            }
        }
    }
}

export function timestamp() {
    return (new Date()).toISOString();
}

export default {
    register_global,
    timestamp,
};
