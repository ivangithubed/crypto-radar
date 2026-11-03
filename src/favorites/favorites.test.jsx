import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FAVORITES_KEY, SAFARI_HINT_KEY, useFavorites, useSafariHint } from "./index.js";

const TOP = new Set(["bitcoin", "ethereum", "solana"]);
const stored = () => window.localStorage.getItem(FAVORITES_KEY);

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("useFavorites: читання", () => {
  it("порожнє сховище → порожній список", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.ids).toEqual([]);
    expect(result.current.storeError).toBeNull();
  });

  it("прибирає дублі, зберігаючи порядок першої появи", () => {
    window.localStorage.setItem(FAVORITES_KEY, '["b","a","b","c","a"]');
    const { result } = renderHook(() => useFavorites());
    expect(result.current.ids).toEqual(["b", "a", "c"]);
  });

  it.each(['{"a":1}', "not json", "[1,2]", '"str"', "null"])("некоректне %s → порожньо", (raw) => {
    window.localStorage.setItem(FAVORITES_KEY, raw);
    const { result } = renderHook(() => useFavorites());
    expect(result.current.ids).toEqual([]);
    expect(result.current.storeError).toBeNull();
  });

  it("getItem кидає виняток → storeError read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { result } = renderHook(() => useFavorites());
    expect(result.current.ids).toEqual([]);
    expect(result.current.storeError).toBe("read");
  });
});

describe("useFavorites: зміни", () => {
  it("add лише з топ-50, без дублів, синхронний запис", () => {
    const { result } = renderHook(() => useFavorites());
    let ok;
    act(() => {
      ok = result.current.add("bitcoin", TOP);
    });
    expect(ok).toBe(true);
    expect(stored()).toBe('["bitcoin"]');
    act(() => {
      ok = result.current.add("bitcoin", TOP);
    });
    expect(ok).toBe(false);
    act(() => {
      ok = result.current.add("dogecoin", TOP);
    });
    expect(ok).toBe(false);
    act(() => {
      result.current.add("solana", TOP);
    });
    expect(result.current.ids).toEqual(["bitcoin", "solana"]);
    expect(result.current.has("solana")).toBe(true);
    expect(result.current.has("ethereum")).toBe(false);
    expect(stored()).toBe('["bitcoin","solana"]');
  });

  it("remove прибирає й пише синхронно", () => {
    window.localStorage.setItem(FAVORITES_KEY, '["bitcoin","solana"]');
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.remove("bitcoin"));
    expect(stored()).toBe('["solana"]');
    expect(result.current.ids).toEqual(["solana"]);
  });

  it("два хуки в одному дереві бачать одне й те саме", () => {
    function Counter({ label }) {
      const { ids } = useFavorites();
      return <p data-testid={label}>{ids.length}</p>;
    }
    function Adder() {
      const { add } = useFavorites();
      return <button onClick={() => add("bitcoin", TOP)}>add</button>;
    }
    render(
      <>
        <Counter label="a" />
        <Counter label="b" />
        <Adder />
      </>,
    );
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("a").textContent).toBe("1");
    expect(screen.getByTestId("b").textContent).toBe("1");
  });

  it("подія storage з іншої вкладки оновлює стан", () => {
    const { result } = renderHook(() => useFavorites());
    window.localStorage.setItem(FAVORITES_KEY, '["ethereum"]');
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: FAVORITES_KEY }));
    });
    expect(result.current.ids).toEqual(["ethereum"]);
    window.localStorage.clear();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(result.current.ids).toEqual([]);
  });

  it("setItem кидає виняток → ★ діє в пам'яті вкладки, storeError write", () => {
    const { result } = renderHook(() => useFavorites());
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    let ok;
    act(() => {
      ok = result.current.add("bitcoin", TOP);
    });
    expect(ok).toBe(false);
    expect(result.current.ids).toEqual(["bitcoin"]);
    expect(result.current.storeError).toBe("write");
    act(() => result.current.remove("bitcoin"));
    expect(result.current.ids).toEqual([]);
    expect(result.current.storeError).toBe("write");
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(result.current.storeError).toBeNull();
  });

  it("помилка запису під час remove → прибрано в пам'яті, storeError write", () => {
    window.localStorage.setItem(FAVORITES_KEY, '["bitcoin"]');
    const { result } = renderHook(() => useFavorites());
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    act(() => result.current.remove("bitcoin"));
    expect(result.current.storeError).toBe("write");
    expect(result.current.ids).toEqual([]);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
  });

  it("не тримає застарілий кеш між монтуваннями", () => {
    const first = renderHook(() => useFavorites());
    act(() => {
      first.result.current.add("bitcoin", TOP);
    });
    first.unmount();
    window.localStorage.clear();
    const second = renderHook(() => useFavorites());
    expect(second.result.current.ids).toEqual([]);
  });

  it("не містить коду видалення за часом (NFR-11)", () => {
    const files = import.meta.glob(["./store.js", "./safari.js", "./index.js"], {
      query: "?raw",
      eager: true,
      import: "default",
    });
    const sources = Object.values(files).join(" ");
    expect(Object.keys(files)).toHaveLength(3);
    expect(sources).not.toMatch(/setTimeout|setInterval|Date\.now|new Date|removeItem/);
  });
});

describe("useSafariHint", () => {
  const SAFARI_IOS =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const CHROME_ANDROID =
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
  const FIREFOX_IOS =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15";
  const CHROME_DESKTOP =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

  const withUa = (ua) => vi.stubGlobal("navigator", { userAgent: ua });

  it("видно в Safari iOS", () => {
    withUa(SAFARI_IOS);
    const { result } = renderHook(() => useSafariHint());
    expect(result.current.visible).toBe(true);
  });

  it.each([CHROME_ANDROID, FIREFOX_IOS, CHROME_DESKTOP])("приховано в іншому браузері", (ua) => {
    withUa(ua);
    const { result } = renderHook(() => useSafariHint());
    expect(result.current.visible).toBe(false);
  });

  it("приховано в standalone (matchMedia і navigator.standalone)", () => {
    withUa(SAFARI_IOS);
    window.matchMedia = () => ({ matches: true });
    expect(renderHook(() => useSafariHint()).result.current.visible).toBe(false);
    window.matchMedia = () => ({ matches: false });
    vi.stubGlobal("navigator", { userAgent: SAFARI_IOS, standalone: true });
    expect(renderHook(() => useSafariHint()).result.current.visible).toBe(false);
  });

  it("відсутній matchMedia — не standalone", () => {
    withUa(SAFARI_IOS);
    const saved = window.matchMedia;
    window.matchMedia = undefined;
    try {
      expect(renderHook(() => useSafariHint()).result.current.visible).toBe(true);
    } finally {
      window.matchMedia = saved;
    }
  });

  it("приховано, якщо вже закрито; dismiss пише 1 і ховає", () => {
    withUa(SAFARI_IOS);
    const { result } = renderHook(() => useSafariHint());
    expect(result.current.visible).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
    expect(window.localStorage.getItem(SAFARI_HINT_KEY)).toBe("1");
    expect(renderHook(() => useSafariHint()).result.current.visible).toBe(false);
  });

  it("помилки localStorage не кидаються", () => {
    withUa(SAFARI_IOS);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { result } = renderHook(() => useSafariHint());
    expect(() => act(() => result.current.dismiss())).not.toThrow();
    expect(result.current.visible).toBe(false);
  });
});
