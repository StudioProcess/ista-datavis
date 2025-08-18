precision highp float;

uniform sampler2D uNoiseTexture;
uniform float uDitherBias;
uniform float uDitherStrength;
uniform float uDitherSteps;

varying vec2 vTexCoord;
varying vec4 vVertexColor;


vec4 blueNoiseDither(vec4 color) {
    vec2 uv = mod(gl_FragCoord.xy, 1024.0) / 1024.0;
    
    float threshold = texture2D(uNoiseTexture, uv).r;
    // vec3 threshold = texture2D(uNoiseTexture, uv).rgb;
    
    vec4 dithered = color;
    dithered.rgb += threshold + uDitherBias;
    dithered.rgb = floor(dithered.rgb * (uDitherSteps - 1.0) + 0.5) / (uDitherSteps - 1.0);
    
    return mix(color, dithered, uDitherStrength);
}

void main() {
    // vec4 myColor = vec4(1.0, 0.0, 0.0, 1.0);
    // gl_FragColor = myColor;
    vec4 color = blueNoiseDither(vVertexColor);

    gl_FragColor = color;
}