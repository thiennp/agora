# Third-party licences

Agora's own code is MIT (see [LICENSE](LICENSE)). It depends on the packages below. Every one is open source and free
of charge to use; nothing here needs a paid licence or an account. The SPDX identifiers were read from each package's
`package.json` in `node_modules` (versions as installed by `package-lock.json`), not taken from memory.

The project ships no third-party UI kit, template, icon set, font file or image. The interface components, design
tokens and icons are original to this repository.

## Direct dependencies (`dependencies`, shipped with the app)

| Package | Version | SPDX licence |
|---|---|---|
| next | 15.5.28 | MIT |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| zod | 3.25.76 | MIT |
| tailwindcss | 4.3.3 | MIT |
| @tailwindcss/postcss | 4.3.3 | MIT |
| postcss | 8.5.32 | MIT |
| tailwind-merge | 3.7.0 | MIT |
| @modelcontextprotocol/sdk | 1.32.2 | MIT |
| pg | 8.23.1 | MIT |
| sharp | 0.35.5 | Apache-2.0 |

## Direct dev dependencies (`devDependencies`, build, test and lint only)

| Package | Version | SPDX licence |
|---|---|---|
| typescript | 5.9.3 | Apache-2.0 |
| @playwright/test | 1.64.1 | Apache-2.0 |
| vitest | 2.1.9 | MIT |
| eslint | 9.39.5 | MIT |
| typescript-eslint | 8.72.1 | MIT |
| tsx | 4.23.15 | MIT |
| @types/node | 22.20.5 | MIT |
| @types/react | 19.3.0 | MIT |
| @types/react-dom | 19.3.0 | MIT |

All direct dependencies are permissive (MIT or Apache-2.0).

## Transitive dependencies that are not plain MIT/Apache-2.0

Counted from `package-lock.json` (about 320 packages in total; most are MIT, Apache-2.0, ISC or BSD). These are
not direct dependencies, but they are in the tree, so they are stated here:

- **LGPL-3.0-or-later**: the prebuilt `@img/sharp-libvips-*` binaries (and the `@img/sharp-*` platform packages that
  bundle them, listed as `Apache-2.0 AND LGPL-3.0-or-later`). They come in through `next` as **optional** dependencies
  of `sharp` (Next's image optimiser) and are only installed for the matching platform. LGPL is a free-software licence
  with no fee; it is weak copyleft, which matters only if you redistribute those binaries. Agora does not use the
  image optimiser and ships no images.
- **MPL-2.0**: `lightningcss` and its platform binaries, used by Tailwind 4's build. Weak (file-level) copyleft, free of
  charge; applies to those files only, not to Agora's code.
- **CC-BY-4.0**: `caniuse-lite`, browser-support data used by build tooling. Data licence, free, attribution required
  (given here).
- **Python-2.0**: `argparse` (a dev-tool dependency of ESLint). PSF-style permissive licence.
- **BlueOak-1.0.0**: one nested `minimatch`. Permissive.
- **0BSD, BSD-2-Clause, BSD-3-Clause, ISC**: permissive.

None of these requires payment. To regenerate the counts: read the `license` field of each entry in
`package-lock.json`.
