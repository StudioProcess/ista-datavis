precision highp float;

uniform sampler2D uNoiseTexture;
uniform float uDitherBias;
uniform float uDitherStrength;
uniform float uDitherSteps;
uniform vec4 uRandomness;
uniform float uTime;
uniform float uFrame;

varying vec2 vTexCoord;
varying vec4 vVertexColor;

const float ditherFPS = 6.0;


vec4 blueNoiseDither(vec4 color) {
    vec2 uv = mod(gl_FragCoord.xy, 1024.0) / 1024.0;
    
    float blue_noise = texture2D(uNoiseTexture, uv).a;
    
    // Animated dithering
    // float blue_noise;
    // float idx = mod(uTime * ditherFPS, 3.0);
    // if (idx < 1.0) {
    //     blue_noise = texture2D(uNoiseTexture, uv).r;
    // } else if (idx < 2.0) {
    //     blue_noise = texture2D(uNoiseTexture, uv).g;
    // } else if (idx < 3.0) {
    //     blue_noise = texture2D(uNoiseTexture, uv).b;
    // }
    
    // Go from a uniform distribution on [0,1] to a
    // symmetric triangular distribution on [-1,1]
    // with maximal density at 0
    // blue_noise = blue_noise * 2.0 - 1.0;
    // blue_noise = sign( blue_noise ) * ( 1.0 - sqrt(1.0-abs(blue_noise)) );
    // blue_noise += 0.6;
    
    vec4 dithered = color;
    dithered.rgb += blue_noise + uDitherBias;
    dithered.rgb = floor(dithered.rgb * (uDitherSteps - 1.0) + 0.5) / (uDitherSteps - 1.0);
    
    return mix(color, dithered, uDitherStrength);
}

void main() {
    gl_FragColor = blueNoiseDither(vVertexColor);
}