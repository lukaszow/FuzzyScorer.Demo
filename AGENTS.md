# AGENTS.md

## Project
Blazor WebAssembly demo app for the `FuzzyScorer` NuGet package (Levenshtein-distance word clustering). Targets **.NET 10.0** (`Microsoft.NET.Sdk.BlazorWebAssembly`, nullable + implicit usings on).

## Commands
- **Run**: `dotnet run` → `http://localhost:5231` (profile in `Properties/launchSettings.json`)
- **Build**: `dotnet build`
- No solution file, no tests, no CI. Don't invent test/lint commands.

## Key details
- Single project. `Program.cs` is the entrypoint; `FuzzyScorer` is DI-registered there (`Program.cs:10`).
- **Namespace gotcha**: the project's root namespace is `FuzzyScorer.Demo`, which collides with the package namespace `FuzzyScorer`. Always fully qualify package types as `global::FuzzyScorer.*` (see `Pages/Home.razor`, `Program.cs`).
- Package version lives in `FuzzyScorer.Demo.csproj` (**1.1.2**) — README/AGENTS references to 1.1.0 are stale; trust the csproj.
- Do not modify `FuzzyScorer` library code — it's an external NuGet package.

## API surface used
- Static: `global::FuzzyScorer.WordScorer.GetWordFrequencies(text)` and `.GroupSimilarWords(text, maxEditDistance)`.
- Injected: `global::FuzzyScorer.IFuzzyScorer.ScoreAsync(text, sensitivity, token)`.

## Structure
- `Pages/Home.razor` (`@page "/"`) is the real demo (raw vs. clustered word clouds + error log).
- `Pages/Counter.razor` and `Pages/Weather.razor` are unused template leftovers, still linked in `Layout/NavMenu.razor`.
- Bootstrap is vendored under `wwwroot/lib/` and loaded with `OverrideHtmlAssetPlaceholders=true`; don't switch to a CDN.
