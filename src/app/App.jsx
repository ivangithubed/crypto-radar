// Оболонка застосунку (каркас етапу 5): орієнтири сторінки й один h1.
// Маршрути, дані й екрани додає етап 7 за планом етапу 6.
export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface font-sans text-ink">
      <header className="border-b border-line bg-surface-raised px-4 py-3">
        <p className="font-display text-lg font-semibold">Крипто-Радар</p>
      </header>
      <main className="flex-1 px-4 py-6">
        <h1 className="font-display text-2xl font-semibold">Крипто-Радар</h1>
        <p className="mt-2 text-ink-muted">
          Каркас застосунку. Екрани з&apos;являться на етапі реалізації.
        </p>
      </main>
      <footer className="border-t border-line px-4 py-3 text-sm text-ink-muted">
        <p>Крипто-Радар</p>
      </footer>
    </div>
  );
}
