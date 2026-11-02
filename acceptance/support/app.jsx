import { fireEvent, render, screen, within } from "@testing-library/react";
import App from "../../src/app/App.jsx";
import { freezeClock, installFakeCoinGecko } from "./fake-coingecko.js";

export const FAVORITES_KEY = "crypto-radar:favorites";
export const DISCLAIMER = "Інформація не є інвестиційною порадою";
export const LONG_WAIT = { timeout: 10000 };

/** Нерозривні й вузькі пробіли (U+00A0, U+202F) → звичайний пробіл. */
export const norm = (text) => (text ?? "").replace(/[  ]/g, " ").replace(/\s+/g, " ");

/** Відкриває Крипто-Радар за маршрутом з фальшивим джерелом і замороженим годинником. */
export function openApp(hash = "#/", { favorites, ...sourceOptions } = {}) {
  freezeClock();
  if (favorites) {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
  const source = installFakeCoinGecko(sourceOptions);
  window.location.hash = hash;
  const view = render(<App />);
  return { source, view };
}

export const main = () => screen.getByRole("main");

/** Посилання на сторінки монет у вмісті екрана, у порядку DOM. */
export function coinLinks() {
  return within(main())
    .queryAllByRole("link")
    .filter((link) => /#\/coin\//.test(link.getAttribute("href") ?? ""));
}

export const coinNames = () => coinLinks().map((link) => norm(link.textContent).trim());

/** Чекає стан Data списку: посилання на Bitcoin (місце 1, найдорожча монета). */
export const waitForList = () => screen.findByRole("link", { name: "Bitcoin" }, LONG_WAIT);

/** Чекає блок помилки даних (role="alert"). */
export const waitForError = () => screen.findByRole("alert", {}, LONG_WAIT);

/** Картка (li) або рядок (tr) монети за назвою. */
export function coinItem(name) {
  const link = within(main()).getByRole("link", { name });
  return link.closest("li, tr");
}

/** Елемент, увесь текст якого — місце в рейтингу (необов'язково з «#» або «№»). */
export function rankElement(container, rank) {
  return within(container).getByText((_, element) => {
    const own = Array.from(element.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join("");
    return (
      new RegExp(`^\\s*(#|№\\s?)?${rank}\\s*$`).test(norm(own)) && element.children.length === 0
    );
  });
}

export function chooseSort(label) {
  const select = screen.getByLabelText("Сортування");
  const option = within(select).getByRole("option", { name: label });
  fireEvent.change(select, { target: { value: option.value } });
  return select;
}

export function search(query) {
  const input = screen.getByLabelText("Пошук монети");
  fireEvent.change(input, { target: { value: query } });
  return input;
}

export function storedFavorites() {
  return JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]");
}

export async function openFavoritesTab() {
  fireEvent.click(screen.getByRole("link", { name: /^Обрані/ }));
  return screen.findByRole("heading", { level: 1, name: "Обрані" }, LONG_WAIT);
}

export const hintButton = (term) =>
  screen.getAllByRole("button", { name: `Що означає «${term}»?` })[0];
