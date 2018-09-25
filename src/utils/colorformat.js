const getColorProperties = hex => {
  const toRGB = hex => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  let { r, g, b } = toRGB(hex);
  r /= 255, g /= 255, b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if(max == min) h = s = 0; // achromatic
  else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch(max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  s = Math.round(s*100);
  l = Math.round(l*100);
  h = Math.round(360*h);

  return {
    hex: `#${hex.replace('#','')}`,
    ...toRGB(hex),
    h, s, l,
    a: 1,
    rgbStr: (r,g,b,a) => `rgb${!a && a !== 0 ? '' : 'a'}(${r},${g},${b}${!a && a !== 0 ? '' : `,${a}`})`,
    hslStr: (h,s,l,a) => `hsl${!a && a !== 0 ? '' : 'a'}(${h},${s}%,${l}%${!a && a !== 0 ? '' : `,${a}`})`,
  }
}

const getAlpha = val => parseFloat(val.split(',')[val.split(',').length-1].replace(')',''))

export {
  getAlpha,
  getColorProperties
}