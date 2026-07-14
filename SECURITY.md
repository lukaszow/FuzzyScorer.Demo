# Security Policy

## Overview

FuzzyScorer.Demo is a Blazor WebAssembly demo application for the
[FuzzyScorer](https://www.nuget.org/packages/FuzzyScorer) NuGet package.

## Reporting Vulnerabilities

If you discover a security vulnerability, please **do NOT open a public GitHub issue**.

Instead, email the maintainer directly with:
- Vulnerability description
- Steps to reproduce
- Severity assessment (Critical / High / Medium / Low)

Allow 72 hours for initial assessment.

## Scope

This repository is a demonstration app, not a production service. Security
considerations are inherited from the underlying FuzzyScorer library and the
Blazor WASM runtime.

For library-specific security details, see
[FuzzyScorer SECURITY.md](https://github.com/lukaszow/FuzzyScorer/blob/main/SECURITY.md).

## Security Audit Log

| Date | Check | Result |
|---|---|---|
| 2026-07-14 | Secrets/credentials scan (full codebase) | **PASS** — no secrets, keys, or credentials found |
| 2026-07-14 | Vulnerable NuGet packages (`dotnet list package --vulnerable`) | **PASS** — zero vulnerabilities |
| 2026-07-14 | External network calls | **PASS** — no outbound HTTP; HttpClient scoped to own origin only |
| 2026-07-14 | Server-side components | **PASS** — pure Blazor WASM, single `Program.cs` entrypoint |
| 2026-07-14 | .gitignore sensitive exclusions | **PASS** — no patterns for `.env`, `*.pem`, or credential files |

## General Guidelines

- All data processing happens client-side in the browser
- No server-side components or external network calls are made by the app
- Input validation is delegated to the FuzzyScorer library
