# Older changes
## 0.2.5 (2026-07-04)
- (Alan Paris) Resolved all ESLint warnings (unawaited promises, JSDoc parameter descriptions)

## 0.2.4 (2026-07-04)
- (Alan Paris) Fixed state roles so writable transition, keyer and media-player selectors, macro run and input info states pass the ioBroker object checker
- (Alan Paris) Removed the legacy flat `transitionStyle` state on upgrade
- (Alan Paris) Use adapter-managed timers for the reconnect timeout
- (Alan Paris) Updated dependencies for repochecker compliance

## 0.2.3 (2026-05-21)
- (Alan Paris) Bump minimum Node.js to 22 and CI matrix to 22/24 for ioBroker community submission compliance
- (Alan Paris) Set `common.noGit: true` so the gitignored `build/` tree does not trip the repochecker
- (Alan Paris) Trim `common.news` to only versions published to npm

## 0.2.2 (2026-05-20)
- (Alan Paris) Switched CI publish to npm trusted publishing (OIDC)

## 0.2.1 (2026-05-20)
- (Alan Paris) Initial publication to npm registry

## 0.2.0 (2025-02-04)
- (Alan Paris) Added model selection, transition rates, auxiliary outputs, tally, audio per-input, color generators

## 0.1.0 (2025-01-29)
- (Alan Paris) Initial release: program/preview switching, DSK/USK, streaming and recording, media players, macros
