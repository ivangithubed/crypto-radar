import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Button,
  ErrorBlock,
  Skeleton,
  StatusMessage,
  TermHintButton,
  useDocumentTitle,
  useMediaQuery,
} from "./index.js";
import { computeHintOffset } from "./hintOffset.js";

describe("Button", () => {
  it("викликає onClick і має type=button", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ок</Button>);
    const btn = screen.getByRole("button", { name: "Ок" });
    expect(btn).toHaveAttribute("type", "button");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it("aria-disabled не викликає onClick і лишає фокус", () => {
    const onClick = vi.fn();
    render(
      <Button aria-disabled="true" onClick={onClick}>
        Ок
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Ок" });
    btn.focus();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    expect(btn).toHaveFocus();
  });
});

describe("StatusMessage і Skeleton", () => {
  it("status присутній з порожнім вмістом", () => {
    render(<StatusMessage />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
  it("Skeleton прихований від зчитувача", () => {
    const { container } = render(<Skeleton className="h-4" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("ErrorBlock", () => {
  const base = { onRetry: () => {}, retrying: false, retryFailed: false };
  it.each([
    ["src", "Не вдалося отримати ціни", "CoinGecko зараз не відповідає"],
    ["net", "Немає з'єднання", "Перевірте інтернет і спробуйте ще раз."],
    ["stale", "Ціни застаріли", "Ціни старші за 5 хвилин"],
  ])("kind %s", (kind, title, text) => {
    render(<ErrorBlock {...base} kind={kind} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(title);
    expect(alert).toHaveTextContent(text);
    expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Спробувати ще раз" })).toBeInTheDocument();
  });
  it("повтор викликає onRetry", () => {
    const onRetry = vi.fn();
    render(<ErrorBlock {...base} kind="src" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще раз" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  it("під час повтору: Завантажуємо…, aria-disabled, без виклику", () => {
    const onRetry = vi.fn();
    render(<ErrorBlock {...base} kind="src" retrying onRetry={onRetry} />);
    const btn = screen.getByRole("button", { name: "Завантажуємо…" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(btn);
    expect(onRetry).not.toHaveBeenCalled();
  });
  it("retryFailed: текст у status і фокус на кнопці", () => {
    const { rerender } = render(<ErrorBlock {...base} kind="net" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    rerender(<ErrorBlock {...base} kind="net" retryFailed />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Досі немає з'єднання. Перевірте інтернет і спробуйте ще раз.",
    );
    expect(screen.getByRole("button", { name: "Спробувати ще раз" })).toHaveFocus();
  });
  it("retryFailed для src", () => {
    render(<ErrorBlock {...base} kind="src" retryFailed />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Не вдалося оновити ціни. Спробуйте ще раз за хвилину.",
    );
  });
});

describe("TermHintButton", () => {
  const name = (t) => `Що означає «${t}»?`;
  it("закрита: панелі немає в DOM; відкривається натиском", () => {
    render(<TermHintButton term="Капіталізація" hintText="Пояснення" id="h1" />);
    const btn = screen.getByRole("button", { name: name("Капіталізація") });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(btn).toHaveAttribute("aria-controls", "h1");
    expect(document.getElementById("h1")).toBeNull();
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("region", { name: "Капіталізація" });
    expect(panel).toHaveAttribute("id", "h1");
    expect(panel).toHaveTextContent("Пояснення");
    fireEvent.click(btn);
    expect(document.getElementById("h1")).toBeNull();
  });
  it("Esc з фокусом деінде закриває й повертає фокус", () => {
    render(
      <>
        <TermHintButton term="A" hintText="a" id="h1" />
        <input aria-label="інше" />
      </>,
    );
    const btn = screen.getByRole("button", { name: name("A") });
    fireEvent.click(btn);
    const other = screen.getByLabelText("інше");
    other.focus();
    fireEvent.keyDown(other, { key: "Escape" });
    expect(document.getElementById("h1")).toBeNull();
    expect(btn).toHaveFocus();
  });
  it("відкриття другої закриває першу", () => {
    render(
      <>
        <TermHintButton term="A" hintText="a" id="h1" />
        <TermHintButton term="B" hintText="b" id="h2" />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: name("A") }));
    fireEvent.click(screen.getByRole("button", { name: name("B") }));
    expect(document.getElementById("h1")).toBeNull();
    expect(document.getElementById("h2")).not.toBeNull();
  });
  it("клік поза панеллю закриває, всередині — ні; × закриває", () => {
    render(<TermHintButton term="A" hintText="a" id="h1" />);
    fireEvent.click(screen.getByRole("button", { name: name("A") }));
    fireEvent.mouseDown(screen.getByRole("region", { name: "A" }));
    expect(document.getElementById("h1")).not.toBeNull();
    fireEvent.mouseDown(document.body);
    expect(document.getElementById("h1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: name("A") }));
    fireEvent.click(screen.getByRole("button", { name: "Закрити підказку" }));
    expect(document.getElementById("h1")).toBeNull();
    expect(screen.getByRole("button", { name: name("A") })).toHaveFocus();
  });
});

describe("useMediaQuery", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });
  it("синхронне початкове значення", () => {
    window.matchMedia = (q) => ({
      matches: q === "(min-width: 768px)",
      addEventListener() {},
      removeEventListener() {},
    });
    expect(renderHook(() => useMediaQuery("(min-width: 768px)")).result.current).toBe(true);
    expect(renderHook(() => useMediaQuery("(min-width: 1px)")).result.current).toBe(false);
  });
  it("реагує на change", () => {
    let cb;
    const mql = {
      matches: false,
      addEventListener: (_e, f) => {
        cb = f;
      },
      removeEventListener() {},
    };
    window.matchMedia = () => mql;
    const { result } = renderHook(() => useMediaQuery("(x)"));
    expect(result.current).toBe(false);
    act(() => {
      mql.matches = true;
      cb();
    });
    expect(result.current).toBe(true);
  });
  it("без matchMedia — false", () => {
    window.matchMedia = undefined;
    expect(renderHook(() => useMediaQuery("(x)")).result.current).toBe(false);
  });
});

describe("useDocumentTitle", () => {
  it("ставить і оновлює document.title", () => {
    const { rerender } = renderHook(({ t }) => useDocumentTitle(t), {
      initialProps: { t: "Один" },
    });
    expect(document.title).toBe("Один");
    rerender({ t: "Два" });
    expect(document.title).toBe("Два");
  });
});

describe("TermHintButton position", () => {
  const rect = (left, width) => ({
    left,
    width,
    right: left + width,
    top: 0,
    bottom: 0,
    height: 0,
  });
  const cases = [
    ["320 біля правого краю", 320, 280, 250],
    ["320 біля лівого краю", 320, 2, 250],
    ["320 посередині", 320, 100, 250],
    ["1280 біля правого краю", 1280, 1250, 320],
    ["1280 посередині", 1280, 600, 320],
  ];
  it.each(cases)("%s: панель у межах [16, innerWidth − 16]", (_n, vw, btnLeft, panelW) => {
    const offset = computeHintOffset(btnLeft, panelW, vw);
    expect(btnLeft + offset).toBeGreaterThanOrEqual(16);
    expect(btnLeft + offset + panelW).toBeLessThanOrEqual(vw - 16);
  });

  it("застосовує зсув після відкриття", () => {
    vi.stubGlobal("innerWidth", 320);
    const spy = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function () {
        return this.getAttribute("role") === "region" ? rect(0, 250) : rect(280, 32);
      });
    render(<TermHintButton term="A" hintText="a" id="hp" />);
    fireEvent.click(screen.getByRole("button", { name: "Що означає «A»?" }));
    const panel = screen.getByRole("region", { name: "A" });
    expect(panel.style.left).toBe("-226px");
    spy.mockRestore();
    vi.unstubAllGlobals();
    fireEvent.keyDown(document, { key: "Escape" });
  });

  it("телефон: clientWidth 320, innerWidth 530 — maxWidth ≤ 288, панель у [16, 304]", () => {
    vi.stubGlobal("innerWidth", 530);
    const cw = vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(320);
    const spy = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function () {
        return this.getAttribute("role") === "region" ? rect(0, 288) : rect(280, 32);
      });
    render(<TermHintButton term="A" hintText="a" id="hm" />);
    fireEvent.click(screen.getByRole("button", { name: "Що означає «A»?" }));
    const panel = screen.getByRole("region", { name: "A" });
    expect(parseFloat(panel.style.maxWidth)).toBeLessThanOrEqual(288);
    const left = 280 + parseFloat(panel.style.left);
    expect(left).toBeGreaterThanOrEqual(16);
    expect(left + 288).toBeLessThanOrEqual(304);
    spy.mockRestore();
    cw.mockRestore();
    vi.unstubAllGlobals();
    fireEvent.keyDown(document, { key: "Escape" });
  });

  it("відкрита панель не успадковує nowrap (whitespace-normal)", () => {
    render(<TermHintButton term="A" hintText="a" id="hw" />);
    fireEvent.click(screen.getByRole("button", { name: "Що означає «A»?" }));
    expect(screen.getByRole("region", { name: "A" })).toHaveClass("whitespace-normal");
  });
});
