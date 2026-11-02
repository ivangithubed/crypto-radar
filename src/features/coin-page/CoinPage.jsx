import { Link, useParams } from "react-router";
import { useStablecoinIds } from "../../market-data/index.js";
import { useDocumentTitle } from "../../ui/index.js";
import { CoinFailure } from "./CoinFailure.jsx";
import { CoinLoading } from "./CoinLoading.jsx";
import { CoinView } from "./CoinView.jsx";
import { OutOfTop } from "./OutOfTop.jsx";
import { useCoinFavorite } from "./useCoinFavorite.js";
import { useCoinView } from "./useCoinView.js";

const SUFFIX = "— Крипто-Радар";

function titleOf(view, coin) {
  if (view === "out") return `Монета поза топ-50 ${SUFFIX}`;
  if (coin && (view === "data" || view === "noChart"))
    return `${coin.name} (${coin.symbol}) ${SUFFIX}`;
  return `Монета ${SUFFIX}`;
}

/**
 * Екран S-2 «Сторінка монети» (UX §3 S-2, UF-4): id береться з маршруту `/coin/:id`.
 * @returns {import('react').ReactElement}
 */
export function CoinPage() {
  const { id = "" } = useParams();
  const stableIds = useStablecoinIds();
  const { top, coin, top50Ids, view, retry, retryFailed, h1Ref } = useCoinView(id);
  const favorite = useCoinFavorite(id, coin?.name ?? id, top50Ids);
  useDocumentTitle(titleOf(view, coin));

  const failure = (name) => (
    <CoinFailure
      name={name}
      kind={top.errorKind ?? "src"}
      onRetry={retry}
      retrying={top.retrying}
      retryFailed={retryFailed}
      h1Ref={h1Ref}
    />
  );

  return (
    <div className="grid gap-4">
      <Link to="/" className="font-semibold text-brand hover:underline">
        ← До списку монет
      </Link>
      {view === "loading" ? <CoinLoading /> : null}
      {view === "error" ? failure() : null}
      {view === "noChart" ? failure(coin.name) : null}
      {view === "out" ? <OutOfTop id={id} favorite={favorite} h1Ref={h1Ref} /> : null}
      {view === "data" ? (
        <CoinView
          coin={coin}
          isStable={stableIds.has(coin.id)}
          pricesAt={top.pricesAt}
          favorite={favorite}
          h1Ref={h1Ref}
        />
      ) : null}
    </div>
  );
}
