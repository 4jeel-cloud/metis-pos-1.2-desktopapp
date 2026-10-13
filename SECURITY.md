# Security Policy

MetisPOS is a fork of [NexoPOS](https://github.com/Blair2004/NexoPOS) (GPL-3.0, copyright Blair2004) and this policy applies to the MetisPOS desktop application.

## Reporting a Vulnerability

Please **do not open a public issue** for security vulnerabilities.

Report privately via GitHub's **private vulnerability reporting** for this repository:

👉 https://github.com/4jeel-cloud/metis-pos-1.2-desktopapp/security/advisories/new

Expect an acknowledgement within a few days. We ask that you give us time to prepare a fix and a release before the issue is disclosed publicly.

## What Can Be Reported

Anything that could compromise confidentiality or integrity of the local store data, leak files or the database, bypass access control, or let a local attacker control the app beyond its intended purpose. Bugs that do not expose the system are not treated as security reports.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release (`v*`) | ✅ receives security fixes |
| Older releases | ❌ update to the latest release |

## Dependency Security

Dependency updates are tracked with Dependabot; `composer audit --locked` is expected to report **0 advisories** before any release. The app is only reachable on `127.0.0.1` and ships `APP_DEBUG=false`, with a unique `APP_KEY` and admin password generated per install.