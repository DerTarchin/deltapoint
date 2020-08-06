/*
 * Polyfill for IE/Edge lack of '.path' property
 * https://github.com/DieterHolvoet/event-propagation-path/blob/master/propagationPath.js
 */
export const propagationPath = e => {
  const polyfill = () => {
    let element = e.target || null;
    const pathArr = [element];
    if (!element || !element.parentElement) return [];
    while (element.parentElement) {
      element = element.parentElement;
      pathArr.unshift(element);
    }
    return pathArr;
  }
  return e.path || (e.composedPath && e.composedPath()) || polyfill();
};

export const getClosestParent = (elem, selector) => {
  // Element.matches() polyfill
  if (!Element.prototype.matches) {
      Element.prototype.matches =
          Element.prototype.matchesSelector ||
          Element.prototype.mozMatchesSelector ||
          Element.prototype.msMatchesSelector ||
          Element.prototype.oMatchesSelector ||
          Element.prototype.webkitMatchesSelector ||
          function(s) {
              var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                  i = matches.length;
              while (--i >= 0 && matches.item(i) !== this) {}
              return i > -1;
          };
  }
  // Get the closest matching element
  for ( ; elem && elem !== document; elem = elem.parentNode ) {
    if ( elem.matches( selector ) ) return elem;
  }
  return null;
};

export const isEnter = e => (e.key || e.keyCode || e.code) === 'Enter' || e.which === 13;
export const isEsc = e => (e.key || e.keyCode || e.code) === 'Escape' || e.which === 27;
export const isBackspace = e => (e.key || e.keyCode || e.code) === 'Backspace' || e.which === 8;