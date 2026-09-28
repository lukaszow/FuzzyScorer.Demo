# AGENTS.md

## Project
Blazor WebAssembly demo app for the `FuzzyScorer` NuGet package (Levenshtein-distance word clustering). Targets **.NET 10.0** (`Microsoft.NET.Sdk.BlazorWebAssembly`, nullable + implicit usings on).

## Commands
- **Run**: `dotnet run` → `http://localhost:5231` (profile in `Properties/launchSettings.json`)
- **Build (matches CI)**: `dotnet build --configuration Release -warnaserror`
- No solution file, no tests. CI (`.github/workflows/build.yml`) runs the Release build on `main`.
- Dependabot (`.github/dependabot.yml`) keeps NuGet + GitHub Actions updated.

## Key details
- Single project. `Program.cs` is the entrypoint; `FuzzyScorer` is DI-registered there (`Program.cs:10`).
- **Namespace gotcha**: the project's root namespace is `FuzzyScorer.Demo`, which collides with the package namespace `FuzzyScorer`. Always fully qualify package types as `global::FuzzyScorer.*` (see `Pages/Home.razor`, `Program.cs`).
- Package version source of truth is `FuzzyScorer.Demo.csproj` (currently **1.1.2**); keep README in sync.
- Do not modify `FuzzyScorer` library code — it's an external NuGet package.

## API surface used
- Static: `global::FuzzyScorer.WordScorer.GetWordFrequencies(text)` and `.GroupSimilarWords(text, maxEditDistance)`.
- Injected: `global::FuzzyScorer.IFuzzyScorer.ScoreAsync(text, sensitivity, token)`.

## Structure
- `Pages/Home.razor` (`@page "/"`) is the only page (raw vs. clustered word clouds + error log). Recalculation is async; keep new handlers awaited so the error log stays in sync.
- Bootstrap is vendored under `wwwroot/lib/` and loaded with `OverrideHtmlAssetPlaceholders=true`; don't switch to a CDN.
