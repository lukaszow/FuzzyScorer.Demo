# AGENTS.md

## Project
Blazor WebAssembly demo app for the `FuzzyScorer` NuGet package (Levenshtein-distance word clustering). Target: **.NET 10.0**.

## Commands
- **Run**: `dotnet run` (serves on `http://localhost:5231`)
- **Build**: `dotnet build`
- No solution file, no tests, no CI.

## Key details
- Single project — `Program.cs` is the entrypoint. No monorepo structure.
- `FuzzyScorer` v1.1.0 from NuGet — do not modify library code, it's external.
- Static assets (Bootstrap) live under `wwwroot/lib/` and are vendored.
