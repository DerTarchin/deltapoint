// DEBOUNCE
const keys = {}
export const debounce = (callback, wait, id) => {
  const key = id || callback;
  keys[key] = {
    callback,
    time: performance.now()
  };

  const valid_timeout = keys[key].time;
  setTimeout(() => {
    if(keys[key] && valid_timeout === keys[key].time) {
      const call = keys[key].callback;
      delete keys[key];
      call();
    }
  }, wait);
}