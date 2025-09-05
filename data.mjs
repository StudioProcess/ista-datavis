const YEARS = [2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019]; // Years in dataset
const SNP_IDX = [6, 106]; // Indices of the SNP markers within a data row
const COLORS = { "Y": "Yellow", "WO": "Weak Orange", "FO": "Full Orange", "W": "White", "WR": "Weak red", "FR": "Full red"};
const COLOR_SNP_NAMES = ["ros_assembly_543443", "ros_assembly_715001", "s91_122561",  "s316_93292", "s316_257789", "s1187_290152"];
let data; // CSV data
let loadedCallback;
let _original_snp_names; // All SNP names in orignal order
let _color_snp_indices; // Indices of color SNP within SNPs (NOT withing all columns)
let _sorted_snp_names;

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
    console.log('Loading data', path);
    data = undefined;
    data = await loadTableAsync(path, 'csv', 'header');
    _original_snp_names = snp_names();
    _sorted_snp_names = _original_snp_names;
    _color_snp_indices = COLOR_SNP_NAMES.map(name => {
        return _original_snp_names.indexOf(name);
    });
    _color_snp_indices.sort();
    console.log('Loading data done');
    return data;
}

function color_snp_indices() {
    check_loaded('color_snp_indices');
    return _color_snp_indices;
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

function cmp(a, b) {
    if (a < b) return -1;
    else if (a > b) return 1;
    return 0;
}

function sort_by(array, pick_fn) {
    array.sort((a, b) =>  cmp( pick_fn(a), pick_fn(b) ));
    return array;
}

function sort_by_property(array, ...keys) {
    function pick(array) {
        let x = array;
        for (let key of keys) {
            x = x[key];
        }
        return x;
    }
    return sort_by(array, pick);
}

function sort(by = '') {
    const keys = ['id', 'time', 'location', 'color'];
    if (Number.isInteger(by)) {
        by = keys[by % keys.length];
    }
    by = by.toLowerCase();
    if (by == '') by = 'id';
    console.log('Sorting data by', by);
    
    if (by == 'location') {
        sort_by_property(data.rows, 'obj', 'Easting');
    } else if (by == 'color') {
        const color_order = Object.keys(COLORS);
        sort_by(data.rows, x => {
            let idx = color_order.indexOf( x.obj.phenoCat_final );
            if (idx == -1) idx = 999;
            return idx;
        });
    } else if (by == 'time') {
        // AliveRec_2009 to AliveRec_2019 are column indices 107 to 117
        sort_by(data.rows, x => {
            for (let i=0; i <= 10; i++) {
                if (x.arr[107 + i] == true) {
                    return i;
                }
            }
            return 999;
        });
    } else { // id
        sort_by_property(data.rows, 'obj', 'PlantID_final');
    }
}

function sort_snps(by = '', limit = 0) {
    check_loaded('sort_snps');
    
    const options = [ 'default', 'color_start', 'color_middle', 'color_end', 'alnum' ];
    if (Number.isInteger(by)) {
        by = options[ by % options.length ];
    }
    if (by == '') by = 'default';
    if (limit <= 0) {
        limit = _original_snp_names.length;
    }
    console.log('SNPs sorted by', by, 'limit', limit);
    
    // all non-color snps
    let non_color_snps = _original_snp_names.reduce( (acc, x, idx) => {
        if (!COLOR_SNP_NAMES.includes(x)) {
            acc.push(x);
        }
        return acc;
    }, []);
    let limit_minus_color_snps = Math.max(0, limit - COLOR_SNP_NAMES.length);
    non_color_snps = non_color_snps.slice(0, limit_minus_color_snps);
    
    // all snps
    let all_snps = _original_snp_names.slice(0, limit);
    
    // sorting options
    let keys = non_color_snps;
    if (by == 'color_start') { // color snps to front
        keys.splice(0, 0, ...COLOR_SNP_NAMES);
    } else if (by == 'color_end') {
        keys.splice(keys.length, 0, ...COLOR_SNP_NAMES);
    } else if (by == 'color_middle') {
        keys.splice(Math.floor(keys.length / 2), 0, ...COLOR_SNP_NAMES);
    } else if (by == 'alnum') { // sort keys alphabetically
        keys = all_snps.sort();
    } else { // default
        keys = all_snps;
    }
    
    // set sorting
    _sorted_snp_names = keys;
    
    // Update color_snp_indices for new sorting
    _color_snp_indices = COLOR_SNP_NAMES.map(name => {
        return keys.indexOf(name);
    });
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
    for (let key of _sorted_snp_names) {
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
    COLOR_SNP_NAMES,
    color_snp_indices,
    load,
    loaded,
    raw,
    snp_names,
    num_samples,
    get_sample,
    get_stats,
    sort,
    sort_snps,
};