import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { AppErrorBoundary } from "./AppErrorBoundary.jsx";

afterEach(() => {
  window.location.hash = "";
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function openUnknownRoute() {
  window.location.hash = "#/abc";
  render(<App />);
}

describe("App shell", () => {
  it("renders the landmarks, one h1 and the not-found screen for an unknown route", () => {
    openUnknownRoute();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Сторінку не знайдено");
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(document.title).toBe("Сторінку не знайдено — Крипто-Радар");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Відкрити топ-50" })).toHaveAttribute("href", "#/");
  });

  it("puts the skip link first and moves focus to main without changing the route", () => {
    openUnknownRoute();
    const skip = screen.getAllByRole("link")[0];

    expect(skip).toHaveTextContent("Перейти до вмісту");
    fireEvent.click(skip);
    expect(screen.getByRole("main")).toHaveFocus();
    expect(window.location.hash).toBe("#/abc");
  });

  it("shows the favorites count in the navigation tab", () => {
    window.localStorage.setItem("crypto-radar:favorites", JSON.stringify(["bitcoin", "ethereum"]));
    openUnknownRoute();
    const nav = screen.getByRole("navigation", { name: "Основна навігація" });

    // Видиме «· 2» приховано від зчитувача; ім'я — UX §5.2 `nav.favorites` «Обрані, {N} монет(и)».
    expect(screen.getByRole("link", { name: "Обрані, 2 монети" })).toHaveTextContent("Обрані · 2");
    expect(within(nav).getByRole("link", { name: "Обрані, 2 монети" })).toHaveAttribute(
      "href",
      "#/favorites",
    );
    expect(within(nav).getByRole("link", { name: "Монети" })).toHaveAttribute("href", "#/");
  });

  it("keeps the disclaimer, attribution and privacy note in the footer", () => {
    openUnknownRoute();
    const footer = screen.getByRole("contentinfo");

    expect(footer).toHaveTextContent("Інформація не є інвестиційною порадою.");
    expect(within(footer).getByRole("link", { name: "Powered by CoinGecko" })).toHaveAttribute(
      "href",
      "https://www.coingecko.com/en/api",
    );
    expect(within(footer).getByRole("link", { name: "CoinGecko" })).toHaveAttribute(
      "href",
      "https://www.coingecko.com/en/privacy",
    );
    expect(within(footer).queryByRole("link", { name: "GitHub" })).toBeNull();
  });
});

describe("AppErrorBoundary", () => {
  it("replaces a crashed screen with the S-5 fallback", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Broken() {
      throw new Error("render failed");
    }
    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );

    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByRole("heading", { level: 1, name: "Щось пішло не так" }),
    ).toHaveFocus();
    expect(alert).toHaveTextContent("Перезавантажте сторінку. Ваші обрані збережені.");
    expect(
      within(alert).getByRole("button", { name: "Перезавантажити сторінку" }),
    ).toBeInTheDocument();
  });
});
