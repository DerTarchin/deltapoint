import { decrypt } from './decrypt';
import { debounce } from './debounce';
import { 
  isEsc,
  isEnter,
  isBackspace,
  propagationPath,
  getClosestParent,
} from './events';
import {
  formatNumber,
  splitNumberSuffix,
  getFullNumber,
  getNumberProperties,
  makeDoubleDecimal,
  formatMoney,
  round,
} from './numformat';
import {
  getColorProperties,
  colorMap,
  getAlpha,
  glow
} from './colorformat';
import {
  getLatest,
  generateAggs
} from './data';

const pagePos = el => {
  const pos = {x: 0, y: 0};
  while (el) {
    pos.x += (el.offsetLeft - el.scrollLeft + el.clientLeft);
    pos.y += (el.offsetTop - el.scrollTop + el.clientTop);     
    el = el.offsetParent;
  }
  return pos;
}

// string formatting date range
const frmt = (start, end) => {
  const year = (new Date()).getFullYear();
  if(start && !end && start.year() === year) return start.format('MMM D');
  if(start && !end) return start.format('MMM D, YYYY');
  if(end && !start && end.year() === year) return end.format('MMM D');
  if(end && !start) return end.format('MMM D, YYYY');
  if(start.year() !== end.year() || end.year() !== year) return [
    start.format('MMM D, YYYY'),
    end.format('MMM D, YYYY')
  ];
  return [
    start.format('MMM D'),
    end.format('MMM D')
  ]
}

// seperated formatting date range
const sepFrmt = (start, end) => {
  const year = (new Date()).getFullYear();
  if(start && !end) return {
    y: start.year(),
    m: start.format('MMM'),
    M: start.format('MMMM'),
    d: start.format('D'),
    useYear: start.year() !== year
  };
  if(end && !start) return {
    y: end.year(),
    m: end.format('MMM'),
    M: end.format('MMMM'),
    d: end.format('D'),
    useYear: end.year() !== year
  };
  return [
    {
      y: start.year(),
      m: start.format('MMM'),
      M: start.format('MMMM'),
      d: start.format('D'),
      useYear: start.year() !== end.year()
    }, {
      y: end.year(),
      m: end.format('MMM'),
      M: end.format('MMMM'),
      d: end.format('D'),
      useYear: start.year() !== end.year() || end.year() !== year
    }
  ]
}

const p5map = (val, inMin, inMax, outMin, outMax) => outMin + (outMax - outMin) * ((val - inMin) / (inMax - inMin))

const constrain = (val, min, max) => val < min ? min : val > max ? max : val

const isNull = (val, ignoreQuotes) => !(val !== undefined && val !== null && (ignoreQuotes || val !== ''));

// calcs if component props changed, ignoring ref changes (1-level deep only)
const shouldUpdate = (component, nextProps, nextState) => {
  if(nextState !== component.state) return true;
  return Object.keys(nextProps).some(key => nextProps[key] !== component.props[key]);
}

const cap = str => !str ? str : str.charAt(0).toUpperCase() + str.slice(1);

export {
  cap,
  frmt, 
  isEsc,
  isNull,
  sepFrmt,
  pagePos,
  colorMap,
  debounce,
  getLatest,
  isBackspace,
  shouldUpdate,
  generateAggs,
  propagationPath,
  splitNumberSuffix,
  getColorProperties,
  getNumberProperties,
  makeDoubleDecimal,
  getClosestParent,
  getFullNumber,
  formatNumber,
  formatMoney,
  constrain,
  getAlpha,
  decrypt,
  isEnter,
  round,
  p5map,
  glow,
}