// Тема до першого малювання (UX UF-7.3, план етапу 6, розділ 4): збережений вибір, інакше тема пристрою.
// Класичний синхронний скрипт у <head>, щоб сторінка не блимала світлою темою (CLS, NFR-4).
(function () {
  var theme = null;
  try {
    theme = window.localStorage.getItem("crypto-radar:theme");
  } catch {
    theme = null;
  }
  if (theme !== "light" && theme !== "dark") {
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = dark ? "dark" : "light";
  }
  document.documentElement.dataset.theme = theme;
})();
