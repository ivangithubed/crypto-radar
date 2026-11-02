import { useEffect, useRef } from "react";
import { Button } from "./Button.jsx";
import { StatusMessage } from "./StatusMessage.jsx";

const TEXTS = {
  src: {
    title: "Не вдалося отримати ціни",
    text: "CoinGecko зараз не відповідає, тому ціни не показуємо. Спробуйте ще раз за хвилину.",
    retryFailed: "Не вдалося оновити ціни. Спробуйте ще раз за хвилину.",
  },
  net: {
    title: "Немає з'єднання",
    text: "Перевірте інтернет і спробуйте ще раз.",
    retryFailed: "Досі немає з'єднання. Перевірте інтернет і спробуйте ще раз.",
  },
  stale: {
    title: "Ціни застаріли",
    text: "Ціни старші за 5 хвилин, тому ми їх сховали, щоб ви не зробили висновків із неактуальних даних. Спробуйте ще раз за хвилину.",
    retryFailed: "Не вдалося оновити ціни. Спробуйте ще раз за хвилину.",
  },
};

/**
 * Блок помилки даних (UX §3, §5.2 `error.*`): `role="alert"`, заголовок і текст за `kind`,
 * кнопка «Спробувати ще раз» / «Завантажуємо…» (`aria-disabled`), після невдалого повтору — `error.retryFailed`
 * у `role="status"` і фокус на кнопці.
 * @param {{kind: 'src' | 'net' | 'stale', onRetry: () => void, retrying: boolean, retryFailed: boolean}} props
 * @returns {import('react').ReactElement}
 */
export function ErrorBlock({ kind, onRetry, retrying, retryFailed }) {
  const texts = TEXTS[kind] ?? TEXTS.src;
  const buttonRef = useRef(null);

  useEffect(() => {
    if (retryFailed) buttonRef.current?.focus();
  }, [retryFailed]);

  return (
    <div role="alert" className="rounded-md bg-error-surface p-6">
      <h2 className="font-sans text-lg leading-6 font-semibold text-down">{texts.title}</h2>
      <p className="mt-2 mb-4 text-ink">{texts.text}</p>
      <Button ref={buttonRef} aria-disabled={retrying ? "true" : undefined} onClick={onRetry}>
        {retrying ? "Завантажуємо…" : "Спробувати ще раз"}
      </Button>
      <StatusMessage className="mt-3 text-ink">
        {retryFailed ? texts.retryFailed : null}
      </StatusMessage>
    </div>
  );
}
