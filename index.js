#!/usr/bin/env node
import * as p from '@clack/prompts';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const TEMPLATE_DIR = fileURLToPath(new URL('./template', import.meta.url));
// Present when running from a repo checkout (npm link); never copied.
const SKIP = new Set(['node_modules', 'dist', 'coverage', 'package-lock.json']);
// npm package name rules for new, unscoped packages.
const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;
const RESERVED_NAMES = new Set(['node_modules', 'favicon.ico']);
// Dependencies must be at least this old, matching Dependabot's cooldown.
const COOLDOWN_DAYS = 3;

// Rulesets for the new repo's main branch. The owner (admin role, id 5) can
// push directly; everyone else's changes need a PR whose CI passed. Nobody,
// the owner included, can delete or force-push main.
const RULESETS = [
  {
    name: 'Protect main',
    target: 'branch',
    enforcement: 'active',
    conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
    rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }],
  },
  {
    name: 'Require CI',
    target: 'branch',
    enforcement: 'active',
    bypass_actors: [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' }],
    conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
    rules: [
      {
        type: 'pull_request',
        parameters: {
          // Owners can't approve their own PRs, so requiring reviews would block them.
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: false,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: false,
          do_not_enforce_on_create: true,
          // The `build` job in template/.github/workflows/deploy.yml. Pinned to
          // GitHub Actions' app id so no other app can report it as passing.
          required_status_checks: [{ context: 'build', integration_id: 15368 }],
        },
      },
    ],
  },
];

const HELP = `Usage: npm create prettyrocket-app@latest [dir] -- [options]

Options:
  --title <title>   App title (default: from the directory name)
  --no-install      Skip npm install (also skips GitHub: CI needs the lockfile)
  --no-git          Skip git init and the initial commit
  --github          Create a public GitHub repo and enable Pages without asking
  --no-github       Skip the GitHub step
  -y, --yes         Accept defaults; skips GitHub unless --github is given
  -h, --help        Show this help
`;

function fail(message) {
  p.cancel(message);
  process.exit(1);
}

let opts;
let positionals;
try {
  ({ values: opts, positionals } = parseArgs({
    allowPositionals: true,
    allowNegative: true,
    options: {
      title: { type: 'string' },
      install: { type: 'boolean', default: true },
      git: { type: 'boolean', default: true },
      github: { type: 'boolean' },
      yes: { type: 'boolean', short: 'y', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  }));
} catch (error) {
  fail(`${error.message}\nRun with --help to see the options.`);
}

if (opts.help) {
  console.log(HELP);
  process.exit(0);
}

// Reject impossible combinations before asking anything.
if (opts.github && !opts.git) fail('--github needs git; drop --no-git.');
if (opts.github && !opts.install) {
  fail("--github needs npm install: CI can't run without the lockfile it creates.");
}
if (!opts.yes && !process.stdin.isTTY) {
  fail('No terminal to prompt in. Pass a directory and --yes to run non-interactively.');
}

/** Exit cleanly if the user pressed Ctrl+C at a prompt. */
function unwrap(value) {
  if (p.isCancel(value)) {
    p.cancel('Cancelled.');
    process.exit(1);
  }
  return value;
}

// --- Running commands ------------------------------------------------------

// The command currently running. Clack exits the process directly on Ctrl+C
// during a spinner, so the exit handler below stops the child too.
let activeChild;

function killTree(child) {
  if (process.platform === 'win32') {
    // npm runs through cmd.exe on Windows, so kill the whole tree.
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM'); // the child's process group (detached)
    } catch {
      // Already gone.
    }
  }
}

process.on('exit', () => {
  if (!activeChild) return;
  killTree(activeChild);
  process.stderr.write('\nCancelled.\n');
  process.exitCode = 130;
});

/**
 * Run a command, capturing output. Async (not spawnSync) so the event loop keeps
 * running and spinners animate while it works. npm is a .cmd shim on Windows,
 * which needs a shell; that path takes one command string (only fixed,
 * space-free args). `input`, if given, is written to the command's stdin.
 */
function run(cmd, args, cwd, input) {
  const child =
    cmd === 'npm' && process.platform === 'win32'
      ? spawn([cmd, ...args].join(' '), { cwd, shell: true })
      : spawn(cmd, args, { cwd, detached: process.platform !== 'win32' });
  activeChild = child;
  if (input !== undefined) child.stdin.end(input);
  let stdout = '';
  let output = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
    output += chunk;
  });
  child.stderr.on('data', (chunk) => (output += chunk));
  return new Promise((resolve) => {
    const done = (result) => {
      activeChild = undefined;
      resolve(result);
    };
    // 'error' fires instead of 'close' when the command doesn't exist.
    child.on('error', (error) => done({ ok: false, stdout: '', output: error.message }));
    child.on('close', (code) =>
      done({ ok: code === 0, stdout: stdout.trim(), output: output.trim() }),
    );
  });
}

