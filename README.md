# create-prettyrocket-app

A starter kit for personal web apps: Vite + React + TypeScript + MUI, deployed to GitHub Pages.

## How this works

This repo is a **generator**, not an app you build in. It has two parts:

- **`template/`**: a complete, working starter app. It's the thing that gets copied.
- **`index.js`**: a small command-line tool (CLI) that copies `template/` into a new folder,
  names it, installs packages, makes the first git commit, and optionally sets up GitHub.

Each new app is a separate folder and repo with its own copy of the code. After it's created it
has no connection to this repo.

```
create-prettyrocket-app/        ← this repo: you maintain the starter here
├─ index.js                     ← the CLI
└─ template/                    ← the starter app that gets copied

my-new-app/                     ← what the CLI creates: you build your app here
```

## Making a new app

**Once this is published to npm**, from the folder where you keep projects:

```sh
npm create prettyrocket-app@latest my-app
```

`npm create prettyrocket-app` downloads and runs the `create-prettyrocket-app` package. It asks for
an app title and whether to create a GitHub repo, then:

1. Copies `template/` to `my-app/` and fills in the name and title.
2. Runs `npm install`, taking only package versions published at least 3 days ago (the same
   cooldown Dependabot uses), so a just-published bad release can't land in a new app. If the
   template needs a newer version than that, it installs anyway and warns.
3. Runs `git init` and makes an initial commit.
4. If you say yes (and the GitHub CLI `gh` is logged in): creates a **public** GitHub repo
   (Pages on a free plan needs one), enables GitHub Pages and Dependabot security updates, and
   pushes. The first deploy starts right away; the site appears at
   `https://<user>.github.io/my-app/`.

Then `cd my-app && npm run dev`, and see `my-app/README.md` for how the app is put together.

**Before it's published** (or to try local changes), run the CLI straight from this repo:

```sh
node path/to/create-prettyrocket-app/index.js my-app
```

Or run `npm link` once inside this repo; after that, `create-prettyrocket-app my-app` works from
any folder and always uses your local copy.

Requirements: Node 22.4 or newer, git, and (for the GitHub step) the [GitHub CLI](https://cli.github.com/)
logged in with `gh auth login`.

### Options

Add options after `--` when using `npm create` (no `--` needed with `node index.js`):

```sh
npm create prettyrocket-app@latest my-app -- --title "My App" --github
```

| Option            | Effect                                                          |
| ----------------- | --------------------------------------------------------------- |
| `--title <title>` | App title (default: from the directory name)                    |
| `--no-install`    | Skip `npm install` (and the GitHub step: CI needs the lockfile) |
| `--no-git`        | Skip `git init` and the initial commit                          |
| `--github`        | Create the GitHub repo and enable Pages without asking          |
| `--no-github`     | Skip the GitHub step                                            |
| `-y`, `--yes`     | Accept defaults; skips GitHub unless `--github` is given        |

## What's in a new app

React 19, MUI with light/dark mode, React Router, TanStack Query, a `useLocalStorage` hook, Vitest +
Testing Library, ESLint + Prettier, a GitHub Pages CI/deploy workflow, and grouped Dependabot
updates. See [`template/README.md`](template/README.md), which becomes each app's README.

## Maintaining the template

### Changing the starter

`template/` is a normal app, so you can work on it directly:

```sh
cd template
npm install
npm run dev     # plus npm test, npm run lint, etc.
```

Then try the real flow by generating a throwaway app:

```sh
node index.js ../scratch-app --yes --no-github
```

Things to know:

- **`template/_gitignore`** is the new app's `.gitignore`. npm drops files named `.gitignore`
  when publishing, so the CLI renames it on copy. Edit `_gitignore`, not a `.gitignore`.
- **`template/package-lock.json`** is committed so CI and Dependabot have exact versions, but it
  isn't published. Each new app resolves the newest versions allowed by the template's ranges
  on the day it's created.
- **Formatting:** the root and `template/` each have a Prettier config. Run `npm run format` in
  whichever you changed.

### Keeping dependencies current

Dependabot opens weekly PRs against `template/`, grouped the same way new apps get them.
Merge the green ones, and do major version bumps by hand (`npm install <pkg>@latest` in
`template/`, then fix whatever breaks). Then publish (below), because **nothing reaches new apps
until you publish**.

There are two Dependabot configs: `.github/dependabot.yml` (this repo) and
`template/.github/dependabot.yml` (copied into each app). Keep their template groups in sync.

**Apps you already created don't get template updates.** Each app is its own copy, so port
changes to it by hand if you want them there.

### Publishing

First time only: `npm login`.

Check the latest smoke run first: if it warns that an app was "installed without the 3-day
cooldown", the template requires a version released in the last 3 days (usually after a manual
bump). Wait until the warning clears before publishing. Then:

```sh
npm pack --dry-run    # check the file list: no node_modules, dist, or lockfile
npm version minor     # patch for fixes, minor for template changes, major for breaking CLI changes
npm publish
git push --follow-tags
```

### Commit style

History is kept as one commit per area (lint/format, theme, routing, data, deploy, CLI, …). To
tweak an area, commit with `git commit --fixup=<that commit>` and fold it in with
`git rebase -i --autosquash --root` before pushing.
