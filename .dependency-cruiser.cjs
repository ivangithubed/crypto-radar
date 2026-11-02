// Межі модулів — розділ 5 «Модулі» документа архітектури (.agentic/specs/03-architecture.md).
// Залежності йдуть лише згори вниз: app → features/* → market-data, favorites, glossary, chart, theme → ui, lib.

/** Модуль `from` може імпортувати з `src/` лише перелічені модулі (і себе). */
function onlyDependsOn(name, from, allowed) {
  return {
    name,
    severity: "error",
    comment: `${from} може залежати лише від: ${allowed.join(", ") || "нічого"} (розділ 5 архітектури)`,
    from: { path: `^src/${from}/` },
    to: {
      path: "^src/",
      pathNot: [`^src/${from}/`, ...allowed.map((module) => `^src/${module}/`)],
    },
  };
}

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Циклів між модулями немає (розділ 5 архітектури)",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "error",
      comment: "Файл, який ніхто не імпортує, — мертвий код",
      from: {
        orphan: true,
        pathNot: ["\\.test\\.jsx?$", "^src/test/", "^src/main\\.jsx$", "\\.css$"],
      },
      to: {},
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "no-import-of-app",
      severity: "error",
      comment: "Корінь app імпортує лише точка входу main.jsx",
      from: { pathNot: ["^src/main\\.jsx$", "^src/app/"] },
      to: { path: "^src/app/" },
    },
    {
      name: "features-are-isolated",
      severity: "error",
      comment: "Екрани не імпортують одне одного",
      from: { path: "^src/features/([^/]+)/" },
      to: { path: "^src/features/", pathNot: "^src/features/$1/" },
    },
    onlyDependsOn("features-allowed-deps", "features/[^/]+", [
      "market-data",
      "favorites",
      "glossary",
      "chart",
      "ui",
      "lib",
    ]),
    onlyDependsOn("market-data-deps", "market-data", ["lib"]),
    onlyDependsOn("favorites-deps", "favorites", ["lib"]),
    onlyDependsOn("theme-deps", "theme", []),
    onlyDependsOn("glossary-deps", "glossary", ["ui"]),
    onlyDependsOn("chart-deps", "chart", ["lib"]),
    onlyDependsOn("ui-deps", "ui", []),
    onlyDependsOn("lib-deps", "lib", []),
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "^src/test/" },
    moduleSystems: ["es6"],
    // Пакети лише з полем `exports` (react-router 8) інакше нерозв'язні: not-to-unresolvable (запит №2, етап 5).
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
