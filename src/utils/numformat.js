const ranges = [
  { divider: 1e18, suffix: 'P' },
  { divider: 1e15, suffix: 'E' },
  { divider: 1e12, suffix: 'T' },
  { divider: 1e9 , suffix: 'B' },
  { divider: 1e6 , suffix: 'M' },
  { divider: 1e3 , suffix: 'K' }
];

const getNumberProperties = num => {
  const invalid = {}
  if(typeof num === 'string') num = num.trim();
  // check if empty string or undefined
  if(num !== 0 && !num) return invalid;
  // check if it's just a non-digit char
  if((num+'').length === 1 && isNaN(num)) return invalid;
  let _num = (num + '').replace(/,/g,''),
      suffix = _num[_num.length-1].toUpperCase();
  // split character at end
  if(suffix.match(/^[A-Z]+$/)) _num = _num.substring(0, _num.length-1);
  else suffix = null;
  // check if not a number
  if(isNaN(+_num)) return invalid;
  // check incorrect suffix
  if(suffix && !ranges.map(r => r.suffix).includes(suffix)) return invalid;
  // return values - it's a number!
  const multiplier = suffix ? ranges.find(r => r.suffix === suffix).divider : 1;
  // create comma val
  const comma = ((+_num * multiplier) + '').split('.');
  comma[0] = comma[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return {
    valid: true,
    string: num,
    number: +_num,
    value: +_num * multiplier,
    comma: comma.join('.'),
    suffix,
    multiplier,
  }
}

const formatNumber = (num, decimals) => {
  const _num = getNumberProperties(num);
  if(!_num) return '';
  for (var i = 0; i < ranges.length; i++) {
    if (_num.value >= ranges[i].divider) {
      const condensed = parseFloat((_num.value / ranges[i].divider).toFixed(decimals)) + '' + ranges[i].suffix;
      if(condensed.length > 4 + decimals) return formatNumber(_num.value, decimals - 1);
      return condensed;
    }
  }
  return _num.value+'';
}

const splitNumberSuffix = num => {
  const _num = getNumberProperties(num);
  if(!_num) return ['', ''];
  return [_num.number, _num.suffix]
}

const getFullNumber = num => {
  const _num = getNumberProperties(num);
  if(!_num) return;
  return _num.value;
}

const round = (num, scale=0) => {
  if(!("" + num).includes("e")) {
    return +(Math.round(num + "e+" + scale)  + "e-" + scale);
  } else {
    var arr = ("" + num).split("e");
    var sig = ""
    if(+arr[1] + scale > 0) {
      sig = "+";
    }
    return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
  }
}

const makeDoubleDecimal = props => {
  if(!props.valid) return props;
  if(!props.comma.includes('.')) props.comma += '.00';
  if(props.comma.split('.')[1].length < 2) props.comma += '0';
  return props;
}

const formatMoney = (val, dontRound) => makeDoubleDecimal(getNumberProperties(dontRound ? val : round(val, 2))).comma

export {
  formatNumber,
  splitNumberSuffix,
  getFullNumber,
  getNumberProperties,
  makeDoubleDecimal,
  formatMoney,
  round,
}