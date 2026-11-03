import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom не реалізує прокрутку; FocusOnNavigate викликає window.scrollTo після кожного переходу.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
});
