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

## General Guidelines

- All data processing happens client-side in the browser
- No server-side components or external network calls are made by the app
- Input validation is delegated to the FuzzyScorer library
- The app ships as static assets; security headers (e.g. CSP) must be configured
  at the hosting layer, outside this repository
