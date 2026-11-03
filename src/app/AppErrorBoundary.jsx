import { Component, useEffect, useRef } from "react";
import { Button, useDocumentTitle } from "../ui/index.js";

/** Запасний екран S-5 (UX §3 S-5, §5.2 `crash.*`): `role="alert"`, фокус на h1, перезавантаження сторінки. */
function CrashScreen() {
  useDocumentTitle("Помилка — Крипто-Радар");
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section
      role="alert"
      className="grid justify-items-start gap-2 rounded-md bg-error-surface p-6 text-ink"
    >
      <h1
        ref={heading}
        tabIndex={-1}
        className="font-display text-xl font-semibold text-down [&:focus:not(:focus-visible)]:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:text-2xl"
      >
        Щось пішло не так
      </h1>
      <p>Перезавантажте сторінку. Ваші обрані збережені.</p>
      <Button variant="primary" onClick={() => window.location.reload()}>
        Перезавантажити сторінку
      </Button>
    </section>
  );
}

/** Межа помилок React (NFR-13, A10:2025): непередбачений збій рендеру показує S-5 замість порожньої сторінки. */
export class AppErrorBoundary extends Component {
  /** @param {{children?: import('react').ReactNode}} props */
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <CrashScreen /> : this.props.children;
  }
}
