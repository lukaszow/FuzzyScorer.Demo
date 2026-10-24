# AGENTS.md

## Project
Blazor WebAssembly demo app for the `FuzzyScorer` NuGet package (Levenshtein-distance word clustering). Targets **.NET 10.0** (`Microsoft.NET.Sdk.BlazorWebAssembly`, nullable + implicit usings on).

## Commands
- **Run**: `dotnet run` → `http://localhost:5231` (profile in `Properties/launchSettings.json`)
- **Build (matches CI)**: `dotnet build --configuration Release -warnaserror`
- **After bumping the `FuzzyScorer` package version**: delete `bin/` and `obj/` before building. NuGet-cached DLL timestamps can be older than the generated WebCIL asset, leaving a stale `_framework/FuzzyScorer.*.wasm` that fails at runtime with `MissingMethodException`.
- No solution file, no tests. CI (`.github/workflows/build.yml`) runs the Release build on `main`.
- Dependabot (`.github/dependabot.yml`) keeps NuGet + GitHub Actions updated.

## Key details
- Single project. `Program.cs` is the entrypoint; `FuzzyScorer` is DI-registered there (`Program.cs:10`).
- **Namespace gotcha**: the project's root namespace is `FuzzyScorer.Demo`, which collides with the package namespace `FuzzyScorer`. Always fully qualify package types as `global::FuzzyScorer.*` (see `Pages/Home.razor`, `Program.cs`).
- Package version source of truth is `FuzzyScorer.Demo.csproj` (currently **2.3.0**); keep README in sync.
- Do not modify `FuzzyScorer` library code — it's an external NuGet package.
- The demo starts at edit distance **1**. The sample text keeps the correct spelling most frequent because `ScoreAsync` suggests the most frequent member (longest on ties); higher distances intentionally expose over-merging of unrelated short words.

## API surface used
- Static: `global::FuzzyScorer.WordScorer.GetWordFrequencies(text)`, `.GroupSimilarWords(text, maxEditDistance)`, and `.AreWordsSimilar(a, b, maxDistance)` (looped over 0..max to derive the distance; `ComputeEditDistance` is internal).
- Injected: `global::FuzzyScorer.IFuzzyScorer.ScoreAsync(text, sensitivity, token)`.
- Result data: `FuzzyScorerResult.WordGroups` (`Representative`, `Members`, `Count`) drives the cluster color map; `ErrorEntry.SuggestedText` and `.IsCertain` feed the suggestion column and the `ambiguous` badge.

## Structure
- `Pages/Home.razor` (`@page "/"`) is the only page (raw vs. clustered word clouds + error log). Recalculation is async, debounced by 300 ms, and cancelled via `CancellationTokenSource`; keep new handlers awaited so the error log stays in sync. The interactive edit distance is capped at 10 (library limit is 50).
- Bootstrap is vendored under `wwwroot/lib/` (only `dist/css/bootstrap.min.css` is kept) and loaded with `OverrideHtmlAssetPlaceholders=true`; don't switch to a CDN.
- Visual identity lives in `wwwroot/css/app.css` (theme tokens, `prefers-color-scheme` dark mode) and `Pages/Home.razor.css` (scoped layout). Cluster colors use an inline `--group-hue` custom property assigned by cluster size; word opacity uses `--word-opacity` so selection dimming can still override it. Only Bootstrap CSS is vendored, so interactions are CSS-only (no collapse/tooltip JS). On narrow screens the error table becomes a card list via `data-label` attributes.
