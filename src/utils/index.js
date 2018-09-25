import { decrypt } from './decrypt';
import { debounce } from './debounce';
import {
  formatNumber,
  splitNumberSuffix,
  getFullNumber,
  getNumberProperties,
  round,
} from './numformat';
import {
  getColorProperties,
  getAlpha
} from './colorformat';

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
    d: start.format('DD'),
    useYear: start.year() !== year
  };
  if(end && !start) return {
    y: end.year(),
    m: end.format('MMM'),
    M: end.format('MMMM'),
    d: end.format('DD'),
    useYear: end.year() !== year
  };
  return [
    {
      y: start.year(),
      m: start.format('MMM'),
      M: start.format('MMMM'),
      d: start.date(),
      useYear: start.year() !== end.year() || end.year() !== year
    }, {
      y: end.year(),
      m: end.format('MMM'),
      M: end.format('MMMM'),
      d: end.date(),
      useYear: start.year() !== end.year() || end.year() !== year
    }
  ]
}

const p5map = (val, inMin, inMax, outMin, outMax) => outMin + (outMax - outMin) * ((val - inMin) / (inMax - inMin))

export {
  decrypt,
  pagePos,
  frmt, 
  sepFrmt,
  debounce,
  formatNumber,
  splitNumberSuffix,
  getFullNumber,
  getNumberProperties,
  round,
  getAlpha,
  getColorProperties,
  p5map,
}