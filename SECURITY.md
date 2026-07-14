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

## General Guidelines

- No secrets, API keys, or credentials are stored in this repository
- All data processing happens client-side in the browser
- No server-side components or external network calls are made by the app
- Input validation is delegated to the FuzzyScorer library
