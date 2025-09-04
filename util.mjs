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

// Prime numbers up to 101
const PRIMES =  [ 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101 ]
PRIMES.reverse();

export function factorize(x) {
    x = Math.floor(x); // need an integer
    const factors = [];
    
    while (x != 1) {
        // find largest prime factor
        for (let f of PRIMES) {
            if (x % f == 0) {
                factors.push(f);
                x =  x / f;
            }
        }
    }
    
    factors.sort();
    return factors;
}

function best_partition(remaining_factors, bin1 = 1, bin2 = 1) {
    
    const next_factor = remaining_factors[0]; // remove first element from remaining_factors
    remaining_factors = remaining_factors.slice(1);
    
    if (remaining_factors.length == 0) {
        // try bin1
        const bin1_1 = bin1 * next_factor;
        const bin2_1 = bin2;
        const diff_1 = Math.abs(bin1_1 - bin2_1);
        
        // try bin2
        const bin1_2 = bin1;
        const bin2_2 = bin2 * next_factor;
        const diff_2 = Math.abs(bin1_2 - bin2_2); 
        
        if (diff_1 < diff_2) {
            return [bin1_1, bin2_1];
        } else {
            return [bin1_2, bin2_2];
        }
    }
    
    const p1 = best_partition( remaining_factors, bin1 * next_factor, bin2 );
    const p2 = best_partition( remaining_factors, bin1, bin2 * next_factor );
    
    if ( Math.abs(p1[0] - p1[1]) < Math.abs(p2[0] - p2[1]) ) {
        return p1;
    } else {
        return p2;
    }
}

function sortNumerical(array) {
    array.sort((a, b) => a - b);
    return array;
}

export function rectangle(x) {
    let factors = factorize(x);
    
    if (factors.length == 1) {
        // try next largest
        factors = rectangle(x+1);
    } else {
        // find the partition of factors in two bins, where the products are most similar
        factors = best_partition(factors);
    }
    sortNumerical(factors);
    return factors;
}

export default {
    register_global,
    timestamp,
    rectangle,
};
