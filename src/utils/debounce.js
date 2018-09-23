// my personal debounce
let id;
export const debounce = (callback, wait) => {
  id = performance.now();
  const id_check = id;
  setTimeout(() => {
    if(id_check === id) callback();
  }, wait);
}