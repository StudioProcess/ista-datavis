const YEARS = [2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019]; // Years in dataset
const SNP_IDX = [6, 106]; // Indices of the SNP markers within a data row
const COLORS = { "Y": "Yellow", "FR": "Full red", "WO": "Weak Orange", "WR": "Weak red", "FO": "Full Orange", "W": "White" };
let data; // CSV data
let loadedCallback;

// Default loadTable doesn't support async/await
function loadTableAsync(filename, extension, header) {
    return new Promise((resolve, reject) => {
       loadTable(filename, extension, header, (data) => {
           resolve(data);
           if (loadedCallback != undefined) {
               loadedCallback(data);
               loadedCallback = undefined;
           }
       }, reject); 
    });
}

function loaded() {
    if (data != undefined) {
        return Promise.resolve(data);
    }
    return new Promise((resolve, reject) => {
        loadedCallback = resolve;
    });
}

async function load(path) {
    console.log('loading data', path);
    data = undefined;
    data = await loadTableAsync(path, 'csv', 'header');
    console.log('loading data done');
    return data;
}

function check_loaded(caller, throw_error = true) {
    if (data === undefined) {
        if (throw_error) throw `${caller}: Data not loaded`;
        return false;
    }
    return true;
}

function raw() {
    check_loaded('raw');
    return data;
}

function num_samples() {
    check_loaded('num_samples');
    return data.rows.length;
}

function snp_names() {
    return data.columns.slice( SNP_IDX[0], SNP_IDX[1] + 1 );
}

// Get sample data in a convenient form
function get_sample(idx) {
    check_loaded('get_sample');
    const row = data.rows[idx];
    // console.log(row);
    
    // alive/year data
    const alive = {};
    const years = [];
    for (let year of YEARS) {
        alive[year] = parseFloat(row.obj[`AliveRec_${year}`]);
        if (alive[year] == 1) years.push(year);
    }
    years.sort();
    
    // SNPs
    const snps = {};
    for (let key of snp_names()) {
        snps[key] = parseFloat( row.obj[key] );
    }
    
    return {
        id: row.obj.PlantID_final,
        year_first: years[0],
        year_last: years.at(-1),
        years,
        alive,
        snps,
        color: {
            red: parseFloat( row.obj.Red_final ),
            yellow: parseFloat( row.obj.Yellow_final ),
            pheno_cat: row.obj.phenoCat_final,
        },
        geolocation: {
            lat: parseFloat( row.obj.Latitude ),
            long: parseFloat( row.obj.Longitude ),
            altitude: parseFloat( row.obj.Altitude ),
            easting: parseFloat( row.obj.Easting ),
            northing: parseFloat( row.obj.Northing ),
        }
    };
}

function make_minmax(min = -Infinity, max = Infinity) {
    let v_min = max;
    let v_max = min;
    let sum = 0;
    let n = 0;
    
    return {
        add: function(val) {
            if (val < min || val > max) return;
            n += 1;
            sum += val
            if (val < v_min) v_min = val;
            if (val > v_max) v_max = val;
        },
        get: function() {
            return {
                min: v_min,
                max: v_max,
                avg: sum / n,
                count: n,
            };
        }
    }
}

// Statistics / Print range of values
function get_stats() {
    check_loaded('get_stats');
    
    function add(obj, val) {
        if (val in obj) {
            obj[val] += 1;
        } else {
            obj[val] = 1;
        }
    }
    
    const values_snp = {};
    const values_red = new Set();
    const values_yellow = new Set();
    const values_pheno_cat = new Set();
    
    const range_red = make_minmax(0);
    const range_yellow = make_minmax(0);
    const range_lat = make_minmax();
    const range_long = make_minmax();
    const range_altitude = make_minmax();
    const range_easting = make_minmax();
    const range_northing = make_minmax();
    const range_pheno_cat = {};
    
    for (let cat of Object.keys(COLORS)) {
        range_pheno_cat[cat] = {
            red: make_minmax(),
            yellow: make_minmax(),
        };
    }
    // console.log(range_pheno_cat);
    
    
    for (let idx=0; idx<data.rows.length; idx++) {

        const s = get_sample(idx);
        for (let val of Object.values(s.snps)) {
            add( values_snp, val );
        }
        
        add( values_red, s.color.red );
        add( values_yellow, s.color.yellow );
        add( values_pheno_cat, s.color.pheno_cat );
        
        range_red.add(s.color.red);
        range_yellow.add(s.color.yellow);
        range_lat.add(s.geolocation.lat);
        range_long.add(s.geolocation.long);
        range_altitude.add(s.geolocation.altitude);
        range_easting.add(s.geolocation.easting);
        range_northing.add(s.geolocation.northing);
        
        const cat = s.color.pheno_cat;
        if (Object.keys(COLORS).includes(cat)) {
            if (s.color.red >= 0 && s.color.yellow >= 0) {
                range_pheno_cat[cat].red.add(s.color.red);
                range_pheno_cat[cat].yellow.add(s.color.yellow);
            }
        }
    }
    
    // function sorted(arr) {
    //     arr.sort();
    //     return arr;
    // }
    
    function sorted(obj) {
        return Object.keys(obj).sort().reduce(
          (out, key) => {
            out[key] = obj[key];
            return out;
          },
          {}
        );
    }
    
    const range_pheno_cat_out = {};
    for (let [k, v] of Object.entries(range_pheno_cat)) {
        range_pheno_cat_out[k] = {
            red: v.red.get(),
            yellow: v.yellow.get(),
        }
    }
    
    return {
        values_snp: sorted( values_snp ),
        values_red: sorted( values_red ),
        values_yellow: sorted( values_yellow ),
        values_pheno_cat: sorted(values_pheno_cat),
        range_red: range_red.get(),
        range_yellow: range_yellow.get(),
        range_lat: range_lat.get(),
        range_long: range_long.get(),
        range_altitude: range_altitude.get(),
        range_easting: range_easting.get(),
        range_northing: range_northing.get(),
        range_pheno_cat: range_pheno_cat_out,
    };
}

export default {
    YEARS,
    SNP_IDX,
    COLORS,
    load,
    loaded,
    raw,
    snp_names,
    num_samples,
    get_sample,
    get_stats,
};