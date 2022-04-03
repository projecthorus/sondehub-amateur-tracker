(function(){'use strict';// Linear interpolation
// The values (y1 and y2) can be arrays
//export
function linearInterpolate(x1, y1, x2, y2, x) {
    if (x1 == x2) {
        return y1;
    }
    const w = (x - x1) / (x2 - x1);

    if (Array.isArray(y1)) {
        return y1.map((y1, i) => y1 * (1 - w) + y2[i] * w);
    }
    return y1 * (1 - w) + y2 * w;
}

// Sampling at at targetXs with linear interpolation
// xs and ys must have the same length.
//export
function sampleAt(xs, ys, targetXs) {
    const descOrder = xs[0] > xs[1];
    return targetXs.map((tx) => {
        let index = xs.findIndex((x) => (descOrder ? x <= tx : x >= tx));
        if (index == -1) {
            index = xs.length - 1;
        } else if (index == 0) {
            index = 1;
        }
        return linearInterpolate(xs[index - 1], ys[index - 1], xs[index], ys[index], tx);
    });
}

// x?s must be sorted in ascending order.
// x?s and y?s must have the same length.
// return [x, y] or null when no intersection found.
//export
function firstIntersection(x1s, y1s, x2s, y2s) {
    // Find all the points in the intersection of the 2 x ranges
    const min = Math.max(x1s[0], x2s[0]);
    const max = Math.min(x1s[x1s.length - 1], x2s[x2s.length - 1]);
    const xs = Array.from(new Set([...x1s, ...x2s]))
        .filter((x) => x >= min && x <= max)
        .sort((a, b) => (Number(a) > Number(b) ? 1 : -1));
    // Interpolate the lines for all the points of that intersection
    const iy1s = sampleAt(x1s, y1s, xs);
    const iy2s = sampleAt(x2s, y2s, xs);
    // Check if each segment intersect
    for (let index = 0; index < xs.length - 1; index++) {
        const y11 = iy1s[index];
        const y21 = iy2s[index];
        const x1 = xs[index];
        if (y11 == y21) {
            return [x1, y11];
        }
        const y12 = iy1s[index + 1];
        const y22 = iy2s[index + 1];
        if (Math.sign(y21 - y11) != Math.sign(y22 - y12)) {
            const x2 = xs[index + 1];
            const width = x2 - x1;
            const slope1 = (y12 - y11) / width;
            const slope2 = (y22 - y21) / width;
            const dx = (y21 - y11) / (slope1 - slope2);
            const dy = dx * slope1;
            return [x1 + dx, y11 + dy];
        }
    }
    return null;
}

//export
function zip(a, b) {
    return a.map((v, i) => [v, b[i]]);
}

//export
function scaleLinear(from, to) {
    const scale = (v) => sampleAt(from, to, [v])[0];
    scale.invert = (v) => sampleAt(to, from, [v])[0];
    return scale;
}

//export
function scaleLog(from, to) {
    from = from.map(Math.log);
    const scale = (v) => sampleAt(from, to, [Math.log(v)])[0];
    scale.invert = (v) => Math.exp(sampleAt(to, from, [v])[0]);
    return scale;
}

//export
function line(x, y) {
    return (d) => {
        const points = d.map((v) => x(v).toFixed(1) + "," + y(v).toFixed(1));
        return "M" + points.join("L");
    };
}

//export
function lerp(v0, v1, weight) {
    return v0 + weight * (v1 - v0);
}

var math = {
    linearInterpolate,
    sampleAt,
    zip,
    firstIntersection,
    scaleLinear,
    scaleLog,
    line,
    lerp,
};// Gas constant for dry air at the surface of the Earth
const Rd = 287;
// Specific heat at constant pressure for dry air
const Cpd = 1005;
// Molecular weight ratio
const epsilon = 18.01528 / 28.9644;
// Heat of vaporization of water
const Lv = 2501000;
// Ratio of the specific gas constant of dry air to the specific gas constant for water vapour
const satPressure0c = 6.112;
// C + celsiusToK -> K
const celsiusToK = 273.15;
const L$1 = -6.5e-3;
const g = 9.80665;

/**
 * Computes the temperature at the given pressure assuming dry processes.
 *
 * t0 is the starting temperature at p0 (degree Celsius).
 */



//export
function dryLapse(p, tK0, p0) {
    return tK0 * Math.pow(p / p0, Rd / Cpd);
}


//to calculate isohume lines:
//1.  Obtain saturation vapor pressure at a specific temperature = partial pressure at a specific temp where the air will be saturated.
//2.  Mixing ratio:  Use the partial pressure where air will be saturated and the actual pressure to determine the degree of mixing,  thus what % of air is water.
//3.  Having the mixing ratio at the surface,  calculate the vapor pressure at different pressures.
//4.  Dewpoint temp can then be calculated with the vapor pressure.

// Computes the mixing ration of a gas.
//export
function mixingRatio(partialPressure, totalPressure, molecularWeightRatio = epsilon) {
    return (molecularWeightRatio * partialPressure) / (totalPressure - partialPressure);
}

// Computes the saturation mixing ratio of water vapor.
//export
function saturationMixingRatio(p, tK) {
    return mixingRatio(saturationVaporPressure(tK), p);
}

// Computes the saturation water vapor (partial) pressure
//export
function saturationVaporPressure(tK) {
    const tC = tK - celsiusToK;
    return satPressure0c * Math.exp((17.67 * tC) / (tC + 243.5));
}

// Computes the temperature gradient assuming liquid saturation process.
//export
function moistGradientT(p, tK) {
    const rs = saturationMixingRatio(p, tK);
    const n = Rd * tK + Lv * rs;
    const d = Cpd + (Math.pow(Lv, 2) * rs * epsilon) / (Rd * Math.pow(tK, 2));
    return (1 / p) * (n / d);
}

// Computes water vapor (partial) pressure.
//export
function vaporPressure(p, mixing) {
    return (p * mixing) / (epsilon + mixing);
}

// Computes the ambient dewpoint given the vapor (partial) pressure.
//export
function dewpoint(p) {
    const val = Math.log(p / satPressure0c);
    return celsiusToK + (243.5 * val) / (17.67 - val);
}

//export
function getElevation(p, p0 = 1013.25) {
    const t0 = 288.15;
    //const p0 = 1013.25;
    return (t0 / L$1) * (Math.pow(p / p0, (-L$1 * Rd) / g) - 1);
}

//export
function getElevation2(p, refp = 1013.25) {   //pressure altitude with NOAA formula  (https://en.wikipedia.org/wiki/Pressure_altitude)
    return 145366.45 * (1 - Math.pow(p / refp, 0.190284)) / 3.28084;
}

//export
function pressureFromElevation(e, refp = 1013.25) {
    e = e * 3.28084;
    return Math.pow((-(e / 145366.45 - 1)), 1 / 0.190284) * refp;
}

//export
function getSurfaceP(surfElev, refElev = 110.8, refP = 1000) {  //calculate surface pressure at surfelev,   from reference elev and ref pressure.
    let elevD = surfElev - refElev;
    return pressureFromElevation(elevD, refP);
}

//export

/**
 * @param params = {temp,  gh,  level}
 * @param surface temp,  pressure and dewpoint
 */

 
function parcelTrajectory(params, steps, sfcT, sfcP, sfcDewpoint) {

    //remove invalid or NaN values in params
    for (let i = 0; i < params.temp.length; i++) {
        let inval = false;
        for (let p in params) if (!params[p][i] && params[p][i] !== 0) inval = true;
        if (inval) for (let p in params) params[p].splice(i, 1);
    }

    const parcel = {};
    const dryGhs = [];
    const dryPressures = [];
    const dryTemps = [];  //dry temps from surface temp,  which can be greater than templine start
    const dryDewpoints = [];
    const dryTempsTempline = []; //templine start

    const mRatio = mixingRatio(saturationVaporPressure(sfcDewpoint), sfcP);

    const pToEl = math.scaleLog(params.level, params.gh);
    const minEl = pToEl(sfcP);
    const maxEl = Math.max(minEl, params.gh[params.gh.length - 1]);
    const stepEl = (maxEl - minEl) / steps;

    const moistLineFromEandT = (elevation, t) => {
        //this calculates a moist line from elev and temp to the intersection of the temp line if the intersection exists otherwise very high cloudtop
        const moistGhs = [], moistPressures = [], moistTemps = [];
        let previousP = pToEl.invert(elevation);
        for (; elevation < maxEl + stepEl; elevation += stepEl) {
            const p = pToEl.invert(elevation);
            t = t + (p - previousP) * moistGradientT(p, t);
            previousP = p;
            moistGhs.push(elevation);
            moistPressures.push(p);
            moistTemps.push(t);
        }
        let moist = math.zip(moistTemps, moistPressures);
        let cloudTop, pCloudTop;
        const equilibrium = math.firstIntersection(moistGhs, moistTemps, params.gh, params.temp);
        
        if (moistTemps.length){
            let i1 = params.gh.findIndex(e=> e>moistGhs[1]),i2=i1-1;
            if (i2>0){
                let tempIp = math.linearInterpolate(params.gh[i1],params.temp[i1],params.gh[i2],params.temp[i2],moistGhs[1]); 
                if (moistTemps[1] < tempIp){
                    if (!equilibrium){
                        //console.log("%c no Equilibrium found,  cut moist temp line short","color:green");
                        //no intersection found,  so use point one as the end.
                        equilibrium =  [moistGhs[1], moistTemps[1]];
                        
                    }
                } 
            }
        }
        if (equilibrium) {
            cloudTop = equilibrium[0];
            pCloudTop = pToEl.invert(equilibrium[0]);
            moist = moist.filter((pt) => pt[1] >= pCloudTop);
            moist.push([equilibrium[1], pCloudTop]);
        } else { //does not intersect,  very high CBs
            cloudTop = 100000;
            pCloudTop = pToEl.invert(cloudTop);
        }
        return { moist, cloudTop, pCloudTop };
    };


    for (let elevation = minEl; elevation <= maxEl; elevation += stepEl) {
        const p = pToEl.invert(elevation);
        const t = dryLapse(p, sfcT, sfcP);
        const dp = dewpoint(vaporPressure(p, mRatio));
        dryGhs.push(elevation);
        dryPressures.push(p);
        dryTemps.push(t);        //dry adiabat line from templine surfc
        dryDewpoints.push(dp);   //isohume line from dewpoint line surfc

        const t2 = dryLapse(p, params.temp[0], sfcP);
        dryTempsTempline.push(t2);
    }

    const cloudBase = math.firstIntersection(dryGhs, dryTemps, dryGhs, dryDewpoints);
    //intersection dry adiabat from surface temp to isohume from surface dewpoint,  if dp==surf temp,  then cloudBase will be null

    let thermalTop = math.firstIntersection(dryGhs, dryTemps, params.gh, params.temp);
    //intersection of dryadiabat from surface to templine.  this will be null if stable,  leaning to the right

    let LCL = math.firstIntersection(dryGhs, dryTempsTempline, dryGhs, dryDewpoints);
    //intersection dry adiabat from surface temp to isohume from surface dewpoint,  if dp==surf temp,  then cloudBase will be null

    let CCL = math.firstIntersection(dryGhs, dryDewpoints, params.gh, params.temp);
    //console.log(CCL, dryGhs, dryDewpoints, params.gh, params.temp );
    //intersection of isohume line with templine


    //console.log(cloudBase, thermalTop, LCL, CCL);

    if (LCL && LCL.length) {
        parcel.LCL = LCL[0];
        let LCLp = pToEl.invert(LCL[0]);
        parcel.isohumeToDry = [].concat(
            math.zip(dryTempsTempline, dryPressures).filter(p => p[1] >= LCLp),
            [[LCL[1], LCLp]],
            math.zip(dryDewpoints, dryPressures).filter(p => p[1] >= LCLp).reverse()
        );
    }

    if (CCL && CCL.length) {
        //parcel.CCL=CCL[0];
        let CCLp = pToEl.invert(CCL[0]);
        parcel.TCON = dryLapse(sfcP, CCL[1], CCLp);

        //check if dryTempsTCON crosses temp line at CCL,  if lower,  then inversion exists and TCON,  must be moved.

        //console.log(parcel.TCON)
        let dryTempsTCON=[];

        for(let CCLtempMoreThanTempLine=false; !CCLtempMoreThanTempLine; parcel.TCON+=0.5){  

            let crossTemp = [-Infinity];

            for (; crossTemp[0] < CCL[0]; parcel.TCON += 0.5) {
                //if (crossTemp[0]!=-Infinity) console.log("TCON MUST BE MOVED");
                dryTempsTCON = [];
                for (let elevation = minEl; elevation <= maxEl; elevation += stepEl) {  //line from isohume/temp intersection to TCON
                    const t = dryLapse(pToEl.invert(elevation), parcel.TCON, sfcP);
                    dryTempsTCON.push(t);
                }
                crossTemp = math.firstIntersection(dryGhs, dryTempsTCON, params.gh, params.temp) || [-Infinity];  //intersection may return null
                

            }
            
            parcel.TCON -= 0.5;

            if (crossTemp[0] > CCL[0]) {
                CCL = math.firstIntersection(dryGhs, dryTempsTCON, dryGhs, dryDewpoints);
                //now check if temp at CCL is more than temp line,  if not,  has hit another inversion and parcel.TCON must be moved further
                let i2= params.gh.findIndex(gh => gh>CCL[0]),  i1= i2-1;
                if (i1>=0){
                    let tempLineIp=math.linearInterpolate(params.gh[i1], params.temp[i1], params.gh[i2], params.temp[i2], CCL[0]);
                    if (CCL[1] > tempLineIp) {
                        CCLtempMoreThanTempLine = true;
                        //console.log("%c CCL1 is more than templine", "color:green", CCL[1], tempLineIp);
                    }
                }
            }
        }
        parcel.TCON -= 0.5;
        

        parcel.CCL = CCL[0];
        CCLp = pToEl.invert(CCL[0]);

        parcel.isohumeToTemp = [].concat(
            math.zip(dryDewpoints, dryPressures).filter(p => p[1] >= CCLp),
            [[CCL[1], CCLp]],
            math.zip(dryTempsTCON, dryPressures).filter(p => p[1] >= CCLp).reverse()
        );
        parcel.moistFromCCL = moistLineFromEandT(CCL[0], CCL[1]).moist;
    }

    parcel.surface = params.gh[0];


    if (!thermalTop) {
        return parcel;
    } else {
        parcel.origThermalTop = thermalTop[0];
    }

    if (thermalTop && cloudBase && cloudBase[0] < thermalTop[0]) {

        thermalTop = cloudBase;

        const pCloudBase = pToEl.invert(cloudBase[0]);

        Object.assign(
            parcel,
            moistLineFromEandT(cloudBase[0], cloudBase[1])   //add to parcel: moist = [[moistTemp,moistP]...],  cloudTop and pCloudTop.
        );

        const isohume = math.zip(dryDewpoints, dryPressures).filter((pt) => pt[1] > pCloudBase); //filter for pressures higher than cloudBase,  thus lower than cloudBase
        isohume.push([cloudBase[1], pCloudBase]);



        //parcel.pCloudTop = params.level[params.level.length - 1];



        //parcel.cloudTop = cloudTop;
        //parcel.pCloudTop = pCloudTop;

        //parcel.moist = moist;

        parcel.isohume = isohume;

    }

    let pThermalTop = pToEl.invert(thermalTop[0]);
    const dry = math.zip(dryTemps, dryPressures).filter((pt) => pt[1] > pThermalTop);
    dry.push([thermalTop[1], pThermalTop]);

    parcel.dry = dry;
    parcel.pThermalTop = pThermalTop;
    parcel.elevThermalTop = thermalTop[0];



    //console.log(parcel);
    return parcel;
}

var atm = {
    dryLapse,
    mixingRatio,
    saturationVaporPressure,
    moistGradientT,
    vaporPressure,
    dewpoint,
    getElevation,
    getElevation2,
    pressureFromElevation,
    getSurfaceP,
    parcelTrajectory,
};function lerp$1(v0, v1, weight) {
    return v0 + weight * (v1 - v0);
}
/////




const lookup = new Uint8Array(256);

for (let i = 0; i < 160; i++) {
    lookup[i] = clampIndex(24 * Math.floor((i + 12) / 16), 160);
}



// Compute the rain clouds cover.
// Output an object:
// - clouds: the clouds cover,
// - width & height: dimension of the cover data.
function computeClouds(ad, wdth = 1, hght = 200) {      ////added wdth and hght,  to improve performance   ///supply own hrAlt   altutude percentage distribution,  based on pressure levels
    // Compute clouds data.

    //console.log("WID",wdth,hght);

    /////////convert to windy format
    //ad must be sorted;

    const logscale = (x, d, r) => {  //log scale function D3,  x is the value d is the domain [] and r is the range []
        let xlog = Math.log10(x),
            dlog = [Math.log10(d[0]), Math.log10(d[1])],
            delta_d = dlog[1] - dlog[0],
            delta_r = r[1] - r[0];
        return r[0] + ((xlog - dlog[0]) / delta_d) * delta_r;
    };

    let airData = {};
    let hrAltPressure = [], hrAlt = [];
    ad.forEach(a => {
        if (!a.press) return;
        if (a.rh == void 0 && a.dwpt && a.temp) {
            a.rh = 100 * (Math.exp((17.625 * a.dwpt) / (243.04 + a.dwpt)) / Math.exp((17.625 * a.temp) / (243.04 + a.temp)));     ///August-Roche-Magnus approximation.
        }
        if (a.rh && a.press >= 100) {
            let p = Math.round(a.press);
            airData[`rh-${p}h`] = [a.rh];
            hrAltPressure.push(p);
            hrAlt.push(logscale(p, [1050, 100], [0, 100]));
        }
    });

    //fi x  underground clouds,  add humidty 0 element in airData wehre the pressure is surfcace pressure +1:
    airData[`rh-${(hrAltPressure[0] + 1)}h`] = [0];
    hrAlt.unshift(null, hrAlt[0]);
    hrAltPressure.unshift(null, hrAltPressure[0] + 1);
    hrAltPressure.pop(); hrAltPressure.push(null);

    ///////////


    const numX = airData[`rh-${hrAltPressure[1]}h`].length;
    const numY = hrAltPressure.length;
    const rawClouds = new Array(numX * numY);

    for (let y = 0, index = 0; y < numY; ++y) {
        if (hrAltPressure[y] == null) {
            for (let x = 0; x < numX; ++x) {
                rawClouds[index++] = 0.0;
            }
        } else {
            const weight = hrAlt[y] * 0.01;
            const pAdd = lerp$1(-60, -70, weight);
            const pMul = lerp$1(0.025, 0.038, weight);
            const pPow = lerp$1(6, 4, weight);
            const pMul2 = 1 - 0.8 * Math.pow(weight, 0.7);
            const rhRow = airData[`rh-${hrAltPressure[y]}h`];
            for (let x = 0; x < numX; ++x) {
                const hr = Number(rhRow[x]);
                let f = Math.max(0.0, Math.min((hr + pAdd) * pMul, 1.0));
                f = Math.pow(f, pPow) * pMul2;
                rawClouds[index++] = f;
            }
        }
    }


    // Interpolate raw clouds.
    const sliceWidth = wdth || 10;
    const width = sliceWidth * numX;
    const height = hght || 300;
    const clouds = new Array(width * height);
    const kh = (height - 1) * 0.01;
    const dx2 = (sliceWidth + 1) >> 1;
    let heightLookupIndex = 2 * height;
    const heightLookup = new Array(heightLookupIndex);
    const buffer = new Array(16);
    let previousY;
    let currentY = height;

    for (let j = 0; j < numY - 1; ++j) {
        previousY = currentY;
        currentY = Math.round(height - 1 - hrAlt[j + 1] * kh);
        const j0 = numX * clampIndex(j + 2, numY);
        const j1 = numX * clampIndex(j + 1, numY);
        const j2 = numX * clampIndex(j + 0, numY);
        const j3 = numX * clampIndex(j - 1, numY);
        let previousX = 0;
        let currentX = dx2;
        const deltaY = previousY - currentY;
        const invDeltaY = 1.0 / deltaY;

        for (let i = 0; i < numX + 1; ++i) {
            if (i == 0 && deltaY > 0) {
                const ry = 1.0 / deltaY;
                for (let l = 0; l < deltaY; l++) {
                    heightLookup[--heightLookupIndex] = j;
                    heightLookup[--heightLookupIndex] = Math.round(10000 * ry * l);
                }
            }
            const i0 = clampIndex(i - 2, numX);
            const i1 = clampIndex(i - 1, numX);
            const i2 = clampIndex(i + 0, numX);
            const i3 = clampIndex(i + 1, numX);
            buffer[0] = rawClouds[j0 + i0];
            buffer[1] = rawClouds[j0 + i1];
            buffer[2] = rawClouds[j0 + i2];
            buffer[3] = rawClouds[j0 + i3];
            buffer[4] = rawClouds[j1 + i0];
            buffer[5] = rawClouds[j1 + i1];
            buffer[6] = rawClouds[j1 + i2];
            buffer[7] = rawClouds[j1 + i3];
            buffer[8] = rawClouds[j2 + i0];
            buffer[9] = rawClouds[j2 + i1];
            buffer[10] = rawClouds[j2 + i2];
            buffer[11] = rawClouds[j2 + i3];
            buffer[12] = rawClouds[j3 + i0];
            buffer[13] = rawClouds[j3 + i1];
            buffer[14] = rawClouds[j3 + i2];
            buffer[15] = rawClouds[j3 + i3];

            const topLeft = currentY * width + previousX;
            const dx = currentX - previousX;
            const fx = 1.0 / dx;

            for (let y = 0; y < deltaY; ++y) {
                let offset = topLeft + y * width;
                for (let x = 0; x < dx; ++x) {
                    const black = step(bicubicFiltering(buffer, fx * x, invDeltaY * y) * 160.0);
                    clouds[offset++] = 255 - black;
                }
            }

            previousX = currentX;
            currentX += sliceWidth;

            if (currentX > width) {
                currentX = width;
            }
        }
    }

    return { clouds, width, height };
}

function clampIndex(index, size) {
    return index < 0 ? 0 : index > size - 1 ? size - 1 : index;
}

function step(x) {
    return lookup[Math.floor(clampIndex(x, 160))];
}

function cubicInterpolate(y0, y1, y2, y3, m) {
    const a0 = -y0 * 0.5 + 3.0 * y1 * 0.5 - 3.0 * y2 * 0.5 + y3 * 0.5;
    const a1 = y0 - 5.0 * y1 * 0.5 + 2.0 * y2 - y3 * 0.5;
    const a2 = -y0 * 0.5 + y2 * 0.5;
    return a0 * m ** 3 + a1 * m ** 2 + a2 * m + y1;
}

function bicubicFiltering(m, s, t) {
    return cubicInterpolate(
        cubicInterpolate(m[0], m[1], m[2], m[3], s),
        cubicInterpolate(m[4], m[5], m[6], m[7], s),
        cubicInterpolate(m[8], m[9], m[10], m[11], s),
        cubicInterpolate(m[12], m[13], m[14], m[15], s),
        t
    );
}

// Draw the clouds on a canvas.
// This function is useful for debugging.
function cloudsToCanvas({ clouds, width, height, canvas }) {
    if (canvas == null) {
        canvas = document.createElement("canvas");
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    let imageData = ctx.getImageData(0, 0, width, height);
    let imgData = imageData.data;


    let srcOffset = 0;
    let dstOffset = 0;
    for (let x = 0; x < width; ++x) {
        for (let y = 0; y < height; ++y) {
            const color = clouds[srcOffset++];
            imgData[dstOffset++] = color;
            imgData[dstOffset++] = color;
            imgData[dstOffset++] = color;
            imgData[dstOffset++] = color < 245 ? 255 : 0;
        }
    }


    ctx.putImageData(imageData, 0, 0);
    ctx.drawImage(canvas, 0, 0, width, height);

    return canvas;
}

var clouds = {
    computeClouds,
    cloudsToCanvas
};/* eslint-disable */
const t={};
function n(t,n){return t<n?-1:t>n?1:t>=n?0:NaN}function e(t){var e;return 1===t.length&&(e=t,t=function(t,r){return n(e(t),r)}),{left:function(n,e,r,i){for(null==r&&(r=0),null==i&&(i=n.length);r<i;){var o=r+i>>>1;t(n[o],e)<0?r=o+1:i=o;}return r},right:function(n,e,r,i){for(null==r&&(r=0),null==i&&(i=n.length);r<i;){var o=r+i>>>1;t(n[o],e)>0?i=o:r=o+1;}return r}}}var r=e(n),i=r.right;var o=Math.sqrt(50),a=Math.sqrt(10),u=Math.sqrt(2);function s(t,n,e){var r,i,o,a,u=-1;if(e=+e,(t=+t)===(n=+n)&&e>0)return [t];if((r=n<t)&&(i=t,t=n,n=i),0===(a=l(t,n,e))||!isFinite(a))return [];if(a>0)for(t=Math.ceil(t/a),n=Math.floor(n/a),o=new Array(i=Math.ceil(n-t+1));++u<i;)o[u]=(t+u)*a;else for(t=Math.floor(t*a),n=Math.ceil(n*a),o=new Array(i=Math.ceil(t-n+1));++u<i;)o[u]=(t-u)/a;return r&&o.reverse(),o}function l(t,n,e){var r=(n-t)/Math.max(0,e),i=Math.floor(Math.log(r)/Math.LN10),s=r/Math.pow(10,i);return i>=0?(s>=o?10:s>=a?5:s>=u?2:1)*Math.pow(10,i):-Math.pow(10,-i)/(s>=o?10:s>=a?5:s>=u?2:1)}var c=Array.prototype.slice;function h(t){return t}var f=1e-6;function p(t){return "translate("+(t+.5)+",0)"}function d(t){return "translate(0,"+(t+.5)+")"}function g$1(t){return function(n){return +t(n)}}function v(t){var n=Math.max(0,t.bandwidth()-1)/2;return t.round()&&(n=Math.round(n)),function(e){return +t(e)+n}}function m(){return !this.__axis}function y(t,n){var e=[],r=null,i=null,o=6,a=6,u=3,s=1===t||4===t?-1:1,l=4===t||2===t?"x":"y",y=1===t||3===t?p:d;function _(c){var p=null==r?n.ticks?n.ticks.apply(n,e):n.domain():r,d=null==i?n.tickFormat?n.tickFormat.apply(n,e):h:i,_=Math.max(o,0)+u,w=n.range(),x=+w[0]+.5,b=+w[w.length-1]+.5,M=(n.bandwidth?v:g$1)(n.copy()),k=c.selection?c.selection():c,N=k.selectAll(".domain").data([null]),A=k.selectAll(".tick").data(p,n).order(),E=A.exit(),S=A.enter().append("g").attr("class","tick"),T=A.select("line"),P=A.select("text");N=N.merge(N.enter().insert("path",".tick").attr("class","domain").attr("stroke","currentColor")),A=A.merge(S),T=T.merge(S.append("line").attr("stroke","currentColor").attr(l+"2",s*o)),P=P.merge(S.append("text").attr("fill","currentColor").attr(l,s*_).attr("dy",1===t?"0em":3===t?"0.71em":"0.32em")),c!==k&&(N=N.transition(c),A=A.transition(c),T=T.transition(c),P=P.transition(c),E=E.transition(c).attr("opacity",f).attr("transform",(function(t){return isFinite(t=M(t))?y(t):this.getAttribute("transform")})),S.attr("opacity",f).attr("transform",(function(t){var n=this.parentNode.__axis;return y(n&&isFinite(n=n(t))?n:M(t))}))),E.remove(),N.attr("d",4===t||2==t?a?"M"+s*a+","+x+"H0.5V"+b+"H"+s*a:"M0.5,"+x+"V"+b:a?"M"+x+","+s*a+"V0.5H"+b+"V"+s*a:"M"+x+",0.5H"+b),A.attr("opacity",1).attr("transform",(function(t){return y(M(t))})),T.attr(l+"2",s*o),P.attr(l,s*_).text(d),k.filter(m).attr("fill","none").attr("font-size",10).attr("font-family","sans-serif").attr("text-anchor",2===t?"start":4===t?"end":"middle"),k.each((function(){this.__axis=M;}));}return _.scale=function(t){return arguments.length?(n=t,_):n},_.ticks=function(){return e=c.call(arguments),_},_.tickArguments=function(t){return arguments.length?(e=null==t?[]:c.call(t),_):e.slice()},_.tickValues=function(t){return arguments.length?(r=null==t?null:c.call(t),_):r&&r.slice()},_.tickFormat=function(t){return arguments.length?(i=t,_):i},_.tickSize=function(t){return arguments.length?(o=a=+t,_):o},_.tickSizeInner=function(t){return arguments.length?(o=+t,_):o},_.tickSizeOuter=function(t){return arguments.length?(a=+t,_):a},_.tickPadding=function(t){return arguments.length?(u=+t,_):u},_}var _={value:function(){}};function w(){for(var t,n=0,e=arguments.length,r={};n<e;++n){if(!(t=arguments[n]+"")||t in r||/[\s.]/.test(t))throw new Error("illegal type: "+t);r[t]=[];}return new x(r)}function x(t){this._=t;}function b(t,n){return t.trim().split(/^|\s+/).map((function(t){var e="",r=t.indexOf(".");if(r>=0&&(e=t.slice(r+1),t=t.slice(0,r)),t&&!n.hasOwnProperty(t))throw new Error("unknown type: "+t);return {type:t,name:e}}))}function M(t,n){for(var e,r=0,i=t.length;r<i;++r)if((e=t[r]).name===n)return e.value}function k(t,n,e){for(var r=0,i=t.length;r<i;++r)if(t[r].name===n){t[r]=_,t=t.slice(0,r).concat(t.slice(r+1));break}return null!=e&&t.push({name:n,value:e}),t}x.prototype=w.prototype={constructor:x,on:function(t,n){var e,r=this._,i=b(t+"",r),o=-1,a=i.length;if(!(arguments.length<2)){if(null!=n&&"function"!=typeof n)throw new Error("invalid callback: "+n);for(;++o<a;)if(e=(t=i[o]).type)r[e]=k(r[e],t.name,n);else if(null==n)for(e in r)r[e]=k(r[e],t.name,null);return this}for(;++o<a;)if((e=(t=i[o]).type)&&(e=M(r[e],t.name)))return e},copy:function(){var t={},n=this._;for(var e in n)t[e]=n[e].slice();return new x(t)},call:function(t,n){if((e=arguments.length-2)>0)for(var e,r,i=new Array(e),o=0;o<e;++o)i[o]=arguments[o+2];if(!this._.hasOwnProperty(t))throw new Error("unknown type: "+t);for(o=0,e=(r=this._[t]).length;o<e;++o)r[o].value.apply(n,i);},apply:function(t,n,e){if(!this._.hasOwnProperty(t))throw new Error("unknown type: "+t);for(var r=this._[t],i=0,o=r.length;i<o;++i)r[i].value.apply(n,e);}};var N="http://www.w3.org/1999/xhtml",A={svg:"http://www.w3.org/2000/svg",xhtml:N,xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};function E(t){var n=t+="",e=n.indexOf(":");return e>=0&&"xmlns"!==(n=t.slice(0,e))&&(t=t.slice(e+1)),A.hasOwnProperty(n)?{space:A[n],local:t}:t}function S(t){return function(){var n=this.ownerDocument,e=this.namespaceURI;return e===N&&n.documentElement.namespaceURI===N?n.createElement(t):n.createElementNS(e,t)}}function T(t){return function(){return this.ownerDocument.createElementNS(t.space,t.local)}}function P(t){var n=E(t);return (n.local?T:S)(n)}function C(){}function q(t){return null==t?C:function(){return this.querySelector(t)}}function z(){return []}function L$2(t){return null==t?z:function(){return this.querySelectorAll(t)}}function j(t){return function(){return this.matches(t)}}function X(t){return new Array(t.length)}function O(t,n){this.ownerDocument=t.ownerDocument,this.namespaceURI=t.namespaceURI,this._next=null,this._parent=t,this.__data__=n;}O.prototype={constructor:O,appendChild:function(t){return this._parent.insertBefore(t,this._next)},insertBefore:function(t,n){return this._parent.insertBefore(t,n)},querySelector:function(t){return this._parent.querySelector(t)},querySelectorAll:function(t){return this._parent.querySelectorAll(t)}};function V(t,n,e,r,i,o){for(var a,u=0,s=n.length,l=o.length;u<l;++u)(a=n[u])?(a.__data__=o[u],r[u]=a):e[u]=new O(t,o[u]);for(;u<s;++u)(a=n[u])&&(i[u]=a);}function R(t,n,e,r,i,o,a){var u,s,l,c={},h=n.length,f=o.length,p=new Array(h);for(u=0;u<h;++u)(s=n[u])&&(p[u]=l="$"+a.call(s,s.__data__,u,n),l in c?i[u]=s:c[l]=s);for(u=0;u<f;++u)(s=c[l="$"+a.call(t,o[u],u,o)])?(r[u]=s,s.__data__=o[u],c[l]=null):e[u]=new O(t,o[u]);for(u=0;u<h;++u)(s=n[u])&&c[p[u]]===s&&(i[u]=s);}function I(t,n){return t<n?-1:t>n?1:t>=n?0:NaN}function D(t){return function(){this.removeAttribute(t);}}function $(t){return function(){this.removeAttributeNS(t.space,t.local);}}function H(t,n){return function(){this.setAttribute(t,n);}}function F(t,n){return function(){this.setAttributeNS(t.space,t.local,n);}}function Y(t,n){return function(){var e=n.apply(this,arguments);null==e?this.removeAttribute(t):this.setAttribute(t,e);}}function B(t,n){return function(){var e=n.apply(this,arguments);null==e?this.removeAttributeNS(t.space,t.local):this.setAttributeNS(t.space,t.local,e);}}function U(t){return t.ownerDocument&&t.ownerDocument.defaultView||t.document&&t||t.defaultView}function G(t){return function(){this.style.removeProperty(t);}}function Z(t,n,e){return function(){this.style.setProperty(t,n,e);}}function K(t,n,e){return function(){var r=n.apply(this,arguments);null==r?this.style.removeProperty(t):this.style.setProperty(t,r,e);}}function Q(t,n){return t.style.getPropertyValue(n)||U(t).getComputedStyle(t,null).getPropertyValue(n)}function J(t){return function(){delete this[t];}}function W(t,n){return function(){this[t]=n;}}function tt(t,n){return function(){var e=n.apply(this,arguments);null==e?delete this[t]:this[t]=e;}}function nt(t){return t.trim().split(/^|\s+/)}function et(t){return t.classList||new rt(t)}function rt(t){this._node=t,this._names=nt(t.getAttribute("class")||"");}function it(t,n){for(var e=et(t),r=-1,i=n.length;++r<i;)e.add(n[r]);}function ot(t,n){for(var e=et(t),r=-1,i=n.length;++r<i;)e.remove(n[r]);}function at(t){return function(){it(this,t);}}function ut(t){return function(){ot(this,t);}}function st(t,n){return function(){(n.apply(this,arguments)?it:ot)(this,t);}}function lt(){this.textContent="";}function ct(t){return function(){this.textContent=t;}}function ht(t){return function(){var n=t.apply(this,arguments);this.textContent=null==n?"":n;}}function ft(){this.innerHTML="";}function pt(t){return function(){this.innerHTML=t;}}function dt(t){return function(){var n=t.apply(this,arguments);this.innerHTML=null==n?"":n;}}function gt(){this.nextSibling&&this.parentNode.appendChild(this);}function vt(){this.previousSibling&&this.parentNode.insertBefore(this,this.parentNode.firstChild);}function mt(){return null}function yt(){var t=this.parentNode;t&&t.removeChild(this);}function _t(){var t=this.cloneNode(!1),n=this.parentNode;return n?n.insertBefore(t,this.nextSibling):t}function wt(){var t=this.cloneNode(!0),n=this.parentNode;return n?n.insertBefore(t,this.nextSibling):t}rt.prototype={add:function(t){this._names.indexOf(t)<0&&(this._names.push(t),this._node.setAttribute("class",this._names.join(" ")));},remove:function(t){var n=this._names.indexOf(t);n>=0&&(this._names.splice(n,1),this._node.setAttribute("class",this._names.join(" ")));},contains:function(t){return this._names.indexOf(t)>=0}};var xt={},bt=null;"undefined"!=typeof document&&("onmouseenter"in document.documentElement||(xt={mouseenter:"mouseover",mouseleave:"mouseout"}));function Mt(t,n,e){return t=kt(t,n,e),function(n){var e=n.relatedTarget;e&&(e===this||8&e.compareDocumentPosition(this))||t.call(this,n);}}function kt(t,n,e){return function(r){var i=bt;bt=r;try{t.call(this,this.__data__,n,e);}finally{bt=i;}}}function Nt(t){return t.trim().split(/^|\s+/).map((function(t){var n="",e=t.indexOf(".");return e>=0&&(n=t.slice(e+1),t=t.slice(0,e)),{type:t,name:n}}))}function At(t){return function(){var n=this.__on;if(n){for(var e,r=0,i=-1,o=n.length;r<o;++r)e=n[r],t.type&&e.type!==t.type||e.name!==t.name?n[++i]=e:this.removeEventListener(e.type,e.listener,e.capture);++i?n.length=i:delete this.__on;}}}function Et(t,n,e){var r=xt.hasOwnProperty(t.type)?Mt:kt;return function(i,o,a){var u,s=this.__on,l=r(n,o,a);if(s)for(var c=0,h=s.length;c<h;++c)if((u=s[c]).type===t.type&&u.name===t.name)return this.removeEventListener(u.type,u.listener,u.capture),this.addEventListener(u.type,u.listener=l,u.capture=e),void(u.value=n);this.addEventListener(t.type,l,e),u={type:t.type,name:t.name,value:n,listener:l,capture:e},s?s.push(u):this.__on=[u];}}function St(t,n,e,r){var i=bt;t.sourceEvent=bt,bt=t;try{return n.apply(e,r)}finally{bt=i;}}function Tt(t,n,e){var r=U(t),i=r.CustomEvent;"function"==typeof i?i=new i(n,e):(i=r.document.createEvent("Event"),e?(i.initEvent(n,e.bubbles,e.cancelable),i.detail=e.detail):i.initEvent(n,!1,!1)),t.dispatchEvent(i);}function Pt(t,n){return function(){return Tt(this,t,n)}}function Ct(t,n){return function(){return Tt(this,t,n.apply(this,arguments))}}var qt=[null];function zt(t,n){this._groups=t,this._parents=n;}function Lt(){return new zt([[document.documentElement]],qt)}function jt(t){return "string"==typeof t?new zt([[document.querySelector(t)]],[document.documentElement]):new zt([[t]],qt)}function Xt(){for(var t,n=bt;t=n.sourceEvent;)n=t;return n}function Ot(t,n){var e=t.ownerSVGElement||t;if(e.createSVGPoint){var r=e.createSVGPoint();return r.x=n.clientX,r.y=n.clientY,[(r=r.matrixTransform(t.getScreenCTM().inverse())).x,r.y]}var i=t.getBoundingClientRect();return [n.clientX-i.left-t.clientLeft,n.clientY-i.top-t.clientTop]}function Vt(t){var n=Xt();return n.changedTouches&&(n=n.changedTouches[0]),Ot(t,n)}function Rt(t,n,e){arguments.length<3&&(e=n,n=Xt().changedTouches);for(var r,i=0,o=n?n.length:0;i<o;++i)if((r=n[i]).identifier===e)return Ot(t,r);return null}function It(){bt.stopImmediatePropagation();}function Dt(){bt.preventDefault(),bt.stopImmediatePropagation();}function $t(t){var n=t.document.documentElement,e=jt(t).on("dragstart.drag",Dt,!0);"onselectstart"in n?e.on("selectstart.drag",Dt,!0):(n.__noselect=n.style.MozUserSelect,n.style.MozUserSelect="none");}function Ht(t){return function(){return t}}function Ft(t,n,e,r,i,o,a,u,s,l){this.target=t,this.type=n,this.subject=e,this.identifier=r,this.active=i,this.x=o,this.y=a,this.dx=u,this.dy=s,this._=l;}function Yt(){return !bt.ctrlKey&&!bt.button}function Bt(){return this.parentNode}function Ut(t){return null==t?{x:bt.x,y:bt.y}:t}function Gt(){return navigator.maxTouchPoints||"ontouchstart"in this}function Zt(t,n,e){t.prototype=n.prototype=e,e.constructor=t;}function Kt(t,n){var e=Object.create(t.prototype);for(var r in n)e[r]=n[r];return e}function Qt(){}zt.prototype=Lt.prototype={constructor:zt,select:function(t){"function"!=typeof t&&(t=q(t));for(var n=this._groups,e=n.length,r=new Array(e),i=0;i<e;++i)for(var o,a,u=n[i],s=u.length,l=r[i]=new Array(s),c=0;c<s;++c)(o=u[c])&&(a=t.call(o,o.__data__,c,u))&&("__data__"in o&&(a.__data__=o.__data__),l[c]=a);return new zt(r,this._parents)},selectAll:function(t){"function"!=typeof t&&(t=L$2(t));for(var n=this._groups,e=n.length,r=[],i=[],o=0;o<e;++o)for(var a,u=n[o],s=u.length,l=0;l<s;++l)(a=u[l])&&(r.push(t.call(a,a.__data__,l,u)),i.push(a));return new zt(r,i)},filter:function(t){"function"!=typeof t&&(t=j(t));for(var n=this._groups,e=n.length,r=new Array(e),i=0;i<e;++i)for(var o,a=n[i],u=a.length,s=r[i]=[],l=0;l<u;++l)(o=a[l])&&t.call(o,o.__data__,l,a)&&s.push(o);return new zt(r,this._parents)},data:function(t,n){if(!t)return p=new Array(this.size()),l=-1,this.each((function(t){p[++l]=t;})),p;var e=n?R:V,r=this._parents,i=this._groups;"function"!=typeof t&&(t=function(t){return function(){return t}}(t));for(var o=i.length,a=new Array(o),u=new Array(o),s=new Array(o),l=0;l<o;++l){var c=r[l],h=i[l],f=h.length,p=t.call(c,c&&c.__data__,l,r),d=p.length,g=u[l]=new Array(d),v=a[l]=new Array(d);e(c,h,g,v,s[l]=new Array(f),p,n);for(var m,y,_=0,w=0;_<d;++_)if(m=g[_]){for(_>=w&&(w=_+1);!(y=v[w])&&++w<d;);m._next=y||null;}}return (a=new zt(a,r))._enter=u,a._exit=s,a},enter:function(){return new zt(this._enter||this._groups.map(X),this._parents)},exit:function(){return new zt(this._exit||this._groups.map(X),this._parents)},join:function(t,n,e){var r=this.enter(),i=this,o=this.exit();return r="function"==typeof t?t(r):r.append(t+""),null!=n&&(i=n(i)),null==e?o.remove():e(o),r&&i?r.merge(i).order():i},merge:function(t){for(var n=this._groups,e=t._groups,r=n.length,i=e.length,o=Math.min(r,i),a=new Array(r),u=0;u<o;++u)for(var s,l=n[u],c=e[u],h=l.length,f=a[u]=new Array(h),p=0;p<h;++p)(s=l[p]||c[p])&&(f[p]=s);for(;u<r;++u)a[u]=n[u];return new zt(a,this._parents)},order:function(){for(var t=this._groups,n=-1,e=t.length;++n<e;)for(var r,i=t[n],o=i.length-1,a=i[o];--o>=0;)(r=i[o])&&(a&&4^r.compareDocumentPosition(a)&&a.parentNode.insertBefore(r,a),a=r);return this},sort:function(t){function n(n,e){return n&&e?t(n.__data__,e.__data__):!n-!e}t||(t=I);for(var e=this._groups,r=e.length,i=new Array(r),o=0;o<r;++o){for(var a,u=e[o],s=u.length,l=i[o]=new Array(s),c=0;c<s;++c)(a=u[c])&&(l[c]=a);l.sort(n);}return new zt(i,this._parents).order()},call:function(){var t=arguments[0];return arguments[0]=this,t.apply(null,arguments),this},nodes:function(){var t=new Array(this.size()),n=-1;return this.each((function(){t[++n]=this;})),t},node:function(){for(var t=this._groups,n=0,e=t.length;n<e;++n)for(var r=t[n],i=0,o=r.length;i<o;++i){var a=r[i];if(a)return a}return null},size:function(){var t=0;return this.each((function(){++t;})),t},empty:function(){return !this.node()},each:function(t){for(var n=this._groups,e=0,r=n.length;e<r;++e)for(var i,o=n[e],a=0,u=o.length;a<u;++a)(i=o[a])&&t.call(i,i.__data__,a,o);return this},attr:function(t,n){var e=E(t);if(arguments.length<2){var r=this.node();return e.local?r.getAttributeNS(e.space,e.local):r.getAttribute(e)}return this.each((null==n?e.local?$:D:"function"==typeof n?e.local?B:Y:e.local?F:H)(e,n))},style:function(t,n,e){return arguments.length>1?this.each((null==n?G:"function"==typeof n?K:Z)(t,n,null==e?"":e)):Q(this.node(),t)},property:function(t,n){return arguments.length>1?this.each((null==n?J:"function"==typeof n?tt:W)(t,n)):this.node()[t]},classed:function(t,n){var e=nt(t+"");if(arguments.length<2){for(var r=et(this.node()),i=-1,o=e.length;++i<o;)if(!r.contains(e[i]))return !1;return !0}return this.each(("function"==typeof n?st:n?at:ut)(e,n))},text:function(t){return arguments.length?this.each(null==t?lt:("function"==typeof t?ht:ct)(t)):this.node().textContent},html:function(t){return arguments.length?this.each(null==t?ft:("function"==typeof t?dt:pt)(t)):this.node().innerHTML},raise:function(){return this.each(gt)},lower:function(){return this.each(vt)},append:function(t){var n="function"==typeof t?t:P(t);return this.select((function(){return this.appendChild(n.apply(this,arguments))}))},insert:function(t,n){var e="function"==typeof t?t:P(t),r=null==n?mt:"function"==typeof n?n:q(n);return this.select((function(){return this.insertBefore(e.apply(this,arguments),r.apply(this,arguments)||null)}))},remove:function(){return this.each(yt)},clone:function(t){return this.select(t?wt:_t)},datum:function(t){return arguments.length?this.property("__data__",t):this.node().__data__},on:function(t,n,e){var r,i,o=Nt(t+""),a=o.length;if(!(arguments.length<2)){for(u=n?Et:At,null==e&&(e=!1),r=0;r<a;++r)this.each(u(o[r],n,e));return this}var u=this.node().__on;if(u)for(var s,l=0,c=u.length;l<c;++l)for(r=0,s=u[l];r<a;++r)if((i=o[r]).type===s.type&&i.name===s.name)return s.value},dispatch:function(t,n){return this.each(("function"==typeof n?Ct:Pt)(t,n))}},Ft.prototype.on=function(){var t=this._.on.apply(this._,arguments);return t===this._?this:t};var Jt=.7,Wt=1/Jt,tn="\\s*([+-]?\\d+)\\s*",nn="\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",en="\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",rn=/^#([0-9a-f]{3,8})$/,on=new RegExp("^rgb\\("+[tn,tn,tn]+"\\)$"),an=new RegExp("^rgb\\("+[en,en,en]+"\\)$"),un=new RegExp("^rgba\\("+[tn,tn,tn,nn]+"\\)$"),sn=new RegExp("^rgba\\("+[en,en,en,nn]+"\\)$"),ln=new RegExp("^hsl\\("+[nn,en,en]+"\\)$"),cn=new RegExp("^hsla\\("+[nn,en,en,nn]+"\\)$"),hn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};function fn(){return this.rgb().formatHex()}function pn(){return this.rgb().formatRgb()}function dn(t){var n,e;return t=(t+"").trim().toLowerCase(),(n=rn.exec(t))?(e=n[1].length,n=parseInt(n[1],16),6===e?gn(n):3===e?new _n(n>>8&15|n>>4&240,n>>4&15|240&n,(15&n)<<4|15&n,1):8===e?vn(n>>24&255,n>>16&255,n>>8&255,(255&n)/255):4===e?vn(n>>12&15|n>>8&240,n>>8&15|n>>4&240,n>>4&15|240&n,((15&n)<<4|15&n)/255):null):(n=on.exec(t))?new _n(n[1],n[2],n[3],1):(n=an.exec(t))?new _n(255*n[1]/100,255*n[2]/100,255*n[3]/100,1):(n=un.exec(t))?vn(n[1],n[2],n[3],n[4]):(n=sn.exec(t))?vn(255*n[1]/100,255*n[2]/100,255*n[3]/100,n[4]):(n=ln.exec(t))?Mn(n[1],n[2]/100,n[3]/100,1):(n=cn.exec(t))?Mn(n[1],n[2]/100,n[3]/100,n[4]):hn.hasOwnProperty(t)?gn(hn[t]):"transparent"===t?new _n(NaN,NaN,NaN,0):null}function gn(t){return new _n(t>>16&255,t>>8&255,255&t,1)}function vn(t,n,e,r){return r<=0&&(t=n=e=NaN),new _n(t,n,e,r)}function mn(t){return t instanceof Qt||(t=dn(t)),t?new _n((t=t.rgb()).r,t.g,t.b,t.opacity):new _n}function yn(t,n,e,r){return 1===arguments.length?mn(t):new _n(t,n,e,null==r?1:r)}function _n(t,n,e,r){this.r=+t,this.g=+n,this.b=+e,this.opacity=+r;}function wn(){return "#"+bn(this.r)+bn(this.g)+bn(this.b)}function xn(){var t=this.opacity;return (1===(t=isNaN(t)?1:Math.max(0,Math.min(1,t)))?"rgb(":"rgba(")+Math.max(0,Math.min(255,Math.round(this.r)||0))+", "+Math.max(0,Math.min(255,Math.round(this.g)||0))+", "+Math.max(0,Math.min(255,Math.round(this.b)||0))+(1===t?")":", "+t+")")}function bn(t){return ((t=Math.max(0,Math.min(255,Math.round(t)||0)))<16?"0":"")+t.toString(16)}function Mn(t,n,e,r){return r<=0?t=n=e=NaN:e<=0||e>=1?t=n=NaN:n<=0&&(t=NaN),new Nn(t,n,e,r)}function kn(t){if(t instanceof Nn)return new Nn(t.h,t.s,t.l,t.opacity);if(t instanceof Qt||(t=dn(t)),!t)return new Nn;if(t instanceof Nn)return t;var n=(t=t.rgb()).r/255,e=t.g/255,r=t.b/255,i=Math.min(n,e,r),o=Math.max(n,e,r),a=NaN,u=o-i,s=(o+i)/2;return u?(a=n===o?(e-r)/u+6*(e<r):e===o?(r-n)/u+2:(n-e)/u+4,u/=s<.5?o+i:2-o-i,a*=60):u=s>0&&s<1?0:a,new Nn(a,u,s,t.opacity)}function Nn(t,n,e,r){this.h=+t,this.s=+n,this.l=+e,this.opacity=+r;}function An(t,n,e){return 255*(t<60?n+(e-n)*t/60:t<180?e:t<240?n+(e-n)*(240-t)/60:n)}function En(t){return function(){return t}}function Sn(t){return 1==(t=+t)?Tn:function(n,e){return e-n?function(t,n,e){return t=Math.pow(t,e),n=Math.pow(n,e)-t,e=1/e,function(r){return Math.pow(t+r*n,e)}}(n,e,t):En(isNaN(n)?e:n)}}function Tn(t,n){var e=n-t;return e?function(t,n){return function(e){return t+e*n}}(t,e):En(isNaN(t)?n:t)}Zt(Qt,dn,{copy:function(t){return Object.assign(new this.constructor,this,t)},displayable:function(){return this.rgb().displayable()},hex:fn,formatHex:fn,formatHsl:function(){return kn(this).formatHsl()},formatRgb:pn,toString:pn}),Zt(_n,yn,Kt(Qt,{brighter:function(t){return t=null==t?Wt:Math.pow(Wt,t),new _n(this.r*t,this.g*t,this.b*t,this.opacity)},darker:function(t){return t=null==t?Jt:Math.pow(Jt,t),new _n(this.r*t,this.g*t,this.b*t,this.opacity)},rgb:function(){return this},displayable:function(){return -.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:wn,formatHex:wn,formatRgb:xn,toString:xn})),Zt(Nn,(function(t,n,e,r){return 1===arguments.length?kn(t):new Nn(t,n,e,null==r?1:r)}),Kt(Qt,{brighter:function(t){return t=null==t?Wt:Math.pow(Wt,t),new Nn(this.h,this.s,this.l*t,this.opacity)},darker:function(t){return t=null==t?Jt:Math.pow(Jt,t),new Nn(this.h,this.s,this.l*t,this.opacity)},rgb:function(){var t=this.h%360+360*(this.h<0),n=isNaN(t)||isNaN(this.s)?0:this.s,e=this.l,r=e+(e<.5?e:1-e)*n,i=2*e-r;return new _n(An(t>=240?t-240:t+120,i,r),An(t,i,r),An(t<120?t+240:t-120,i,r),this.opacity)},displayable:function(){return (0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl:function(){var t=this.opacity;return (1===(t=isNaN(t)?1:Math.max(0,Math.min(1,t)))?"hsl(":"hsla(")+(this.h||0)+", "+100*(this.s||0)+"%, "+100*(this.l||0)+"%"+(1===t?")":", "+t+")")}}));var Pn=function t(n){var e=Sn(n);function r(t,n){var r=e((t=yn(t)).r,(n=yn(n)).r),i=e(t.g,n.g),o=e(t.b,n.b),a=Tn(t.opacity,n.opacity);return function(n){return t.r=r(n),t.g=i(n),t.b=o(n),t.opacity=a(n),t+""}}return r.gamma=t,r}(1);function Cn(t,n){n||(n=[]);var e,r=t?Math.min(n.length,t.length):0,i=n.slice();return function(o){for(e=0;e<r;++e)i[e]=t[e]*(1-o)+n[e]*o;return i}}function qn(t,n){var e,r=n?n.length:0,i=t?Math.min(r,t.length):0,o=new Array(i),a=new Array(r);for(e=0;e<i;++e)o[e]=Rn(t[e],n[e]);for(;e<r;++e)a[e]=n[e];return function(t){for(e=0;e<i;++e)a[e]=o[e](t);return a}}function zn(t,n){var e=new Date;return t=+t,n=+n,function(r){return e.setTime(t*(1-r)+n*r),e}}function Ln(t,n){return t=+t,n=+n,function(e){return t*(1-e)+n*e}}function jn(t,n){var e,r={},i={};for(e in null!==t&&"object"==typeof t||(t={}),null!==n&&"object"==typeof n||(n={}),n)e in t?r[e]=Rn(t[e],n[e]):i[e]=n[e];return function(t){for(e in r)i[e]=r[e](t);return i}}var Xn=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,On=new RegExp(Xn.source,"g");function Vn(t,n){var e,r,i,o=Xn.lastIndex=On.lastIndex=0,a=-1,u=[],s=[];for(t+="",n+="";(e=Xn.exec(t))&&(r=On.exec(n));)(i=r.index)>o&&(i=n.slice(o,i),u[a]?u[a]+=i:u[++a]=i),(e=e[0])===(r=r[0])?u[a]?u[a]+=r:u[++a]=r:(u[++a]=null,s.push({i:a,x:Ln(e,r)})),o=On.lastIndex;return o<n.length&&(i=n.slice(o),u[a]?u[a]+=i:u[++a]=i),u.length<2?s[0]?function(t){return function(n){return t(n)+""}}(s[0].x):function(t){return function(){return t}}(n):(n=s.length,function(t){for(var e,r=0;r<n;++r)u[(e=s[r]).i]=e.x(t);return u.join("")})}function Rn(t,n){var e,r=typeof n;return null==n||"boolean"===r?En(n):("number"===r?Ln:"string"===r?(e=dn(n))?(n=e,Pn):Vn:n instanceof dn?Pn:n instanceof Date?zn:function(t){return ArrayBuffer.isView(t)&&!(t instanceof DataView)}(n)?Cn:Array.isArray(n)?qn:"function"!=typeof n.valueOf&&"function"!=typeof n.toString||isNaN(n)?jn:Ln)(t,n)}function In(t,n){return t=+t,n=+n,function(e){return Math.round(t*(1-e)+n*e)}}var Dn,$n,Hn,Fn,Yn=180/Math.PI,Bn={translateX:0,translateY:0,rotate:0,skewX:0,scaleX:1,scaleY:1};function Un(t,n,e,r,i,o){var a,u,s;return (a=Math.sqrt(t*t+n*n))&&(t/=a,n/=a),(s=t*e+n*r)&&(e-=t*s,r-=n*s),(u=Math.sqrt(e*e+r*r))&&(e/=u,r/=u,s/=u),t*r<n*e&&(t=-t,n=-n,s=-s,a=-a),{translateX:i,translateY:o,rotate:Math.atan2(n,t)*Yn,skewX:Math.atan(s)*Yn,scaleX:a,scaleY:u}}function Gn(t,n,e,r){function i(t){return t.length?t.pop()+" ":""}return function(o,a){var u=[],s=[];return o=t(o),a=t(a),function(t,r,i,o,a,u){if(t!==i||r!==o){var s=a.push("translate(",null,n,null,e);u.push({i:s-4,x:Ln(t,i)},{i:s-2,x:Ln(r,o)});}else (i||o)&&a.push("translate("+i+n+o+e);}(o.translateX,o.translateY,a.translateX,a.translateY,u,s),function(t,n,e,o){t!==n?(t-n>180?n+=360:n-t>180&&(t+=360),o.push({i:e.push(i(e)+"rotate(",null,r)-2,x:Ln(t,n)})):n&&e.push(i(e)+"rotate("+n+r);}(o.rotate,a.rotate,u,s),function(t,n,e,o){t!==n?o.push({i:e.push(i(e)+"skewX(",null,r)-2,x:Ln(t,n)}):n&&e.push(i(e)+"skewX("+n+r);}(o.skewX,a.skewX,u,s),function(t,n,e,r,o,a){if(t!==e||n!==r){var u=o.push(i(o)+"scale(",null,",",null,")");a.push({i:u-4,x:Ln(t,e)},{i:u-2,x:Ln(n,r)});}else 1===e&&1===r||o.push(i(o)+"scale("+e+","+r+")");}(o.scaleX,o.scaleY,a.scaleX,a.scaleY,u,s),o=a=null,function(t){for(var n,e=-1,r=s.length;++e<r;)u[(n=s[e]).i]=n.x(t);return u.join("")}}}var Zn,Kn,Qn=Gn((function(t){return "none"===t?Bn:(Dn||(Dn=document.createElement("DIV"),$n=document.documentElement,Hn=document.defaultView),Dn.style.transform=t,t=Hn.getComputedStyle($n.appendChild(Dn),null).getPropertyValue("transform"),$n.removeChild(Dn),Un(+(t=t.slice(7,-1).split(","))[0],+t[1],+t[2],+t[3],+t[4],+t[5]))}),"px, ","px)","deg)"),Jn=Gn((function(t){return null==t?Bn:(Fn||(Fn=document.createElementNS("http://www.w3.org/2000/svg","g")),Fn.setAttribute("transform",t),(t=Fn.transform.baseVal.consolidate())?Un((t=t.matrix).a,t.b,t.c,t.d,t.e,t.f):Bn)}),", ",")",")"),Wn=0,te=0,ne=0,ee=0,re=0,ie=0,oe="object"==typeof performance&&performance.now?performance:Date,ae="object"==typeof window&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(t){setTimeout(t,17);};function ue(){return re||(ae(se),re=oe.now()+ie)}function se(){re=0;}function le(){this._call=this._time=this._next=null;}function ce(t,n,e){var r=new le;return r.restart(t,n,e),r}function he(){re=(ee=oe.now())+ie,Wn=te=0;try{!function(){ue(),++Wn;for(var t,n=Zn;n;)(t=re-n._time)>=0&&n._call.call(null,t),n=n._next;--Wn;}();}finally{Wn=0,function(){var t,n,e=Zn,r=1/0;for(;e;)e._call?(r>e._time&&(r=e._time),t=e,e=e._next):(n=e._next,e._next=null,e=t?t._next=n:Zn=n);Kn=t,pe(r);}(),re=0;}}function fe(){var t=oe.now(),n=t-ee;n>1e3&&(ie-=n,ee=t);}function pe(t){Wn||(te&&(te=clearTimeout(te)),t-re>24?(t<1/0&&(te=setTimeout(he,t-oe.now()-ie)),ne&&(ne=clearInterval(ne))):(ne||(ee=oe.now(),ne=setInterval(fe,1e3)),Wn=1,ae(he)));}function de(t,n,e){var r=new le;return n=null==n?0:+n,r.restart((function(e){r.stop(),t(e+n);}),n,e),r}le.prototype=ce.prototype={constructor:le,restart:function(t,n,e){if("function"!=typeof t)throw new TypeError("callback is not a function");e=(null==e?ue():+e)+(null==n?0:+n),this._next||Kn===this||(Kn?Kn._next=this:Zn=this,Kn=this),this._call=t,this._time=e,pe();},stop:function(){this._call&&(this._call=null,this._time=1/0,pe());}};var ge=w("start","end","cancel","interrupt"),ve=[];function me(t,n,e,r,i,o){var a=t.__transition;if(a){if(e in a)return}else t.__transition={};!function(t,n,e){var r,i=t.__transition;function o(t){e.state=1,e.timer.restart(a,e.delay,e.time),e.delay<=t&&a(t-e.delay);}function a(o){var l,c,h,f;if(1!==e.state)return s();for(l in i)if((f=i[l]).name===e.name){if(3===f.state)return de(a);4===f.state?(f.state=6,f.timer.stop(),f.on.call("interrupt",t,t.__data__,f.index,f.group),delete i[l]):+l<n&&(f.state=6,f.timer.stop(),f.on.call("cancel",t,t.__data__,f.index,f.group),delete i[l]);}if(de((function(){3===e.state&&(e.state=4,e.timer.restart(u,e.delay,e.time),u(o));})),e.state=2,e.on.call("start",t,t.__data__,e.index,e.group),2===e.state){for(e.state=3,r=new Array(h=e.tween.length),l=0,c=-1;l<h;++l)(f=e.tween[l].value.call(t,t.__data__,e.index,e.group))&&(r[++c]=f);r.length=c+1;}}function u(n){for(var i=n<e.duration?e.ease.call(null,n/e.duration):(e.timer.restart(s),e.state=5,1),o=-1,a=r.length;++o<a;)r[o].call(t,i);5===e.state&&(e.on.call("end",t,t.__data__,e.index,e.group),s());}function s(){for(var r in e.state=6,e.timer.stop(),delete i[n],i)return;delete t.__transition;}i[n]=e,e.timer=ce(o,0,e.time);}(t,e,{name:n,index:r,group:i,on:ge,tween:ve,time:o.time,delay:o.delay,duration:o.duration,ease:o.ease,timer:null,state:0});}function ye(t,n){var e=we(t,n);if(e.state>0)throw new Error("too late; already scheduled");return e}function _e(t,n){var e=we(t,n);if(e.state>3)throw new Error("too late; already running");return e}function we(t,n){var e=t.__transition;if(!e||!(e=e[n]))throw new Error("transition not found");return e}function xe(t,n){var e,r;return function(){var i=_e(this,t),o=i.tween;if(o!==e)for(var a=0,u=(r=e=o).length;a<u;++a)if(r[a].name===n){(r=r.slice()).splice(a,1);break}i.tween=r;}}function be(t,n,e){var r,i;if("function"!=typeof e)throw new Error;return function(){var o=_e(this,t),a=o.tween;if(a!==r){i=(r=a).slice();for(var u={name:n,value:e},s=0,l=i.length;s<l;++s)if(i[s].name===n){i[s]=u;break}s===l&&i.push(u);}o.tween=i;}}function Me(t,n,e){var r=t._id;return t.each((function(){var t=_e(this,r);(t.value||(t.value={}))[n]=e.apply(this,arguments);})),function(t){return we(t,r).value[n]}}function ke(t,n){var e;return ("number"==typeof n?Ln:n instanceof dn?Pn:(e=dn(n))?(n=e,Pn):Vn)(t,n)}function Ne(t){return function(){this.removeAttribute(t);}}function Ae(t){return function(){this.removeAttributeNS(t.space,t.local);}}function Ee(t,n,e){var r,i,o=e+"";return function(){var a=this.getAttribute(t);return a===o?null:a===r?i:i=n(r=a,e)}}function Se(t,n,e){var r,i,o=e+"";return function(){var a=this.getAttributeNS(t.space,t.local);return a===o?null:a===r?i:i=n(r=a,e)}}function Te(t,n,e){var r,i,o;return function(){var a,u,s=e(this);if(null!=s)return (a=this.getAttribute(t))===(u=s+"")?null:a===r&&u===i?o:(i=u,o=n(r=a,s));this.removeAttribute(t);}}function Pe(t,n,e){var r,i,o;return function(){var a,u,s=e(this);if(null!=s)return (a=this.getAttributeNS(t.space,t.local))===(u=s+"")?null:a===r&&u===i?o:(i=u,o=n(r=a,s));this.removeAttributeNS(t.space,t.local);}}function Ce(t,n){return function(e){this.setAttribute(t,n.call(this,e));}}function qe(t,n){return function(e){this.setAttributeNS(t.space,t.local,n.call(this,e));}}function ze(t,n){var e,r;function i(){var i=n.apply(this,arguments);return i!==r&&(e=(r=i)&&qe(t,i)),e}return i._value=n,i}function Le(t,n){var e,r;function i(){var i=n.apply(this,arguments);return i!==r&&(e=(r=i)&&Ce(t,i)),e}return i._value=n,i}function je(t,n){return function(){ye(this,t).delay=+n.apply(this,arguments);}}function Xe(t,n){return n=+n,function(){ye(this,t).delay=n;}}function Oe(t,n){return function(){_e(this,t).duration=+n.apply(this,arguments);}}function Ve(t,n){return n=+n,function(){_e(this,t).duration=n;}}function Re(t,n){if("function"!=typeof n)throw new Error;return function(){_e(this,t).ease=n;}}function Ie(t,n,e){var r,i,o=function(t){return (t+"").trim().split(/^|\s+/).every((function(t){var n=t.indexOf(".");return n>=0&&(t=t.slice(0,n)),!t||"start"===t}))}(n)?ye:_e;return function(){var a=o(this,t),u=a.on;u!==r&&(i=(r=u).copy()).on(n,e),a.on=i;}}var De=Lt.prototype.constructor;function $e(t){return function(){this.style.removeProperty(t);}}function He(t,n,e){return function(r){this.style.setProperty(t,n.call(this,r),e);}}function Fe(t,n,e){var r,i;function o(){var o=n.apply(this,arguments);return o!==i&&(r=(i=o)&&He(t,o,e)),r}return o._value=n,o}function Ye(t){return function(n){this.textContent=t.call(this,n);}}function Be(t){var n,e;function r(){var r=t.apply(this,arguments);return r!==e&&(n=(e=r)&&Ye(r)),n}return r._value=t,r}var Ue=0;function Ge(t,n,e,r){this._groups=t,this._parents=n,this._name=e,this._id=r;}function Ze(){return ++Ue}var Ke=Lt.prototype;Ge.prototype={constructor:Ge,select:function(t){var n=this._name,e=this._id;"function"!=typeof t&&(t=q(t));for(var r=this._groups,i=r.length,o=new Array(i),a=0;a<i;++a)for(var u,s,l=r[a],c=l.length,h=o[a]=new Array(c),f=0;f<c;++f)(u=l[f])&&(s=t.call(u,u.__data__,f,l))&&("__data__"in u&&(s.__data__=u.__data__),h[f]=s,me(h[f],n,e,f,h,we(u,e)));return new Ge(o,this._parents,n,e)},selectAll:function(t){var n=this._name,e=this._id;"function"!=typeof t&&(t=L$2(t));for(var r=this._groups,i=r.length,o=[],a=[],u=0;u<i;++u)for(var s,l=r[u],c=l.length,h=0;h<c;++h)if(s=l[h]){for(var f,p=t.call(s,s.__data__,h,l),d=we(s,e),g=0,v=p.length;g<v;++g)(f=p[g])&&me(f,n,e,g,p,d);o.push(p),a.push(s);}return new Ge(o,a,n,e)},filter:function(t){"function"!=typeof t&&(t=j(t));for(var n=this._groups,e=n.length,r=new Array(e),i=0;i<e;++i)for(var o,a=n[i],u=a.length,s=r[i]=[],l=0;l<u;++l)(o=a[l])&&t.call(o,o.__data__,l,a)&&s.push(o);return new Ge(r,this._parents,this._name,this._id)},merge:function(t){if(t._id!==this._id)throw new Error;for(var n=this._groups,e=t._groups,r=n.length,i=e.length,o=Math.min(r,i),a=new Array(r),u=0;u<o;++u)for(var s,l=n[u],c=e[u],h=l.length,f=a[u]=new Array(h),p=0;p<h;++p)(s=l[p]||c[p])&&(f[p]=s);for(;u<r;++u)a[u]=n[u];return new Ge(a,this._parents,this._name,this._id)},selection:function(){return new De(this._groups,this._parents)},transition:function(){for(var t=this._name,n=this._id,e=Ze(),r=this._groups,i=r.length,o=0;o<i;++o)for(var a,u=r[o],s=u.length,l=0;l<s;++l)if(a=u[l]){var c=we(a,n);me(a,t,e,l,u,{time:c.time+c.delay+c.duration,delay:0,duration:c.duration,ease:c.ease});}return new Ge(r,this._parents,t,e)},call:Ke.call,nodes:Ke.nodes,node:Ke.node,size:Ke.size,empty:Ke.empty,each:Ke.each,on:function(t,n){var e=this._id;return arguments.length<2?we(this.node(),e).on.on(t):this.each(Ie(e,t,n))},attr:function(t,n){var e=E(t),r="transform"===e?Jn:ke;return this.attrTween(t,"function"==typeof n?(e.local?Pe:Te)(e,r,Me(this,"attr."+t,n)):null==n?(e.local?Ae:Ne)(e):(e.local?Se:Ee)(e,r,n))},attrTween:function(t,n){var e="attr."+t;if(arguments.length<2)return (e=this.tween(e))&&e._value;if(null==n)return this.tween(e,null);if("function"!=typeof n)throw new Error;var r=E(t);return this.tween(e,(r.local?ze:Le)(r,n))},style:function(t,n,e){var r="transform"==(t+="")?Qn:ke;return null==n?this.styleTween(t,function(t,n){var e,r,i;return function(){var o=Q(this,t),a=(this.style.removeProperty(t),Q(this,t));return o===a?null:o===e&&a===r?i:i=n(e=o,r=a)}}(t,r)).on("end.style."+t,$e(t)):"function"==typeof n?this.styleTween(t,function(t,n,e){var r,i,o;return function(){var a=Q(this,t),u=e(this),s=u+"";return null==u&&(this.style.removeProperty(t),s=u=Q(this,t)),a===s?null:a===r&&s===i?o:(i=s,o=n(r=a,u))}}(t,r,Me(this,"style."+t,n))).each(function(t,n){var e,r,i,o,a="style."+n,u="end."+a;return function(){var s=_e(this,t),l=s.on,c=null==s.value[a]?o||(o=$e(n)):void 0;l===e&&i===c||(r=(e=l).copy()).on(u,i=c),s.on=r;}}(this._id,t)):this.styleTween(t,function(t,n,e){var r,i,o=e+"";return function(){var a=Q(this,t);return a===o?null:a===r?i:i=n(r=a,e)}}(t,r,n),e).on("end.style."+t,null)},styleTween:function(t,n,e){var r="style."+(t+="");if(arguments.length<2)return (r=this.tween(r))&&r._value;if(null==n)return this.tween(r,null);if("function"!=typeof n)throw new Error;return this.tween(r,Fe(t,n,null==e?"":e))},text:function(t){return this.tween("text","function"==typeof t?function(t){return function(){var n=t(this);this.textContent=null==n?"":n;}}(Me(this,"text",t)):function(t){return function(){this.textContent=t;}}(null==t?"":t+""))},textTween:function(t){var n="text";if(arguments.length<1)return (n=this.tween(n))&&n._value;if(null==t)return this.tween(n,null);if("function"!=typeof t)throw new Error;return this.tween(n,Be(t))},remove:function(){return this.on("end.remove",function(t){return function(){var n=this.parentNode;for(var e in this.__transition)if(+e!==t)return;n&&n.removeChild(this);}}(this._id))},tween:function(t,n){var e=this._id;if(t+="",arguments.length<2){for(var r,i=we(this.node(),e).tween,o=0,a=i.length;o<a;++o)if((r=i[o]).name===t)return r.value;return null}return this.each((null==n?xe:be)(e,t,n))},delay:function(t){var n=this._id;return arguments.length?this.each(("function"==typeof t?je:Xe)(n,t)):we(this.node(),n).delay},duration:function(t){var n=this._id;return arguments.length?this.each(("function"==typeof t?Oe:Ve)(n,t)):we(this.node(),n).duration},ease:function(t){var n=this._id;return arguments.length?this.each(Re(n,t)):we(this.node(),n).ease},end:function(){var t,n,e=this,r=e._id,i=e.size();return new Promise((function(o,a){var u={value:a},s={value:function(){0==--i&&o();}};e.each((function(){var e=_e(this,r),i=e.on;i!==t&&((n=(t=i).copy())._.cancel.push(u),n._.interrupt.push(u),n._.end.push(s)),e.on=n;}));}))}};var Qe={time:null,delay:0,duration:250,ease:function(t){return ((t*=2)<=1?t*t*t:(t-=2)*t*t+2)/2}};function Je(t,n){for(var e;!(e=t.__transition)||!(e=e[n]);)if(!(t=t.parentNode))return Qe.time=ue(),Qe;return e}Lt.prototype.interrupt=function(t){return this.each((function(){!function(t,n){var e,r,i,o=t.__transition,a=!0;if(o){for(i in n=null==n?null:n+"",o)(e=o[i]).name===n?(r=e.state>2&&e.state<5,e.state=6,e.timer.stop(),e.on.call(r?"interrupt":"cancel",t,t.__data__,e.index,e.group),delete o[i]):a=!1;a&&delete t.__transition;}}(this,t);}))},Lt.prototype.transition=function(t){var n,e;t instanceof Ge?(n=t._id,t=t._name):(n=Ze(),(e=Qe).time=ue(),t=null==t?null:t+"");for(var r=this._groups,i=r.length,o=0;o<i;++o)for(var a,u=r[o],s=u.length,l=0;l<s;++l)(a=u[l])&&me(a,t,n,l,u,e||Je(a,n));return new Ge(r,this._parents,t,n)};var We=Math.PI,tr=2*We,nr=1e-6,er=tr-nr;function rr(){this._x0=this._y0=this._x1=this._y1=null,this._="";}function ir(){return new rr}rr.prototype=ir.prototype={constructor:rr,moveTo:function(t,n){this._+="M"+(this._x0=this._x1=+t)+","+(this._y0=this._y1=+n);},closePath:function(){null!==this._x1&&(this._x1=this._x0,this._y1=this._y0,this._+="Z");},lineTo:function(t,n){this._+="L"+(this._x1=+t)+","+(this._y1=+n);},quadraticCurveTo:function(t,n,e,r){this._+="Q"+ +t+","+ +n+","+(this._x1=+e)+","+(this._y1=+r);},bezierCurveTo:function(t,n,e,r,i,o){this._+="C"+ +t+","+ +n+","+ +e+","+ +r+","+(this._x1=+i)+","+(this._y1=+o);},arcTo:function(t,n,e,r,i){t=+t,n=+n,e=+e,r=+r,i=+i;var o=this._x1,a=this._y1,u=e-t,s=r-n,l=o-t,c=a-n,h=l*l+c*c;if(i<0)throw new Error("negative radius: "+i);if(null===this._x1)this._+="M"+(this._x1=t)+","+(this._y1=n);else if(h>nr)if(Math.abs(c*u-s*l)>nr&&i){var f=e-o,p=r-a,d=u*u+s*s,g=f*f+p*p,v=Math.sqrt(d),m=Math.sqrt(h),y=i*Math.tan((We-Math.acos((d+h-g)/(2*v*m)))/2),_=y/m,w=y/v;Math.abs(_-1)>nr&&(this._+="L"+(t+_*l)+","+(n+_*c)),this._+="A"+i+","+i+",0,0,"+ +(c*f>l*p)+","+(this._x1=t+w*u)+","+(this._y1=n+w*s);}else this._+="L"+(this._x1=t)+","+(this._y1=n);else;},arc:function(t,n,e,r,i,o){t=+t,n=+n,o=!!o;var a=(e=+e)*Math.cos(r),u=e*Math.sin(r),s=t+a,l=n+u,c=1^o,h=o?r-i:i-r;if(e<0)throw new Error("negative radius: "+e);null===this._x1?this._+="M"+s+","+l:(Math.abs(this._x1-s)>nr||Math.abs(this._y1-l)>nr)&&(this._+="L"+s+","+l),e&&(h<0&&(h=h%tr+tr),h>er?this._+="A"+e+","+e+",0,1,"+c+","+(t-a)+","+(n-u)+"A"+e+","+e+",0,1,"+c+","+(this._x1=s)+","+(this._y1=l):h>nr&&(this._+="A"+e+","+e+",0,"+ +(h>=We)+","+c+","+(this._x1=t+e*Math.cos(i))+","+(this._y1=n+e*Math.sin(i))));},rect:function(t,n,e,r){this._+="M"+(this._x0=this._x1=+t)+","+(this._y0=this._y1=+n)+"h"+ +e+"v"+ +r+"h"+-e+"Z";},toString:function(){return this._}};var or="$";function ar(){}function ur(t,n){var e=new ar;if(t instanceof ar)t.each((function(t,n){e.set(n,t);}));else if(Array.isArray(t)){var r,i=-1,o=t.length;if(null==n)for(;++i<o;)e.set(i,t[i]);else for(;++i<o;)e.set(n(r=t[i],i,t),r);}else if(t)for(var a in t)e.set(a,t[a]);return e}function sr(){}ar.prototype=ur.prototype={constructor:ar,has:function(t){return or+t in this},get:function(t){return this[or+t]},set:function(t,n){return this[or+t]=n,this},remove:function(t){var n=or+t;return n in this&&delete this[n]},clear:function(){for(var t in this)t[0]===or&&delete this[t];},keys:function(){var t=[];for(var n in this)n[0]===or&&t.push(n.slice(1));return t},values:function(){var t=[];for(var n in this)n[0]===or&&t.push(this[n]);return t},entries:function(){var t=[];for(var n in this)n[0]===or&&t.push({key:n.slice(1),value:this[n]});return t},size:function(){var t=0;for(var n in this)n[0]===or&&++t;return t},empty:function(){for(var t in this)if(t[0]===or)return !1;return !0},each:function(t){for(var n in this)n[0]===or&&t(this[n],n.slice(1),this);}};var lr=ur.prototype;function cr(t,n){if((e=(t=n?t.toExponential(n-1):t.toExponential()).indexOf("e"))<0)return null;var e,r=t.slice(0,e);return [r.length>1?r[0]+r.slice(2):r,+t.slice(e+1)]}function hr(t){return (t=cr(Math.abs(t)))?t[1]:NaN}sr.prototype={constructor:sr,has:lr.has,add:function(t){return this[or+(t+="")]=t,this},remove:lr.remove,clear:lr.clear,values:lr.keys,size:lr.size,empty:lr.empty,each:lr.each};var fr,pr=/^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;function dr(t){if(!(n=pr.exec(t)))throw new Error("invalid format: "+t);var n;return new gr({fill:n[1],align:n[2],sign:n[3],symbol:n[4],zero:n[5],width:n[6],comma:n[7],precision:n[8]&&n[8].slice(1),trim:n[9],type:n[10]})}function gr(t){this.fill=void 0===t.fill?" ":t.fill+"",this.align=void 0===t.align?">":t.align+"",this.sign=void 0===t.sign?"-":t.sign+"",this.symbol=void 0===t.symbol?"":t.symbol+"",this.zero=!!t.zero,this.width=void 0===t.width?void 0:+t.width,this.comma=!!t.comma,this.precision=void 0===t.precision?void 0:+t.precision,this.trim=!!t.trim,this.type=void 0===t.type?"":t.type+"";}function vr(t,n){var e=cr(t,n);if(!e)return t+"";var r=e[0],i=e[1];return i<0?"0."+new Array(-i).join("0")+r:r.length>i+1?r.slice(0,i+1)+"."+r.slice(i+1):r+new Array(i-r.length+2).join("0")}dr.prototype=gr.prototype,gr.prototype.toString=function(){return this.fill+this.align+this.sign+this.symbol+(this.zero?"0":"")+(void 0===this.width?"":Math.max(1,0|this.width))+(this.comma?",":"")+(void 0===this.precision?"":"."+Math.max(0,0|this.precision))+(this.trim?"~":"")+this.type};var mr={"%":function(t,n){return (100*t).toFixed(n)},b:function(t){return Math.round(t).toString(2)},c:function(t){return t+""},d:function(t){return Math.abs(t=Math.round(t))>=1e21?t.toLocaleString("en").replace(/,/g,""):t.toString(10)},e:function(t,n){return t.toExponential(n)},f:function(t,n){return t.toFixed(n)},g:function(t,n){return t.toPrecision(n)},o:function(t){return Math.round(t).toString(8)},p:function(t,n){return vr(100*t,n)},r:vr,s:function(t,n){var e=cr(t,n);if(!e)return t+"";var r=e[0],i=e[1],o=i-(fr=3*Math.max(-8,Math.min(8,Math.floor(i/3))))+1,a=r.length;return o===a?r:o>a?r+new Array(o-a+1).join("0"):o>0?r.slice(0,o)+"."+r.slice(o):"0."+new Array(1-o).join("0")+cr(t,Math.max(0,n+o-1))[0]},X:function(t){return Math.round(t).toString(16).toUpperCase()},x:function(t){return Math.round(t).toString(16)}};function yr(t){return t}var _r,wr,xr=Array.prototype.map,br=["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];function Mr(t){var n,e,r=void 0===t.grouping||void 0===t.thousands?yr:(n=xr.call(t.grouping,Number),e=t.thousands+"",function(t,r){for(var i=t.length,o=[],a=0,u=n[0],s=0;i>0&&u>0&&(s+u+1>r&&(u=Math.max(1,r-s)),o.push(t.substring(i-=u,i+u)),!((s+=u+1)>r));)u=n[a=(a+1)%n.length];return o.reverse().join(e)}),i=void 0===t.currency?"":t.currency[0]+"",o=void 0===t.currency?"":t.currency[1]+"",a=void 0===t.decimal?".":t.decimal+"",u=void 0===t.numerals?yr:function(t){return function(n){return n.replace(/[0-9]/g,(function(n){return t[+n]}))}}(xr.call(t.numerals,String)),s=void 0===t.percent?"%":t.percent+"",l=void 0===t.minus?"-":t.minus+"",c=void 0===t.nan?"NaN":t.nan+"";function h(t){var n=(t=dr(t)).fill,e=t.align,h=t.sign,f=t.symbol,p=t.zero,d=t.width,g=t.comma,v=t.precision,m=t.trim,y=t.type;"n"===y?(g=!0,y="g"):mr[y]||(void 0===v&&(v=12),m=!0,y="g"),(p||"0"===n&&"="===e)&&(p=!0,n="0",e="=");var _="$"===f?i:"#"===f&&/[boxX]/.test(y)?"0"+y.toLowerCase():"",w="$"===f?o:/[%p]/.test(y)?s:"",x=mr[y],b=/[defgprs%]/.test(y);function M(t){var i,o,s,f=_,M=w;if("c"===y)M=x(t)+M,t="";else {var k=(t=+t)<0||1/t<0;if(t=isNaN(t)?c:x(Math.abs(t),v),m&&(t=function(t){t:for(var n,e=t.length,r=1,i=-1;r<e;++r)switch(t[r]){case".":i=n=r;break;case"0":0===i&&(i=r),n=r;break;default:if(!+t[r])break t;i>0&&(i=0);}return i>0?t.slice(0,i)+t.slice(n+1):t}(t)),k&&0==+t&&"+"!==h&&(k=!1),f=(k?"("===h?h:l:"-"===h||"("===h?"":h)+f,M=("s"===y?br[8+fr/3]:"")+M+(k&&"("===h?")":""),b)for(i=-1,o=t.length;++i<o;)if(48>(s=t.charCodeAt(i))||s>57){M=(46===s?a+t.slice(i+1):t.slice(i))+M,t=t.slice(0,i);break}}g&&!p&&(t=r(t,1/0));var N=f.length+t.length+M.length,A=N<d?new Array(d-N+1).join(n):"";switch(g&&p&&(t=r(A+t,A.length?d-M.length:1/0),A=""),e){case"<":t=f+t+M+A;break;case"=":t=f+A+t+M;break;case"^":t=A.slice(0,N=A.length>>1)+f+t+M+A.slice(N);break;default:t=A+f+t+M;}return u(t)}return v=void 0===v?6:/[gprs]/.test(y)?Math.max(1,Math.min(21,v)):Math.max(0,Math.min(20,v)),M.toString=function(){return t+""},M}return {format:h,formatPrefix:function(t,n){var e=h(((t=dr(t)).type="f",t)),r=3*Math.max(-8,Math.min(8,Math.floor(hr(n)/3))),i=Math.pow(10,-r),o=br[8+r/3];return function(t){return e(i*t)+o}}}}function kr(t,n){switch(arguments.length){case 0:break;case 1:this.range(t);break;default:this.range(n).domain(t);}return this}t.format=void 0,_r=Mr({decimal:".",thousands:",",grouping:[3],currency:["$",""],minus:"-"}),t.format=_r.format,wr=_r.formatPrefix;var Nr=Array.prototype,Ar=Nr.map,Er=Nr.slice;function Sr(t){return +t}var Tr=[0,1];function Pr(t){return t}function Cr(t,n){return (n-=t=+t)?function(e){return (e-t)/n}:function(t){return function(){return t}}(isNaN(n)?NaN:.5)}function qr(t){var n,e=t[0],r=t[t.length-1];return e>r&&(n=e,e=r,r=n),function(t){return Math.max(e,Math.min(r,t))}}function zr(t,n,e){var r=t[0],i=t[1],o=n[0],a=n[1];return i<r?(r=Cr(i,r),o=e(a,o)):(r=Cr(r,i),o=e(o,a)),function(t){return o(r(t))}}function Lr(t,n,e){var r=Math.min(t.length,n.length)-1,o=new Array(r),a=new Array(r),u=-1;for(t[r]<t[0]&&(t=t.slice().reverse(),n=n.slice().reverse());++u<r;)o[u]=Cr(t[u],t[u+1]),a[u]=e(n[u],n[u+1]);return function(n){var e=i(t,n,1,r)-1;return a[e](o[e](n))}}function jr(t,n){return n.domain(t.domain()).range(t.range()).interpolate(t.interpolate()).clamp(t.clamp()).unknown(t.unknown())}function Xr(){var t,n,e,r,i,o,a=Tr,u=Tr,s=Rn,l=Pr;function c(){return r=Math.min(a.length,u.length)>2?Lr:zr,i=o=null,h}function h(n){return isNaN(n=+n)?e:(i||(i=r(a.map(t),u,s)))(t(l(n)))}return h.invert=function(e){return l(n((o||(o=r(u,a.map(t),Ln)))(e)))},h.domain=function(t){return arguments.length?(a=Ar.call(t,Sr),l===Pr||(l=qr(a)),c()):a.slice()},h.range=function(t){return arguments.length?(u=Er.call(t),c()):u.slice()},h.rangeRound=function(t){return u=Er.call(t),s=In,c()},h.clamp=function(t){return arguments.length?(l=t?qr(a):Pr,h):l!==Pr},h.interpolate=function(t){return arguments.length?(s=t,c()):s},h.unknown=function(t){return arguments.length?(e=t,h):e},function(e,r){return t=e,n=r,c()}}function Or(t,n){return Xr()(t,n)}function Vr(n,e,r,i){var s,l=function(t,n,e){var r=Math.abs(n-t)/Math.max(0,e),i=Math.pow(10,Math.floor(Math.log(r)/Math.LN10)),s=r/i;return s>=o?i*=10:s>=a?i*=5:s>=u&&(i*=2),n<t?-i:i}(n,e,r);switch((i=dr(null==i?",f":i)).type){case"s":var c=Math.max(Math.abs(n),Math.abs(e));return null!=i.precision||isNaN(s=function(t,n){return Math.max(0,3*Math.max(-8,Math.min(8,Math.floor(hr(n)/3)))-hr(Math.abs(t)))}(l,c))||(i.precision=s),wr(i,c);case"":case"e":case"g":case"p":case"r":null!=i.precision||isNaN(s=function(t,n){return t=Math.abs(t),n=Math.abs(n)-t,Math.max(0,hr(n)-hr(t))+1}(l,Math.max(Math.abs(n),Math.abs(e))))||(i.precision=s-("e"===i.type));break;case"f":case"%":null!=i.precision||isNaN(s=function(t){return Math.max(0,-hr(Math.abs(t)))}(l))||(i.precision=s-2*("%"===i.type));}return t.format(i)}function Rr(t){var n=t.domain;return t.ticks=function(t){var e=n();return s(e[0],e[e.length-1],null==t?10:t)},t.tickFormat=function(t,e){var r=n();return Vr(r[0],r[r.length-1],null==t?10:t,e)},t.nice=function(e){null==e&&(e=10);var r,i=n(),o=0,a=i.length-1,u=i[o],s=i[a];return s<u&&(r=u,u=s,s=r,r=o,o=a,a=r),(r=l(u,s,e))>0?r=l(u=Math.floor(u/r)*r,s=Math.ceil(s/r)*r,e):r<0&&(r=l(u=Math.ceil(u*r)/r,s=Math.floor(s*r)/r,e)),r>0?(i[o]=Math.floor(u/r)*r,i[a]=Math.ceil(s/r)*r,n(i)):r<0&&(i[o]=Math.ceil(u*r)/r,i[a]=Math.floor(s*r)/r,n(i)),t},t}function Ir(t){return Math.log(t)}function Dr(t){return Math.exp(t)}function $r(t){return -Math.log(-t)}function Hr(t){return -Math.exp(-t)}function Fr(t){return isFinite(t)?+("1e"+t):t<0?0:t}function Yr(t){return function(n){return -t(-n)}}function Br(n){var e,r,i=n(Ir,Dr),o=i.domain,a=10;function u(){return e=function(t){return t===Math.E?Math.log:10===t&&Math.log10||2===t&&Math.log2||(t=Math.log(t),function(n){return Math.log(n)/t})}(a),r=function(t){return 10===t?Fr:t===Math.E?Math.exp:function(n){return Math.pow(t,n)}}(a),o()[0]<0?(e=Yr(e),r=Yr(r),n($r,Hr)):n(Ir,Dr),i}return i.base=function(t){return arguments.length?(a=+t,u()):a},i.domain=function(t){return arguments.length?(o(t),u()):o()},i.ticks=function(t){var n,i=o(),u=i[0],l=i[i.length-1];(n=l<u)&&(p=u,u=l,l=p);var c,h,f,p=e(u),d=e(l),g=null==t?10:+t,v=[];if(!(a%1)&&d-p<g){if(p=Math.round(p)-1,d=Math.round(d)+1,u>0){for(;p<d;++p)for(h=1,c=r(p);h<a;++h)if(!((f=c*h)<u)){if(f>l)break;v.push(f);}}else for(;p<d;++p)for(h=a-1,c=r(p);h>=1;--h)if(!((f=c*h)<u)){if(f>l)break;v.push(f);}}else v=s(p,d,Math.min(d-p,g)).map(r);return n?v.reverse():v},i.tickFormat=function(n,o){if(null==o&&(o=10===a?".0e":","),"function"!=typeof o&&(o=t.format(o)),n===1/0)return o;null==n&&(n=10);var u=Math.max(1,a*n/i.ticks().length);return function(t){var n=t/r(Math.round(e(t)));return n*a<a-.5&&(n*=a),n<=u?o(t):""}},i.nice=function(){return o(function(t,n){var e,r=0,i=(t=t.slice()).length-1,o=t[r],a=t[i];return a<o&&(e=r,r=i,i=e,e=o,o=a,a=e),t[r]=n.floor(o),t[i]=n.ceil(a),t}(o(),{floor:function(t){return r(Math.floor(e(t)))},ceil:function(t){return r(Math.ceil(e(t)))}}))},i}function Ur(t){return function(){return t}}function Gr(t){this._context=t;}function Zr(t){return new Gr(t)}function Kr(t){return t[0]}function Qr(t){return t[1]}Gr.prototype={areaStart:function(){this._line=0;},areaEnd:function(){this._line=NaN;},lineStart:function(){this._point=0;},lineEnd:function(){(this._line||0!==this._line&&1===this._point)&&this._context.closePath(),this._line=1-this._line;},point:function(t,n){switch(t=+t,n=+n,this._point){case 0:this._point=1,this._line?this._context.lineTo(t,n):this._context.moveTo(t,n);break;case 1:this._point=2;default:this._context.lineTo(t,n);}}},t.axisBottom=function(t){return y(3,t)},t.axisLeft=function(t){return y(4,t)},t.axisRight=function(t){return y(2,t)},t.bisector=e,t.curveLinear=Zr,t.drag=function(){var t,n,e,r,i=Yt,o=Bt,a=Ut,u=Gt,s={},l=w("start","drag","end"),c=0,h=0;function f(t){t.on("mousedown.drag",p).filter(u).on("touchstart.drag",v).on("touchmove.drag",m).on("touchend.drag touchcancel.drag",y).style("touch-action","none").style("-webkit-tap-highlight-color","rgba(0,0,0,0)");}function p(){if(!r&&i.apply(this,arguments)){var a=_("mouse",o.apply(this,arguments),Vt,this,arguments);a&&(jt(bt.view).on("mousemove.drag",d,!0).on("mouseup.drag",g,!0),$t(bt.view),It(),e=!1,t=bt.clientX,n=bt.clientY,a("start"));}}function d(){if(Dt(),!e){var r=bt.clientX-t,i=bt.clientY-n;e=r*r+i*i>h;}s.mouse("drag");}function g(){jt(bt.view).on("mousemove.drag mouseup.drag",null),function(t,n){var e=t.document.documentElement,r=jt(t).on("dragstart.drag",null);n&&(r.on("click.drag",Dt,!0),setTimeout((function(){r.on("click.drag",null);}),0)),"onselectstart"in e?r.on("selectstart.drag",null):(e.style.MozUserSelect=e.__noselect,delete e.__noselect);}(bt.view,e),Dt(),s.mouse("end");}function v(){if(i.apply(this,arguments)){var t,n,e=bt.changedTouches,r=o.apply(this,arguments),a=e.length;for(t=0;t<a;++t)(n=_(e[t].identifier,r,Rt,this,arguments))&&(It(),n("start"));}}function m(){var t,n,e=bt.changedTouches,r=e.length;for(t=0;t<r;++t)(n=s[e[t].identifier])&&(Dt(),n("drag"));}function y(){var t,n,e=bt.changedTouches,i=e.length;for(r&&clearTimeout(r),r=setTimeout((function(){r=null;}),500),t=0;t<i;++t)(n=s[e[t].identifier])&&(It(),n("end"));}function _(t,n,e,r,i){var o,u,h,p=e(n,t),d=l.copy();if(St(new Ft(f,"beforestart",o,t,c,p[0],p[1],0,0,d),(function(){return null!=(bt.subject=o=a.apply(r,i))&&(u=o.x-p[0]||0,h=o.y-p[1]||0,!0)})))return function a(l){var g,v=p;switch(l){case"start":s[t]=a,g=c++;break;case"end":delete s[t],--c;case"drag":p=e(n,t),g=c;}St(new Ft(f,l,o,t,g,p[0]+u,p[1]+h,p[0]-v[0],p[1]-v[1],d),d.apply,d,[l,r,i]);}}return f.filter=function(t){return arguments.length?(i="function"==typeof t?t:Ht(!!t),f):i},f.container=function(t){return arguments.length?(o="function"==typeof t?t:Ht(t),f):o},f.subject=function(t){return arguments.length?(a="function"==typeof t?t:Ht(t),f):a},f.touchable=function(t){return arguments.length?(u="function"==typeof t?t:Ht(!!t),f):u},f.on=function(){var t=l.on.apply(l,arguments);return t===l?f:t},f.clickDistance=function(t){return arguments.length?(h=(t=+t)*t,f):Math.sqrt(h)},f},t.line=function(){var t=Kr,n=Qr,e=Ur(!0),r=null,i=Zr,o=null;function a(a){var u,s,l,c=a.length,h=!1;for(null==r&&(o=i(l=ir())),u=0;u<=c;++u)!(u<c&&e(s=a[u],u,a))===h&&((h=!h)?o.lineStart():o.lineEnd()),h&&o.point(+t(s,u,a),+n(s,u,a));if(l)return o=null,l+""||null}return a.x=function(n){return arguments.length?(t="function"==typeof n?n:Ur(+n),a):t},a.y=function(t){return arguments.length?(n="function"==typeof t?t:Ur(+t),a):n},a.defined=function(t){return arguments.length?(e="function"==typeof t?t:Ur(!!t),a):e},a.curve=function(t){return arguments.length?(i=t,null!=r&&(o=i(r)),a):i},a.context=function(t){return arguments.length?(null==t?r=o=null:o=i(r=t),a):r},a},t.mouse=Vt,t.range=function(t,n,e){t=+t,n=+n,e=(i=arguments.length)<2?(n=t,t=0,1):i<3?1:+e;for(var r=-1,i=0|Math.max(0,Math.ceil((n-t)/e)),o=new Array(i);++r<i;)o[r]=t+r*e;return o},t.scaleLinear=function t(){var n=Or(Pr,Pr);return n.copy=function(){return jr(n,t())},kr.apply(n,arguments),Rr(n)},t.scaleLog=function t(){var n=Br(Xr()).domain([1,10]);return n.copy=function(){return jr(n,t()).base(n.base())},kr.apply(n,arguments),n},t.select=jt;
//Object.defineProperty(t,"__esModule",{value:!0})}));
////Original code from:

/**
 * SkewT v1.1.0
 * 2016 David Félix - dfelix@live.com.pt
 *
 * Dependency:
 * d3.v3.min.js from https://d3js.org/
 *
 */


window.SkewT=


function (div, { isTouchDevice, gradient = 45, topp = 50, maxtopp=50, parctempShift = 2,  height , margins = {}} = {}) {
            
    
    const _this = this;
    //properties used in calculations
    const outerWrapper = t.select(div);//.style("overflow","hidden");
    let width = parseInt(outerWrapper.style('width'), 10);
    const margin = { top: margins.top||10, right: margins.right||25, bottom: margins.bottom||10, left:margins.left || 25 }; //container margins
    const deg2rad = (Math.PI / 180);
    //var gradient = 46;
    
    let parctemp;  //parctemp is only used to receive values with setParams. 
    this.refs = {};
    let adjustGradient = false;
    let tan;
    let basep = 1050;
    //var topp = 50;
    let pIncrement = -50;
    let midtemp = 0, temprange = 60, init_temprange = 60;
    let xOffset = 0;
    let xAxisTicks=40;
    let steph; //= atm.getElevation(topp) / 30;
    let moving = false;
    const K0 = 273.15; //Kelvin of 0 deg
    let selectedSkewt;
    let currentY = null;//used to store y position of tooltip,  so filled at correct position of unit changed.

    const plines = [1000, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200, 150, 100, 50];

    const pticks = [];
    const tickInterval = 25;
    for (let i = plines[0] + tickInterval; i > plines[plines.length - 1]; i -= tickInterval) pticks.push(i);

    const altticks = [];
    for (let i = 0; i < 20000; i += (10000 / 3.28084)) altticks.push(atm.pressureFromElevation(i));
    //console.log(altticks);

    const barbsize = 15;   /////
    // functions for Scales and axes. Note the inverted domain for the y-scale: bigger is up!
    const r = t.scaleLinear().range([0, 300]).domain([0, 150]);
    t.scaleLinear();
    const bisectTemp = t.bisector(function (d) { return d.press; }).left; // bisector function for tooltips
    let w, h, x, y, xAxis, yAxis, yAxis2, yAxis3;
    let ymax;   //log scale for max top pressure  

    let dataReversed = [];
    let dataAr = [];
    //aux
    const unitSpd = "kt"; // or kmh
    let unitAlt = "m";
    let windDisplay = "Barbs";

    if (isTouchDevice === void 0) {
        if (L && L.version) {  //check if leaflet is loaded globally
            if (L.Browser.mobile) isTouchDevice = true;
        } else {
            isTouchDevice = ('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
        }
    }
    //console.log("this is a touch device:", isTouchDevice);



    //containers
    const wrapper = outerWrapper.append("div").style("position","relative");
    const cloudContainer = wrapper.append("div").attr("class", "cloud-container");
    const svg = wrapper.append("svg").attr("class", "mainsvg");	 //main svg
    const controls = wrapper.append("div").attr("class", "controls fnt controls1");
    const valuesContainer = wrapper.append("div").attr("class", "controls fnt controls2");
    const rangeContainer = wrapper.append("div").attr("class", "range-container fnt");
    const rangeContainer2 = wrapper.append("div").attr("class", "range-container-extra fnt");
    const container = svg.append("g");//.attr("id", "container"); //container
    const skewtbg = container.append("g").attr("class", "skewtbg");//.attr("id", "skewtbg");//background
    const skewtgroup = container.append("g").attr("class", "skewt"); // put skewt lines in this group  (class skewt not used)
    const barbgroup = container.append("g").attr("class", "windbarb"); // put barbs in this group
    const tooltipgroup = container.append("g").attr("class", "tooltips");      //class tooltps not used
    const tooltipRect = container.append("rect").attr("class", "overlay");//.attr("id",  "tooltipRect")
    const cloudCanvas1 = cloudContainer.append("canvas").attr("width", 1).attr("height", 200).attr("class", "cloud"); //original = width 10 and height 300
    this.cloudRef1 = cloudCanvas1.node();
    const cloudCanvas2 = cloudContainer.append("canvas").attr("width", 1).attr("height", 200).attr("class", "cloud");
    this.cloudRef2 = cloudCanvas2.node();


    function getFlags(f) {
        const flags = {
            "131072": "surface",
            "65536": "standard level",
            "32768": "tropopause level",
            "16384": "maximum wind level",
            "8192": "significant temperature level",
            "4096": "significant humidity level",
            "2048": "significant wind level",
            "1024": "beginning of missing temperature data",
            "512": "end of missing temperature data",
            "256": "beginning of missing humidity data",
            "128": "end of missing humidity data",
            "64": "beginning of missing wind data",
            "32": "end of missing wind data",
            "16": "top of wind sounding",
            "8": "level determined by regional decision",
            "4": "reserved",
            "2": "pressure level vertical coordinate"
        };

        const foundflags = [];
        const decode = (a, i) => {
            if (a % 2) foundflags.push(flags[1 << i]);
            if (a) decode(a >> 1, i + 1);
        };
        decode(f, 0);
        //console.log(foundflags);
        return foundflags;
    }



    //local functions
    function setVariables() {
        width = parseInt(wrapper.style('width'), 10);
        height = height ||  width; 
        //if (height>width) height = width;
        w = width - margin.left - margin.right;
        h = height - margin.top - margin.bottom;
        tan = Math.tan((gradient || 55) * deg2rad);
        //use the h for the x range,  so that appearance does not change when resizing,  remains square 
        
        ymax = t.scaleLog().range([0 ,h ]).domain([maxtopp, basep]);
        y = t.scaleLog().range([0 ,h ]).domain([topp, basep]);

        temprange = init_temprange * (h-ymax(topp))/ (h-ymax(maxtopp));
        x = t.scaleLinear().range([w/2 - h*2, w/2  + h*2]).domain([midtemp - temprange * 4, midtemp + temprange * 4]);   //range is w*2

        xAxisTicks = temprange < 40 ? 30: 40;
        xAxis = t.axisBottom(x).tickSize(0, 0).ticks(xAxisTicks);//.orient("bottom");
        yAxis = t.axisLeft(y).tickSize(0, 0).tickValues(plines.filter(p => (p % 100 == 0 || p == 50 || p == 150))).tickFormat(t.format(".0d"));//.orient("left");
        yAxis2 = t.axisRight(y).tickSize(5, 0).tickValues(pticks);//.orient("right");
        yAxis3 = t.axisLeft(y).tickSize(2, 0).tickValues(altticks);

        steph = atm.getElevation(topp) / (h/12);

    }

    function convSpd(msvalue, unit) {
        switch (unit) {
            case "kt":
                return msvalue * 1.943844492;
            case "kmh":
                return msvalue * 3.6;
            default:
                return msvalue;
        }
    }
    function convAlt(v, unit) {
        switch (unit) {
            case "m":
                return Math.round(v) + unit;
            case "f":
                return Math.round(v * 3.28084) + "ft";
            default:
                return v;
        }
    }

    //assigns d3 events
    t.select(window).on('resize', resize);

    function resize() {
        skewtbg.selectAll("*").remove();
        setVariables();
        svg.attr("width", w + margin.right + margin.left).attr("height", h + margin.top + margin.bottom);
        container.attr("transform", "translate(" + margin.left + "," + (margin.top) + ")");
        drawBackground();
        dataAr.forEach(d => {
            plot(d.data, { add: true, select: false });
        });//redraw each plot
        if (selectedSkewt) selectSkewt(selectedSkewt.data);
        shiftXAxis();
        tooltipRect.attr("width", w).attr("height", h);

        cloudContainer.style("left", (margin.left + 2) + "px").style("top", margin.top + "px").style("height", h + "px");
        const canTop = y(100);  //top of canvas for pressure 100
        cloudCanvas1.style("left", "0px").style("top", canTop + "px").style("height", (h - canTop) + "px");
        cloudCanvas2.style("left", "10px").style("top", canTop + "px").style("height", (h - canTop) + "px");
    }

    const lines = {};
    let clipper;
    let xAxisValues;
    //let tempLine,  tempdewLine;  now in object


    const drawBackground = function () {

        // Add clipping path
        clipper = skewtbg.append("clipPath")
            .attr("id", "clipper")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0 )
            .attr("width", w)
            .attr("height", h );

        // Skewed temperature lines
        lines.temp = skewtbg.selectAll("templine")
            .data(t.scaleLinear().domain([midtemp - temprange * 4, midtemp + temprange*4]).ticks(xAxisTicks))
            .enter().append("line")
            .attr("x1", d => x(d) - 0.5 + (y(basep) - y(topp)) / tan)
            .attr("x2", d => x(d) - 0.5)
            .attr("y1", 0)
            .attr("y2", h)
            .attr("class", d => d == 0 ? `tempzero ${buttons["Temp"].hi ? "highlight-line" : ""}` : `templine ${buttons["Temp"].hi ? "highlight-line" : ""}`)
            .attr("clip-path", "url(#clipper)");
        //.attr("transform", "translate(0," + h + ") skewX(-30)");


        /*
        let topTempOffset = x.invert(h/tan + w/2);
        let elevDiff = (atm.getElevation(topp) - atm.getElevation(basep));// * 3.28084;
        let km11y =  h*(11000 - atm.getElevation(basep)) / elevDiff;
        let tempOffset11 = x.invert(km11y/tan + w/2);

        console.log("top temp shift", tempOffset11, x.invert(km11y/tan)   )  ;//(elevDiff/304.8));  //deg per 1000ft
       */

        const pp = moving ?
            [basep, basep - (basep - topp) * 0.25, basep - (basep - topp) * 0.5, basep - (basep - topp) * 0.75, topp]
            : t.range(basep, topp - 50, pIncrement);


        const pAt11km = atm.pressureFromElevation(11000);
        //console.log(pAt11km);

        const elrFx = t.line()
            .curve(t.curveLinear)
            .x(function (d, i) {
                atm.getElevation2(d);
                const t = d > pAt11km ? 15 - atm.getElevation(d) * 0.00649 : -56.5;   //6.49 deg per 1000 m
                return x(t) + (y(basep) - y(d)) / tan;
            })
            .y(function (d, i) { return y(d) });

        lines.elr = skewtbg.selectAll("elr")
            .data([plines.filter(p => p > pAt11km).concat([pAt11km, 50])])
            .enter().append("path")
            .attr("d", elrFx)
            .attr("clip-path", "url(#clipper)")
            .attr("class", `elr ${showElr ? "highlight-line" : ""}`);

        // Logarithmic pressure lines
        lines.pressure = skewtbg.selectAll("pressureline")
            .data(plines)
            .enter().append("line")
            .attr("x1", - w)
            .attr("x2", 2 * w)
            .attr("y1", y)
            .attr("y2", y)
            .attr("clip-path", "url(#clipper)")
            .attr("class", `pressure ${buttons["Pressure"].hi ? "highlight-line" : ""}`);

        // create array to plot adiabats

        const dryad = t.scaleLinear().domain([midtemp - temprange * 2, midtemp + temprange * 6]).ticks(xAxisTicks);

        const all = [];

        for (let i = 0; i < dryad.length; i++) {
            const z = [];
            for (let j = 0; j < pp.length; j++) { z.push(dryad[i]); }
            all.push(z);
        }


        const drylineFx = t.line()
            .curve(t.curveLinear)
            .x(function (d, i) {
                return x(
                    atm.dryLapse(pp[i], K0 + d, basep) - K0
                ) + (y(basep) - y(pp[i])) / tan;
            })
            .y(function (d, i) { return y(pp[i]) });

        // Draw dry adiabats
        lines.dryadiabat = skewtbg.selectAll("dryadiabatline")
            .data(all)
            .enter().append("path")
            .attr("class", `dryadiabat  ${buttons["Dry Adiabat"].hi ? "highlight-line" : ""}`)
            .attr("clip-path", "url(#clipper)")
            .attr("d", drylineFx);

        // moist adiabat fx
        let temp;
        const moistlineFx = t.line()
            .curve(t.curveLinear)
            .x(function (d, i) {
                temp = i == 0 ? K0 + d : ((temp + atm.moistGradientT(pp[i], temp) * (moving ? (topp - basep) / 4 : pIncrement)));
                return x(temp - K0) + (y(basep) - y(pp[i])) / tan;
            })
            .y(function (d, i) { return y(pp[i]) });

        // Draw moist adiabats
        lines.moistadiabat = skewtbg.selectAll("moistadiabatline")
            .data(all)
            .enter().append("path")
            .attr("class", `moistadiabat ${buttons["Moist Adiabat"].hi ? "highlight-line" : ""}`)
            .attr("clip-path", "url(#clipper)")
            .attr("d", moistlineFx);

        // isohume fx
        let mixingRatio;
        const isohumeFx = t.line()
            .curve(t.curveLinear)
            .x(function (d, i) {
                //console.log(d);
                if (i == 0) mixingRatio = atm.mixingRatio(atm.saturationVaporPressure(d + K0), pp[i]);
                temp = atm.dewpoint(atm.vaporPressure(pp[i], mixingRatio));
                return x(temp - K0) + (y(basep) - y(pp[i])) / tan;
            })
            .y(function (d, i) { return y(pp[i]) });

        // Draw isohumes
        lines.isohume = skewtbg.selectAll("isohumeline")
            .data(all)
            .enter().append("path")
            .attr("class", `isohume ${buttons["Isohume"].hi ? "highlight-line" : ""}`)
            .attr("clip-path", "url(#clipper)")
            .attr("d", isohumeFx);

        // Line along right edge of plot
        skewtbg.append("line")
            .attr("x1", w - 0.5)
            .attr("x2", w - 0.5)
            .attr("y1", 0)
            .attr("y2", h)
            .attr("class", "gridline");

        // Add axes
        xAxisValues = skewtbg.append("g").attr("class", "x axis").attr("transform", "translate(0," +   (h - 0.5 ) + ")").call(xAxis).attr("clip-path", "url(#clipper)");
        skewtbg.append("g").attr("class", "y axis").attr("transform", "translate(-0.5,0)").call(yAxis);
        skewtbg.append("g").attr("class", "y axis ticks").attr("transform", "translate(-0.5,0)").call(yAxis2);
        skewtbg.append("g").attr("class", "y axis hght-ticks").attr("transform", "translate(-0.5,0)").call(yAxis3);
    };

    const makeBarbTemplates = function () {
        const speeds = t.range(5, 205, 5);
        const barbdef = container.append('defs');
        speeds.forEach(function (d) {
            const thisbarb = barbdef.append('g').attr('id', 'barb' + d);
            const flags = Math.floor(d / 50);
            const pennants = Math.floor((d - flags * 50) / 10);
            const halfpennants = Math.floor((d - flags * 50 - pennants * 10) / 5);
            let px = barbsize / 2;
            // Draw wind barb stems
            thisbarb.append("line").attr("x1", 0).attr("x2", 0).attr("y1", -barbsize / 2).attr("y2", barbsize / 2);
            // Draw wind barb flags and pennants for each stem
            for (var i = 0; i < flags; i++) {
                thisbarb.append("polyline")
                    .attr("points", "0," + px + " -6," + (px) + " 0," + (px - 2))
                    .attr("class", "flag");
                px -= 5;
            }
            // Draw pennants on each barb
            for (i = 0; i < pennants; i++) {
                thisbarb.append("line")
                    .attr("x1", 0)
                    .attr("x2", -6)
                    .attr("y1", px)
                    .attr("y2", px + 2);
                px -= 3;
            }
            // Draw half-pennants on each barb
            for (i = 0; i < halfpennants; i++) {
                thisbarb.append("line")
                    .attr("x1", 0)
                    .attr("x2", -3)
                    .attr("y1", px)
                    .attr("y2", px + 1);
                px -= 3;
            }
        });
    };


    const shiftXAxis = function () {
        clipper.attr("x", -xOffset);
        xAxisValues.attr("transform", `translate(${xOffset}, ${h  - 0.5} )`);
        for (const p in lines) {
            lines[p].attr("transform", `translate(${xOffset},0)`);
        }        dataAr.forEach(d => {
            for (const p in d.lines) {
                d.lines[p].attr("transform", `translate(${xOffset},0)`);
            }
        });
    };


    const drawToolTips = function () {

        // Draw tooltips
        const tmpcfocus = tooltipgroup.append("g").attr("class", "focus tmpc");
        tmpcfocus.append("circle").attr("r", 4);
        tmpcfocus.append("text").attr("x", 9).attr("dy", ".35em");

        const dwpcfocus = tooltipgroup.append("g").attr("class", "focus dwpc");
        dwpcfocus.append("circle").attr("r", 4);
        dwpcfocus.append("text").attr("x", -9).attr("text-anchor", "end").attr("dy", ".35em");

        const hghtfocus = tooltipgroup.append("g").attr("class", "focus");
        const hght1 = hghtfocus.append("text").attr("x", "0.8em").attr("text-anchor", "start").attr("dy", ".35em");
        const hght2 = hghtfocus.append("text").attr("x", "0.8em").attr("text-anchor", "start").attr("dy", "-0.65em").style("fill", "blue");

        const wspdfocus = tooltipgroup.append("g").attr("class", "focus windspeed");
        const wspd1 = wspdfocus.append("text").attr("x", "0.8em").attr("text-anchor", "start").attr("dy", ".35em");
        const wspd2 = wspdfocus.append("text").attr("x", "0.8em").attr("text-anchor", "start").attr("dy", "-0.65em").style("fill", "red");
        const wspd3 = wspdfocus.append("text").attr("class", "skewt-wind-arrow").html("&#8681;");
        const wspd4 = wspdfocus.append("text").attr("y", "1em").attr("text-anchor", "start").style("fill", "rgba(0,0,0,0.3)").style("font-size", "10px");
        //console.log(wspdfocus)

        let startX = null;

       
        function start(e) {
            showTooltips();
            move.call(tooltipRect.node());
            startX = t.mouse(this)[0] - xOffset;
        }

        function end(e) {
            startX = null;
        }

        const hideTooltips = () => {
            [tmpcfocus, dwpcfocus, hghtfocus, wspdfocus].forEach(e => e.style("display", "none"));
            currentY = null;
        };
        hideTooltips();

        const showTooltips = () => {
            [tmpcfocus, dwpcfocus, hghtfocus, wspdfocus].forEach(e => e.style("display", null));
        };

        const move2P = (y0) => {
            //console.log("mving to",  y0);
            if (y0 || y0===0) showTooltips();
            const i = bisectTemp(dataReversed, y0, 1, dataReversed.length - 1);
            const d0 = dataReversed[i - 1];
            const d1 = dataReversed[i];
            const d = y0 - d0.press > d1.press - y0 ? d1 : d0;
            currentY = y0;

            tmpcfocus.attr("transform", "translate(" + (xOffset + x(d.temp) + (y(basep) - y(d.press)) / tan) + "," + y(d.press) + ")");
            dwpcfocus.attr("transform", "translate(" + (xOffset + x(d.dwpt) + (y(basep) - y(d.press)) / tan) + "," + y(d.press) + ")");

            hghtfocus.attr("transform", "translate(0," + y(d.press) + ")");
            hght1.html("&nbsp;&nbsp;&nbsp;" + ((d.hght || d.hght===0) ?  convAlt(d.hght, unitAlt):"") ); 	//hgt or hghtagl ???
            hght2.html("&nbsp;&nbsp;&nbsp;" + Math.round(d.dwpt) + "&#176;C");

            wspdfocus.attr("transform", "translate(" + (w - (windDisplay=="Barbs" ? 70:80)) + "," + y(d.press) + ")");
            wspd1.html(isNaN(d.wspd) ? "" : (Math.round(convSpd(d.wspd, unitSpd) * 10) / 10  + unitSpd));
            wspd2.html(Math.round(d.temp) + "&#176;C");
            wspd3.style("transform", `rotate(${d.wdir}deg)`);
            wspd4.html(d.flags ? getFlags(d.flags).map(f => `<tspan x="-8em" dy="0.8em">${f}</tspan>`).join() : "");
            //console.log(     getFlags(d.flags).join("<br>"));

            if (pressCbfs) pressCbfs.forEach(cbf=>cbf(d.press));
        };

        function move(e) {
            const newX = t.mouse(this)[0];
            if (startX !== null) {
                xOffset = -(startX - newX);
                shiftXAxis();
            }
            const y0 = y.invert(t.mouse(this)[1]); // get y value of mouse pointer in pressure space
            move2P(y0);
        }

        tooltipRect
            .attr("width", w)
            .attr("height", h);

        //.on("mouseover", start)
        //.on("mouseout",  end)
        //.on("mousemove", move)
        if (!isTouchDevice) {

            tooltipRect.call(t.drag().on("start", start).on("drag", move).on("end", end));
        } else {
            tooltipRect
                //tooltipRect.node().addEventListener('touchstart',start, true)
                //tooltipRect.node().addEventListener('touchmove',move, true)
                //tooltipRect.node().addEventListener('touchend',end, true)
                .on('touchstart', start)
                .on('touchmove', move)
                .on('touchend', end);
        }

        Object.assign(this, { move2P, hideTooltips, showTooltips });
    };



    const drawParcelTraj = function (dataObj) {

        const { data, parctemp } = dataObj;

        if (data[0].dwpt == undefined) return;

        const pt = atm.parcelTrajectory(
            { level: data.map(e => e.press), gh: data.map(e => e.hght), temp: data.map(e => e.temp + K0) },
            moving ? 10 : xAxisTicks,
            parctemp + K0,
            data[0].press,
            data[0].dwpt + K0
        );

        //draw lines
        const parctrajFx = t.line()
            .curve(t.curveLinear)
            .x(function (d, i) { return x(d.t) + (y(basep) - y(d.p)) / tan; })
            .y(function (d, i) { return y(d.p); });

        //let parcLines={dry:[], moist:[], isohumeToDry:[], isohumeToTemp:[], moistFromCCL:[],  TCONline:[], thrm:[], cloud:[]};

        const parcLines = { parcel: [], LCL: [], CCL: [], TCON: [], "THRM top": [], "CLD top": [] };

        for (const prop in parcLines) {
            const p = prop;
            if (dataObj.lines[p]) dataObj.lines[p].remove();

            let line = [], press;
            switch (p) {
                case "parcel":
                    if (pt.dry) line.push(pt.dry);
                    if (pt.moist) line.push(pt.moist);
                    break;
                case "TCON":
                    const t = pt.TCON;
                    line = t !== void 0 ? [[[t, basep], [t, topp]]] : [];
                    break;
                case "LCL":
                    if (pt.isohumeToDry) line.push(pt.isohumeToDry);
                    break;
                case "CCL":
                    if (pt.isohumeToTemp) line.push(pt.isohumeToTemp);
                    if (pt.moistFromCCL) line.push(pt.moistFromCCL);
                    break;
                case "THRM top":
                    press = pt.pThermalTop;
                    if (press) line = [[[0, press], [400, press]]];
                    break;
                case "CLD top":
                    press = pt.pCloudTop;
                    if (press) line = [[[0, press], [400, press]]];
                    break;
            }

            if (line) parcLines[p] = line.map(e => e.map(ee => { return { t: ee[0] - K0, p: ee[1] } }));

            dataObj.lines[p] = skewtgroup
                .selectAll(p)
                .data(parcLines[p]).enter().append("path")
                .attr("class", `${p == "parcel" ? "parcel" : "cond-level"} ${selectedSkewt && data == selectedSkewt.data && (p == "parcel" || values[p].hi) ? "highlight-line" : ""}`)
                .attr("clip-path", "url(#clipper)")
                .attr("d", parctrajFx)
                .attr("transform", `translate(${xOffset},0)`);
        }

        //update values
        for (const p in values) {
            let v = pt[p == "CLD top" ? "cloudTop" : p == "THRM top" ? "elevThermalTop" : p];
            let CLDtopHi;
            if (p == "CLD top" && v == 100000) {
                v = data[data.length - 1].hght;
                CLDtopHi = true;
            }
            const txt = `${(p[0].toUpperCase() + p.slice(1)).replace(" ", "&nbsp;")}:<br><span style="font-size:1.1em;"> ${!v ? "" : p == "TCON" ? (v - K0).toFixed(1) + "&#176;C" : (CLDtopHi ? "> " : "") + convAlt(v, unitAlt)}</span>`;
            values[p].val.html(txt);
        }
    };

    const selectSkewt = function (data) {  //use the data,  then can be found from the outside by using data obj ref
        dataAr.forEach(d => {
            const found = d.data == data;
            for (const p in d.lines) {
                d.lines[p].classed("highlight-line", found && (!values[p] || values[p].hi));
            }
            if (found) {
                selectedSkewt = d;
                dataReversed = [].concat(d.data).reverse();
                ranges.parctemp.input.node().value = ranges.parctemp.value = d.parctemp = Math.round(d.parctemp * 10) / 10;
                ranges.parctemp.valueDiv.html(html4range(d.parctemp, "parctemp"));
            }
        });
        _this.hideTooltips();
    };



    //if in options:  add,  add new plot,
    //if select,  set selected ix and highlight. if select false,  must hightlight separtely.
    //ixShift used to shift to the right,  used when you want to keep position 0 open.
    //max is the max number of plots, by default at the moment 2,
    const plot = function (s, { add, select, ixShift = 0, max = 2 } = {}) {

        if (s.length == 0) return;

        let ix = 0;  //index of the plot, there may be more than one,  to shift barbs and make clouds on canvas

        if (!add) {
            dataAr.forEach(d => {  //clear all plots
                for (const p in d.lines) d.lines[p].remove();
            });
            dataAr = [];
            [1, 2].forEach(c => {
                const ctx = _this["cloudRef" + c].getContext("2d");
                ctx.clearRect(0, 0, 10, 200);
            });
        }

        let dataObj = dataAr.find(d => d.data == s);

        let data;

        if (!dataObj) {
            const parctemp = Math.round((s[0].temp + ranges.parctempShift.value) * 10) / 10;
            data = s;     //do not filter here, filter creates new obj, looses ref
            //however, object itself can be changed.
            for(let i = 0; i<data.length; i++){
                // if there is no dewpoint available,  but humidity is available,  then use august-magnus-roche equation.  
                if (  !(data[i].dwpt || data[i].dwpt===0 )  && (data[i].rh>=0 && data[i].rh<=100)){
                    let {rh, temp} = data[i];
                    data[i].dwpt = 243.04*(Math.log(rh/100)+((17.625*temp)/(243.04+temp)))/(17.625-Math.log(rh/100)-((17.625*temp)/(243.04+temp)));
                } 
            }
            ix = dataAr.push({ data, parctemp, lines: {} }) - 1;
            dataObj = dataAr[ix];
            if (ix >= max) {
                console.log("more than max plots added");
                ix--;
                setTimeout((ix) => {
                    if (dataAr.length > max) _this.removePlot(dataAr[ix].data);
                }, 1000, ix);
            }
        } else {
            ix = dataAr.indexOf(dataObj);
            data = dataObj.data;
            for (const p in dataObj.lines) dataObj.lines[p].remove();
        }

        //reset parctemp range if this is the selected range
        if (select) {
            ranges.parctemp.input.node().value = ranges.parctemp.value = dataObj.parctemp;
            ranges.parctemp.valueDiv.html(html4range(dataObj.parctemp, "parctemp"));
        }

        //skew-t stuff
        
        // Filter data,  depending on range moving,  or nullish values
        
        let data4moving; 
        if (data.length > 50 && moving) {
            let prev = -1;
            data4moving = data.filter((e, i, a) => {
                const n = Math.floor(i * 50 / (a.length - 1));
                if (n > prev) {
                    prev = n;
                    return true;
                }
            });
        } else {
            data4moving = data.map(e=>e);
        }
        let data4temp = [data4moving.filter(e=>( e.temp || e.temp===0 ) && e.temp>-999 )];
        let data4dwpt = [data4moving.filter(e=>( e.dwpt || e.dwpt===0 ) && e.dwpt>-999 )];

        
        


        const templineFx = t.line().curve(t.curveLinear).x(function (d, i) { return x(d.temp) + (y(basep) - y(d.press)) / tan; }).y(function (d, i) { return y(d.press); });
        dataObj.lines.tempLine = skewtgroup
            .selectAll("templines")
            .data(data4temp).enter().append("path")
            .attr("class", "temp")//(d,i)=> `temp ${i<10?"skline":"mean"}` )
            .attr("clip-path", "url(#clipper)")
            .attr("d", templineFx);

        const tempdewlineFx = t.line().curve(t.curveLinear).x(function (d, i) { return x(d.dwpt) + (y(basep) - y(d.press)) / tan; }).y(function (d, i) { return y(d.press); });
        dataObj.lines.tempdewLine = skewtgroup
            .selectAll("tempdewlines")
            .data(data4dwpt).enter().append("path")
            .attr("class", "dwpt")//(d,i)=>`dwpt ${i<10?"skline":"mean"}` )
            .attr("clip-path", "url(#clipper)")
            .attr("d", tempdewlineFx);

        drawParcelTraj(dataObj);
         
        
    
        const siglines = data
            .filter((d, i, a, f) => d.flags && (f = getFlags(d.flags), f.includes("tropopause level") || f.includes("surface")) ? d.press : false)
            .map((d, i, a, f) => (f = getFlags(d.flags), { press: d.press, classes: f.map(e => e.replace(/ /g, "-")).join(" ") }));

        dataObj.lines.siglines = skewtbg.selectAll("siglines")
            .data(siglines)
            .enter().append("line")
            .attr("x1", - w).attr("x2", 2 * w)
            .attr("y1", d => y(d.press)).attr("y2", d => y(d.press))
            .attr("clip-path", "url(#clipper)")
            .attr("class", d => `sigline ${d.classes}`);


        //barbs stuff

        let lastH = -300;
        //filter barbs to be valid and not too crowded
        const barbs = data4moving.filter(function (d) {
            if (d.hght > lastH + steph && (d.wspd || d.wspd === 0) && d.press >= topp && !(d.wspd === 0 && d.wdir === 0)) lastH = d.hght;
            return d.hght == lastH;
        });

        dataObj.lines.barbs = barbgroup.append("svg").attr("class", `barblines ${windDisplay=="Numerical"?"hidden":""}`);//.attr("transform","translate(30,80)");
        dataObj.lines.barbs.selectAll("barbs")
            .data(barbs).enter().append("use")
            .attr("href", function (d) { return "#barb" + Math.round(convSpd(d.wspd, "kt") / 5) * 5; }) // 0,5,10,15,... always in kt
            .attr("transform", function (d) { return "translate(" + (w + 15 * (ix + ixShift)) + "," + y(d.press) + ") rotate(" + (d.wdir + 180) + ")"; });


        dataObj.lines.windtext = barbgroup.append("svg").attr("class", `windtext ${windDisplay=="Barbs"?"hidden":""}`);//.attr("class", "barblines");    
        dataObj.lines.windtext.selectAll("windtext")
            .data(barbs).enter().append("g")
            .attr("transform",d=> `translate(${w + 28 * (ix + ixShift) - 20} , ${y(d.press)})`);
        dataObj.lines.windtext.selectAll("g").append("text")
            .html( "&#x2191;"  )
            .style("transform",d=> "rotate("  + (180 + d.wdir)+"deg)");
        dataObj.lines.windtext.selectAll("g").append("text")
            .html( d=>Math.round(convSpd(d.wspd,"kt")))
            .attr("x","0.5em");

        ////clouds
        const clouddata = clouds.computeClouds(data);
        clouddata.canvas = _this["cloudRef" + (ix + ixShift + 1)];
        clouds.cloudsToCanvas(clouddata);
        dataObj.cloudCanvas = clouddata.canvas;
        //////

        if (select || dataAr.length == 1) {
            selectSkewt(dataObj.data);
        }
        shiftXAxis();

        return dataAr.length;
    };


    //// controls at bottom

    var buttons = { "Dry Adiabat": {}, "Moist Adiabat": {}, "Isohume": {}, "Temp": {}, "Pressure": {} };
    for (const p in buttons) {
        const b = buttons[p];
        b.hi = false;
        b.el = controls.append("div").attr("class", "buttons").text(p).on("click", () => {
            b.hi = !b.hi;
            b.el.node().classList[b.hi ? "add" : "remove"]("clicked");
            const line = p.replace(" ", "").toLowerCase();
            lines[line]._groups[0].forEach(p => p.classList[b.hi ? "add" : "remove"]("highlight-line"));
        });
    }    this.refs.highlightButtons = controls.node();

    //values
    const values = {
        "surface": {},
        "LCL": { hi: true },
        "CCL": { hi: true },
        "TCON": { hi: false },
        "THRM top": { hi: false },
        "CLD top": { hi: false }
    };

    for (const prop in values) {
        const p = prop;
        const b = values[p];
        b.val = valuesContainer.append("div").attr("class", `buttons ${p == "surface" ? "noclick" : ""} ${b.hi ? "clicked" : ""}`).html(p + ":");
        if (/CCL|LCL|TCON|THRM top|CLD top/.test(p)) {
            b.val.on("click", () => {
                b.hi = !b.hi;
                b.val.node().classList[b.hi ? "add" : "remove"]("clicked");
                selectedSkewt.lines[p]._groups[0].forEach(p => p.classList[b.hi ? "add" : "remove"]("highlight-line"));
            });
        }
    }
    this.refs.valueButtons = valuesContainer.node();

    const ranges = {
        parctemp: { value: 10, step: 0.1, min: -50, max: 50 },
        topp: { min: 50, max: 900, step: 25, value: topp },
        parctempShift: { min: -5, step: 0.1, max: 10, value: parctempShift },
        gradient: { min: 0, max: 85, step: 1, value: gradient },
        //    midtemp:{value:0, step:2, min:-50, max:50},

    };

    const unit4range = p => p == "gradient" ? "&#176" : p == "topp" ? "hPa" : "&#176;C";

    const html4range = (v, p) => {
        let html = "";
        if (p == "parctempShift" && r.value >= 0) html += "+";
        html += (p == "gradient" || p == "topp" ? Math.round(v) : Math.round(v * 10) / 10) + unit4range(p);
        if (p == "parctemp") {
            const shift = selectedSkewt ? (Math.round((v - selectedSkewt.data[0].temp) * 10) / 10) : parctempShift;
            html += " <span style='font-size:0.8em'>&nbsp;" + (shift > 0 ? "+" : "") + shift + "</span>";
        }
        return html;
    };

    for (const prop in ranges) {
        const p = prop;
        const contnr = p == "parctemp" || p == "topp" ? rangeContainer : rangeContainer2;
        const r = ranges[p];
        r.row=contnr.append("div").attr("class","row");        this.refs[p]=r.row.node();
        r.valueDiv = r.row.append("div").attr("class", "skewt-range-des").html(p == "gradient" ? "Gradient:" : p == "topp" ? "Top P:" : p == "parctemp" ? "Parcel T:" : "Parcel T Shift:");
        r.valueDiv = r.row.append("div").attr("class", "skewt-range-val").html(html4range(r.value, p));
        r.input = r.row.append("input").attr("type", "range").attr("min", r.min).attr("max", r.max).attr("step", r.step).attr("value", p == "gradient" ? 90 - r.value : r.value).attr("class", "skewt-ranges")
            .on("input", (a, b, c) => {

                _this.hideTooltips();
                r.value = +c[0].value;

                if (p == "gradient") {
                    gradient = r.value = 90 - r.value;
                    showErlFor2Sec(0, 0, r.input);
                    //console.log("GRADIENT ST", gradient);
                }
                if (p == "topp") {
                    showErlFor2Sec(0, 0, r.input);
                    const h_oldtopp = y(basep) - y(topp);
                    topp = r.value;
                    const h_newtopp = y(basep) - y(topp);
                    pIncrement = topp > 500 ? -25 : -50;
                    if (adjustGradient) {
                        ranges.gradient.value = gradient =  Math.atan(Math.tan(gradient * deg2rad) * h_oldtopp / h_newtopp) / deg2rad;
                        ranges.gradient.input.node().value =  90 - gradient;  //will trigger input event anyway
                        ranges.gradient.valueDiv.html(html4range(gradient, "gradient"));  
                        init_temprange*=h_oldtopp/h_newtopp;
                        if (ranges.gradient.cbfs) ranges.gradient.cbfs.forEach(cbf => cbf(gradient));
                    }
                    steph = atm.getElevation(topp) / 30;
                }
                if (p == "parctempShift") {
                    parctempShift = r.value;
                }

                r.valueDiv.html(html4range(r.value, p));

                clearTimeout(moving);
                moving = setTimeout(() => {
                    moving = false;
                    if (p == "parctemp") {
                        if (selectedSkewt) drawParcelTraj(selectedSkewt);   //value already set
                    } else {
                        resize();
                    }
                }, 1000);

                if (p == "parctemp"){ 
                    if (selectedSkewt) {
                        selectedSkewt.parctemp = r.value;
                        drawParcelTraj(selectedSkewt);
                    }
                } else {
                    resize();
                }

                //this.cbfRange({ topp, gradient, parctempShift });
                if (r.cbfs) r.cbfs.forEach(cbf => cbf(p=="gradient"? gradient: r.value));
            });

        //contnr.append("div").attr("class", "flex-break");
    }


    let showElr;
    const showErlFor2Sec = (a, b, target) => {
        target = target[0] || target.node();
        lines.elr.classed("highlight-line", true);
        clearTimeout(showElr);
        showElr = null;
        showElr = setTimeout(() => {
            target.blur();
            lines.elr.classed("highlight-line", showElr = null);  //background may be drawn again
        }, 1000);
    };

    ranges.gradient.input.on("focus", showErlFor2Sec);
    ranges.topp.input.on("focus", showErlFor2Sec);

    const cbSpan = rangeContainer2.append("span").attr("class", "row checkbox-container");
    this.refs.maintainXCheckBox = cbSpan.node();
    cbSpan.append("input").attr("type", "checkbox").on("click", (a, b, e) => {
        adjustGradient = e[0].checked;
    });
    cbSpan.append("span").attr("class", "skewt-checkbox-text").html("Maintain temp range on X-axis when zooming");

    const selectUnits = rangeContainer2.append("div").attr("class", "row select-units");
    this.refs.selectUnits = selectUnits.node();
    selectUnits.append("div").style("width","10em").html("Select alt units: ");
    const units = { "meter": {}, "feet": {} };
    for (const prop in units) {
        const p = prop;
        units[p].hi = p[0] == unitAlt;
        units[p].el = selectUnits.append("div").attr("class", "buttons units" + (unitAlt == p[0] ? " clicked" : "")).text(p).on("click", () => {
            for (const p2 in units) {
                units[p2].hi = p == p2;
                units[p2].el.node().classList[units[p2].hi ? "add" : "remove"]("clicked");
            }
            unitAlt = p[0];
            if (currentY !== null) _this.move2P(currentY);
            drawParcelTraj(selectedSkewt);
        });
    }
    const selectWindDisp = rangeContainer2.append("div").attr("class", "row select-units");
    this.refs.selectWindDisp = selectWindDisp.node();
    selectWindDisp.append("div").style("width","10em").html("Select wind display: ");
    const windDisp = { "Barbs": {}, "Numerical": {} };
    for (const prop in windDisp) {
        const p = prop;
        windDisp[p].hi = p == windDisplay;
        windDisp[p].el = selectWindDisp.append("div").attr("class", "buttons units" + (windDisplay == p ? " clicked" : "")).text(p).on("click", () => {
            for (const p2 in windDisp) {
                windDisp[p2].hi = p == p2;
                windDisp[p2].el.node().classList[windDisp[p2].hi ? "add" : "remove"]("clicked");
            }
            windDisplay = p;
            //console.log(windDisplay);
            dataAr.forEach(d=>{
                d.lines.barbs.classed("hidden", windDisplay=="Numerical");
                d.lines.windtext.classed("hidden", windDisplay=="Barbs");
            });
        });
    }
    const removePlot =  (s) => { //remove single plot
        const dataObj = dataAr.find(d => d.data == s);
        //console.log(dataObj);
        if (!dataObj) return;
        let ix=dataAr.indexOf(dataObj);
        //clear cloud canvas.
        if (dataObj.cloudCanvas){
            const ctx = dataObj.cloudCanvas.getContext("2d");
            ctx.clearRect(0, 0, 10, 200);
        }

        for (const p in dataObj.lines) {
            dataObj.lines[p].remove();
        }
        dataAr.splice(ix, 1);
        if(dataAr.length==0) {
            _this.hideTooltips();
            console.log("All plots removed");
        }
    };

    const clear =  () => {   //remove all plots and data
        dataAr.forEach(d => {
            for (const p in d.lines) d.lines[p].remove();
            const ctx = d.cloudCanvas.getContext("2d");
            ctx.clearRect(0, 0, 10, 200);
        });
        _this.hideTooltips();
        // these maybe not required,  addressed by above.
        skewtgroup.selectAll("lines").remove();
        skewtgroup.selectAll("path").remove(); //clear previous paths from skew
        skewtgroup.selectAll("g").remove();
        barbgroup.selectAll("use").remove(); //clear previous paths  from barbs
        dataAr = [];
        //if(tooltipRect)tooltipRect.remove();    tooltip rect is permanent
    };

    const clearBg = () => {
        skewtbg.selectAll("*").remove();
    };

    const setParams = (p) => {
        ({ height=height, topp=topp, parctempShift=parctempShift,  parctemp=parctemp,  basep=basep, steph=steph, gradient=gradient } = p);
        if (p=="gradient") ranges.gradient.input.value = 90 - p;
        else if (ranges[p]) ranges[p].input.value = p;
        //resize();
    };

    const getParams = () =>{
        return  {height, topp, basep, steph, gradient, parctempShift, parctemp: selectSkewt.parctemp }
    };

    const shiftDegrees = function (d) {
        xOffset = x(0) - x(d) ;
        //console.log("xOffs", xOffset);
        shiftXAxis();
    };

    
    // Event cbfs.
    // possible events:  temp, press, parctemp,  topp,   parctempShift,   gradient;
    
    const pressCbfs=[];
    const tempCbfs=[];
    const on = (ev, cbf) =>{
        let evAr;
        if (ev=="press" || ev=="temp") {
            evAr=ev=="press"?pressCbfs:tempCbfs; 
        } else {
            for (let p in ranges) {
                if(ev.toLowerCase() == p.toLowerCase()){
                    if (!ranges[p].cbfs) ranges[p].cbfs = [];
                    evAr=ranges[p].cbfs;
                }
            }
        }
        if (evAr){
            if (!evAr.includes(cbf)) {
                evAr.push(cbf);
            } else {
                console.log("EVENT ALREADY REGISTERED");
            }
        } else {
            console.log("EVENT NOT RECOGNIZED");
        }
    };

    const off = (ev, cbf) => {
        let evAr;
        if (ev=="press" || ev=="temp") {
            evAr=ev=="press"?pressCbfs:tempCbfs; 
        } else {
            for (let p in ranges) {
                if(ranges[p].cbfs && ev.toLowerCase() == p.toLowerCase()){
                    evAr=ranges[p].cbfs;
                }
            }    
        }
        if (evAr) { 
            let ix = evAr.findIndex(c=>cbf==c);
            if (ix>=0) evAr.splice(ix,1);
        }
    };

    // Add functions as public methods

    this.drawBackground = drawBackground;
    this.resize = resize;
    this.plot = plot;
    this.clear = clear; //clear all the plots
    this.clearBg = clearBg;
    this.selectSkewt = selectSkewt;
    this.removePlot = removePlot; //remove a specific plot,  referenced by data object passed initially
  
    this.on = on;
    this.off = off;
    this.setParams = setParams;
    this.getParams = getParams;
    this.shiftDegrees = shiftDegrees;
    
    /**
    *  parcelTrajectory: 
    * @param params = {temp,  gh,  level},
    * @param {number} steps,
    * @param surfacetemp,  surf pressure and surf dewpoint
    */
    this.parcelTrajectory = atm.parcelTrajectory;

    this.pressure2y = y;
    this.temp2x = x;
    this.gradient = gradient;  //read only,  use setParams to set.

    //  this.move2P,   this.hideTooltips,  this.showTooltips,  has been declared

    //  this.cloudRef1 and this.cloudRef2  =  references to the canvas elements to add clouds with other program
    
    this.refs.tooltipRect = tooltipRect.node();

    /*  other refs:
        highlightButtons
        valueButtons
        parctemp
        topp
        gradient
        parctempShift
        maintainXCheckBox
        selectUnits
        selectWindDisp
        tooltipRect
    */

    //init
    setVariables();
    resize();
    drawToolTips.call(this);  //only once
    makeBarbTemplates();  //only once
};}());