const has = async (cmd, args = ['--version']) => (await run(cmd, args)).ok;

// --- Spinner output --------------------------------------------------------

/**
 * process.stdout, minus spinner flicker. Clack redraws each spinner frame as
 * separate writes ("go to column 1", "erase", then the frame), so terminals can
 * show the blank line in between. This holds cursor/erase escapes until the
 * text arrives, sends them as one write, and erases *after* drawing (old
 * frame overwritten in place, then leftovers cleared), so the line never blanks.
 * Write callbacks are always called: clack re-arms its Ctrl+C handling in them.
 */
function flickerFreeStdout() {
  const out = process.stdout;
  let held = '';
  const write = (chunk, encoding, callback) => {
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    const text = String(chunk);
    // Only cursor-move/erase escapes (e.g. ESC[1G, ESC[J, ESC[2A): hold them.
    if (/^(?:\x1b\[\d*[A-GJK])+$/.test(text)) {
      held += text;
      if (callback) process.nextTick(callback);
      return true;
    }
    let combined = held + text;
    if (held.includes('\x1b[J')) {
      // Clear each overwritten line's tail, then anything below the new text.
      combined = `${held.replaceAll('\x1b[J', '')}${text.replaceAll('\n', '\x1b[K\n')}\x1b[J`;
    }
    held = '';
    return out.write(combined, encoding, callback);
  };
  return new Proxy(out, {
    get(target, key) {
      if (key === 'write') return write;
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

const spinner = (options) => p.spinner({ output: flickerFreeStdout(), ...options });

// --- Validation and file edits ---------------------------------------------

function validateName(value) {
  const name = path.basename(path.resolve(value || '.'));
  if (!NAME_RE.test(name) || name.length > 214 || RESERVED_NAMES.has(name)) {
    return `"${name}" isn't a valid package name: use lowercase letters, digits, and - . _ (starting with a letter or digit)`;
  }
}

function validateTitle(value) {
  const title = (value ?? '').trim();
  if (!title) return "The title can't be empty.";
  if (title.length > 100) return 'Keep the title under 100 characters.';
  // The title goes into .env (quoted) and raw into index.html's <title>.
  if (/[\x00-\x1f\x7f"\\<>]/.test(title)) {
    return "The title can't contain quotes, backslashes, < or >, or control characters.";
  }
}

function titleFromName(name) {
  return name
    .split(/[-._]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Fail unless dir is missing or empty. A lone .git counts as empty (e.g. a
 * freshly cloned repo); returns whether one is there.
 */
function checkTarget(dir) {
  if (!fs.existsSync(dir)) return false;
  if (!fs.statSync(dir).isDirectory()) fail(`${dir} already exists and isn't a folder.`);
  const entries = fs.readdirSync(dir).filter((entry) => entry !== '.git');
  if (entries.length > 0) fail(`${dir} already exists and isn't empty.`);
  return fs.existsSync(path.join(dir, '.git'));
}

function editFile(file, transform) {
  fs.writeFileSync(file, transform(fs.readFileSync(file, 'utf8')));
}

// --- Prompts ---------------------------------------------------------------

p.intro('create-prettyrocket-app');

let dirArg = positionals[0];
if (!dirArg) {
  dirArg = opts.yes
    ? 'my-app'
    : unwrap(
        await p.text({
          message: 'Project directory',
          placeholder: 'my-app',
          defaultValue: 'my-app',
          // Clack validates before applying the default, so check what Enter will use.
          validate: (value) => validateName(value || 'my-app'),
        }),
      );
}
const nameError = validateName(dirArg);
if (nameError) fail(nameError);

const targetDir = path.resolve(dirArg);
const name = path.basename(targetDir);
// The user already set this repo up (e.g. cloned it), so commit into it but
// leave its remote alone: the GitHub step would try to create one.
const existingRepo = checkTarget(targetDir);
if (existingRepo && opts.github) {
  fail(`--github creates a new repo, but ${dirArg} is already a git repo; drop --github.`);
}

const defaultTitle = titleFromName(name);
let title = opts.title;
if (title !== undefined) {
  const titleError = validateTitle(title);
  if (titleError) fail(`--title: ${titleError}`);
} else if (opts.yes) {
  title = defaultTitle;
} else {
  title = unwrap(
    await p.text({
      message: 'App title',
      placeholder: defaultTitle,
      defaultValue: defaultTitle,
      validate: (value) => validateTitle(value || defaultTitle),
    }),
  );
}
title = title.trim();

// GitHub: explicit flag wins; --yes means "no"; otherwise ask (if gh can work).
let github = existingRepo ? false : opts.github;
const ghReady =
  !existingRepo &&
  opts.git &&
  opts.install &&
  github !== false &&
  (await has('gh')) &&
  // Only github.com's active account matters; other hosts' logins can't break this.
  (await has('gh', ['auth', 'status', '--hostname', 'github.com', '--active']));
if (github && !ghReady) {
  fail('--github needs the GitHub CLI logged in to github.com (run `gh auth login`).');
}
if (github === undefined) {
  github =
    ghReady &&
    !opts.yes &&
    unwrap(
      await p.confirm({
        message: `Create a public GitHub repo "${name}" and enable GitHub Pages?`,
        initialValue: false,
      }),
    );
}

// --- Scaffold --------------------------------------------------------------

const problems = [];

fs.cpSync(TEMPLATE_DIR, targetDir, {
  recursive: true,
  // Local-only files (e.g. .env.local) never ship, even from a repo checkout.
  filter: (src) => !SKIP.has(path.basename(src)) && !src.endsWith('.local'),
});
// npm strips .gitignore from published packages, so the template ships _gitignore.
fs.renameSync(path.join(targetDir, '_gitignore'), path.join(targetDir, '.gitignore'));

editFile(path.join(targetDir, 'package.json'), (text) => {
  const pkg = JSON.parse(text);
  pkg.name = name;
  return `${JSON.stringify(pkg, null, 2)}\n`;
});
// Double-quoted, with `$` escaped so Vite's env expansion leaves it alone.
// Function replacers so `$&` etc. in the title are not replacement patterns.
editFile(path.join(targetDir, '.env'), (text) =>
  text.replace(/^VITE_APP_TITLE=.*$/m, () => `VITE_APP_TITLE="${title.replaceAll('$', '\\$')}"`),
);
editFile(path.join(targetDir, 'README.md'), (text) => text.replace(/^# .*$/m, () => `# ${title}`));

p.log.success(`Created ${name} in ${targetDir}`);

// --- Install ---------------------------------------------------------------

let installed = false;
if (opts.install) {
  // Only versions published at least COOLDOWN_DAYS ago, so a just-published bad
  // release can't land in a new app before anyone notices it.
  const before = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  // The timer shows elapsed seconds, so a slow install still visibly progresses.
  const s = spinner({ indicator: 'timer' });
  s.start('Installing dependencies (this can take a minute)');
  const install = ['install', '--no-fund', '--no-audit'];
  let result = await run('npm', [...install, `--before=${before}`], targetDir);
  // ETARGET: the template requires a version younger than the cooldown (e.g.
  // right after a manual bump). Installing anyway beats a broken app, but say so.
  const cooldownSkipped = !result.ok && result.output.includes('ETARGET');
  if (cooldownSkipped) {
    s.message('Some required versions are newer than the cooldown; installing anyway');
    result = await run('npm', install, targetDir);
  }
  if (result.ok) {
    installed = true;
    s.stop('Installed dependencies');
    if (cooldownSkipped) {
      // The smoke workflow looks for this exact phrase.
      p.log.warn(
        `Installed without the ${COOLDOWN_DAYS}-day cooldown: the template requires versions published in the last ${COOLDOWN_DAYS} days.`,
      );
    }
  } else {
    s.error('npm install failed');
    p.log.error(result.output);
    problems.push('npm install failed');
  }
}

// --- Git -------------------------------------------------------------------

let committed = false;
if (opts.git) {
  if (!(await has('git'))) {
    p.log.warn('git not found; skipping git init.');
    problems.push('git not found');
  } else {
    const s = spinner();
    s.start(existingRepo ? 'Committing to the existing git repo' : 'Initializing git repo');
    const steps = [
      ...(existingRepo ? [] : [['init', '-b', 'main']]),
      ['add', '-A'],
      ['commit', '-m', 'Initial scaffold from create-prettyrocket-app'],
    ];
    let failed;
    for (const args of steps) {
      const result = await run('git', args, targetDir);
      if (!result.ok) {
        failed = result;
        break;
      }
    }
    if (failed) {
      s.error('git setup incomplete');
      p.log.warn(failed.output);
      problems.push('git setup incomplete');
    } else {
      committed = true;
      s.stop(existingRepo ? 'Made the first commit' : 'Initialized git repo with first commit');
    }
  }
}

// --- GitHub ----------------------------------------------------------------

let pagesUrl;
if (github && !(committed && installed)) {
  const missing = installed ? 'the initial commit' : 'the lockfile from npm install';
  p.log.warn(`Skipping GitHub: ${missing} is missing, and CI needs it.`);
  problems.push('GitHub step skipped');
} else if (github) {
  const s = spinner();
  s.start('Creating GitHub repo');
  // Create without pushing: Pages must be enabled before the first workflow run.
  const created = await run(
    'gh',
    ['repo', 'create', name, '--public', '--source', '.', '--remote', 'origin'],
    targetDir,
  );
  if (!created.ok) {
    s.error('Could not create GitHub repo');
    p.log.error(created.output);
    problems.push('GitHub repo not created');
  } else {
    const repo = (
      await run(
        'gh',
        ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'],
        targetDir,
      )
    ).stdout;
    const warnings = [];
    const api = async (label, args, input) => {
      const result = await run('gh', ['api', ...args], targetDir, input);
      if (!result.ok) warnings.push(`${label}: ${result.output}`);
      return result;
    };

    s.message('Enabling GitHub Pages and security updates');
    const pages = await api('Enable Pages', [
      '-X',
      'POST',
      `repos/${repo}/pages`,
      '-f',
      'build_type=workflow',
      '-q',
      '.html_url',
    ]);
    await api('Enable vulnerability alerts', ['-X', 'PUT', `repos/${repo}/vulnerability-alerts`]);
    await api('Enable Dependabot security updates', [
      '-X',
      'PUT',
      `repos/${repo}/automated-security-fixes`,
    ]);

    s.message('Pushing to GitHub');
    const pushed = await run('git', ['push', '-u', 'origin', 'main'], targetDir);
    if (!pushed.ok) warnings.push(`git push: ${pushed.output}`);

    // After the push: the first push creates main, which the rulesets target.
    s.message('Protecting the main branch');
    for (const ruleset of RULESETS) {
      await api(
        `Add ruleset "${ruleset.name}"`,
        ['-X', 'POST', `repos/${repo}/rulesets`, '--input', '-'],
        JSON.stringify(ruleset),
      );
    }

    if (warnings.length) {
      s.error(`Created https://github.com/${repo}, but some steps failed`);
      for (const warning of warnings) p.log.warn(warning);
      problems.push('GitHub setup incomplete');
    } else {
      s.stop(`Created https://github.com/${repo}`);
      // GitHub reports the real URL (e.g. root for <owner>.github.io repos).
      pagesUrl = pages.stdout;
    }
  }
}

// --- Done ------------------------------------------------------------------

const relPath = path.relative(process.cwd(), targetDir);
const next = [`cd ${relPath.startsWith('..') ? targetDir : relPath || '.'}`];
if (!installed) next.push('npm install');
next.push('npm run dev');
p.note(next.join('\n'), 'Next steps');
if (pagesUrl) p.log.info(`Deploying to ${pagesUrl} (see the Actions tab)`);
if (problems.length) {
  process.exitCode = 1;
  p.outro(`Done, with problems: ${problems.join('; ')}.`);
} else {
  p.outro('Happy building!');
}
