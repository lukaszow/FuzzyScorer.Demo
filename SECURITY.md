# Security Policy

## Overview

FuzzyScorer.Demo is a Blazor WebAssembly demo application for the
[FuzzyScorer](https://www.nuget.org/packages/FuzzyScorer) NuGet package.

## Reporting Vulnerabilities

If you discover a security vulnerability, please **do NOT open a public GitHub issue**.

Instead, email the maintainer directly at **lukaszow@users.noreply.github.com** with:
- Vulnerability description
- Steps to reproduce
- Severity assessment (Critical / High / Medium / Low)

Allow 72 hours for initial assessment.

## Scope

This repository is a demonstration app, not a production service. Security
considerations are inherited from the underlying FuzzyScorer library and the
Blazor WASM runtime.

For library-specific security details, see
[FuzzyScorer SECURITY.md](https://github.com/lukaszow/FuzzyScorer/blob/master/SECURITY.md).

## Security Audit Log

| Date | Check | Result |
|---|---|---|
| 2026-09-28 | Secrets/credentials scan (full codebase + history) | **PASS** — no secrets, keys, or credentials found |
| 2026-09-28 | Vulnerable NuGet packages (`dotnet list package --vulnerable --include-transitive`) | **PASS** — zero vulnerabilities |
| 2026-09-28 | External network calls | **PASS** — no outbound HTTP; `HttpClient` scoped to own origin only |
| 2026-09-28 | Server-side components | **PASS** — pure Blazor WASM, single `Program.cs` entrypoint |
| 2026-09-28 | Ignore rules for sensitive files | **PASS** — `.gitignore` covers `.env`, `*.pem`, `*.pfx`, and `.DS_Store` |
| 2026-09-28 | Tracked OS/build artifacts | **PASS** — `.DS_Store`, `bin/`, and `obj/` purged from history |
| 2026-10-24 | Outdated NuGet packages (`dotnet list package --outdated`) | **PASS** — ASP.NET Core WebAssembly updated to 10.0.13; FuzzyScorer 2.3.0 is current |
| 2026-10-24 | External network calls | **PASS** — unused `HttpClient` registration removed; no outbound HTTP |
| 2026-10-24 | Input validation | **PASS** — UI checks the character limit; library limits are surfaced as errors instead of unhandled exceptions |
| 2026-10-24 | Content Security Policy | **PASS (partial)** — meta CSP added in `wwwroot/index.html`; `frame-ancestors` and other header-only directives require hosting configuration |

## General Guidelines

- All data processing happens client-side in the browser
- No server-side components or external network calls are made by the app
- Input length is pre-checked in the UI; FuzzyScorer enforces its word and
  character limits
- The app ships as static assets; header-only security directives (e.g.
  `frame-ancestors`) must be configured at the hosting layer. A meta CSP is
  included in `wwwroot/index.html`.
