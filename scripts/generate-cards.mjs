// Generates self-hosted profile cards (no third-party image service, so they never break).
// Runs daily in GitHub Actions with the built-in GITHUB_TOKEN. Output: assets/*.svg (dark + light).
import { mkdir, readFile, writeFile } from "node:fs/promises";

const USER = process.env.GH_USER || "hanzalasqb";
const TOKEN = process.env.GITHUB_TOKEN;
const headers = { "User-Agent": "profile-cards", Accept: "application/vnd.github+json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) };
const CONFIG_LANGS = new Set(["Dockerfile", "Makefile", "Procfile"]);
const ICONS = {"repo": "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z", "rocket": "M14.064 0h.186C15.216 0 16 .784 16 1.75v.186a8.752 8.752 0 0 1-2.564 6.186l-.458.459c-.314.314-.641.616-.979.904v3.207c0 .608-.315 1.172-.833 1.49l-2.774 1.707a.749.749 0 0 1-1.11-.418l-.954-3.102a1.214 1.214 0 0 1-.145-.125L3.754 9.816a1.218 1.218 0 0 1-.124-.145L.528 8.717a.749.749 0 0 1-.418-1.11l1.71-2.774A1.748 1.748 0 0 1 3.31 4h3.204c.288-.338.59-.665.904-.979l.459-.458A8.749 8.749 0 0 1 14.064 0ZM8.938 3.623h-.002l-.458.458c-.76.76-1.437 1.598-2.02 2.5l-1.5 2.317 2.143 2.143 2.317-1.5c.902-.583 1.74-1.26 2.499-2.02l.459-.458a7.25 7.25 0 0 0 2.123-5.127V1.75a.25.25 0 0 0-.25-.25h-.186a7.249 7.249 0 0 0-5.125 2.123ZM3.56 14.56c-.732.732-2.334 1.045-3.005 1.148a.234.234 0 0 1-.201-.064.234.234 0 0 1-.064-.201c.103-.671.416-2.273 1.15-3.003a1.502 1.502 0 1 1 2.12 2.12Zm6.94-3.935c-.088.06-.177.118-.266.175l-2.35 1.521.548 1.783 1.949-1.2a.25.25 0 0 0 .119-.213ZM3.678 8.116 5.2 5.766c.058-.09.117-.178.176-.266H3.309a.25.25 0 0 0-.213.119l-1.2 1.95ZM12 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z", "workflow": "M0 1.75C0 .784.784 0 1.75 0h3.5C6.216 0 7 .784 7 1.75v3.5A1.75 1.75 0 0 1 5.25 7H4v4a1 1 0 0 0 1 1h4v-1.25C9 9.784 9.784 9 10.75 9h3.5c.966 0 1.75.784 1.75 1.75v3.5A1.75 1.75 0 0 1 14.25 16h-3.5A1.75 1.75 0 0 1 9 14.25v-.75H5A2.5 2.5 0 0 1 2.5 11V7h-.75A1.75 1.75 0 0 1 0 5.25Zm1.75-.25a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25Zm9 9a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25Z", "code": "m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z", "git-commit": "M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"};
const COLORS = { TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", "C++": "#f34b7d", C: "#a8b9cc", CSS: "#663399", HTML: "#e34c26", Shell: "#89e051", EJS: "#a91e50", Typst: "#239dad", Java: "#b07219", Go: "#00ADD8", Rust: "#dea584", SCSS: "#c6538c", Vue: "#41b883", "Jupyter Notebook": "#DA5B0B", PHP: "#4F5D95" };
const PALETTE = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];

async function rest(path) {
  const r = await fetch(`https://api.github.com${path}`, { headers });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
  return r.json();
}

async function contributions() {
  if (TOKEN) {
    const r = await fetch("https://api.github.com/graphql", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ query: `query($l:String!){user(login:$l){contributionsCollection{totalCommitContributions contributionCalendar{totalContributions weeks{contributionDays{contributionCount}}}}}}`, variables: { l: USER } }) });
    const j = await r.json().catch(() => ({}));
    const c = j?.data?.user?.contributionsCollection;
    if (c) {
      const days = c.contributionCalendar.weeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount));
      return { total: c.contributionCalendar.totalContributions, commits: c.totalCommitContributions, activeDays: days.filter((n) => n > 0).length };
    }
    console.warn("GraphQL unavailable, falling back to the public contribution calendar");
  }
  const html = await (await fetch(`https://github.com/users/${USER}/contributions`, { headers: { "User-Agent": "profile-cards" } })).text();
  const total = Number((html.match(/([\d,]+)\s+contributions?\s+in the last year/) || [, "0"])[1].replace(/,/g, ""));
  const activeDays = [...html.matchAll(/data-level="([1-4])"/g)].length;
  return { total, commits: null, activeDays };
}

async function collect() {
  if (process.env.DATA_FILE) return JSON.parse(await readFile(process.env.DATA_FILE, "utf8"));
  const repos = (await rest(`/users/${USER}/repos?per_page=100&type=owner`)).filter((r) => !r.fork && !r.archived && r.name !== USER);
  const out = [];
  for (const r of repos) {
    const [langs, wf] = await Promise.all([rest(`/repos/${USER}/${r.name}/languages`), rest(`/repos/${USER}/${r.name}/actions/workflows`).catch(() => ({ total_count: 0 }))]);
    out.push({ name: r.name, homepage: r.homepage || "", langs, workflows: wf.total_count || 0 });
  }
  return { repos: out, contrib: await contributions() };
}

const THEMES = {
  dark: { bg: "#0d1117", border: "#30363d", title: "#e6edf3", sub: "#8b949e", text: "#c9d1d9", value: "#f0f6fc", icon: "#a78bfa", track: "#21262d", g1: "#8b5cf6", g2: "#06b6d4" },
  light: { bg: "#ffffff", border: "#d0d7de", title: "#1f2328", sub: "#656d76", text: "#424a53", value: "#1f2328", icon: "#7c3aed", track: "#eaeef2", g1: "#7c3aed", g2: "#0891b2" },
};
const FONT = `font-family="'Segoe UI', Ubuntu, 'Helvetica Neue', Helvetica, Arial, sans-serif"`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const num = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));

function card(t, w, h, title, subtitle, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.g1}"/><stop offset="1" stop-color="${t.g2}"/></linearGradient>
<clipPath id="card"><rect width="${w}" height="${h}" rx="12"/></clipPath>
</defs>
<style>
.in{opacity:0;animation:in .6s ease-out forwards}
@keyframes in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
.ring{animation:ring 1.4s ease-out forwards}
@keyframes ring{from{stroke-dashoffset:var(--c)}to{stroke-dashoffset:0}}
.bar{animation:bar 1s ease-out forwards;transform-origin:left;transform:scaleX(0)}
@keyframes bar{to{transform:scaleX(1)}}
</style>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="${t.bg}" stroke="${t.border}"/>
<rect width="${w}" height="4" fill="url(#g)" clip-path="url(#card)"/>
<text x="25" y="40" ${FONT} font-size="18" font-weight="600" fill="${t.title}">${esc(title)}</text>
<text x="25" y="60" ${FONT} font-size="12" fill="${t.sub}">${esc(subtitle)}</text>
${body}
</svg>
`;
}

function overview(t, d) {
  const rows = [
    ["repo", "Public projects", d.projects],
    ["rocket", "Live demos", d.demos],
    ["workflow", "Projects with CI/CD", d.ci],
    ["code", "Languages used", d.languages],
    ["git-commit", "Commits (past year)", d.commits ?? d.activeDays],
  ];
  if (d.commits == null) rows[4][1] = "Active days (past year)";
  const body = rows.map(([icon, label, value], i) => {
    const y = 92 + i * 26;
    return `<g class="in" style="animation-delay:${150 + i * 120}ms">
<svg x="25" y="${y - 13}" width="16" height="16" viewBox="0 0 16 16"><path fill="${t.icon}" d="${ICONS[icon]}"/></svg>
<text x="52" y="${y}" ${FONT} font-size="14" fill="${t.text}">${label}</text>
<text x="275" y="${y}" ${FONT} font-size="14" font-weight="700" fill="${t.value}" text-anchor="end">${num(value)}</text>
</g>`;
  }).join("\n");
  const r = 46, c = +(2 * Math.PI * r).toFixed(1), cx = 385, cy = 130;
  const ring = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.track}" stroke-width="9"/>
<circle class="ring" style="--c:${c}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 ${cx} ${cy})"/>
<text x="${cx}" y="${cy + 2}" ${FONT} font-size="26" font-weight="700" fill="${t.value}" text-anchor="middle">${num(d.total)}</text>
<text x="${cx}" y="${cy + 20}" ${FONT} font-size="11" fill="${t.sub}" text-anchor="middle">contributions</text>
<text x="${cx}" y="${cy + r + 30}" ${FONT} font-size="12" fill="${t.sub}" text-anchor="middle">in the past year</text>`;
  return card(t, 480, 230, "GitHub at a glance", `@${USER} · updated automatically every day`, body + "\n" + ring);
}

function languages(t, d) {
  const top = d.langs.slice(0, 8);
  const W = 430;
  let x = 25;
  const segs = top.map((l) => { const w = (l.pct / 100) * W; const s = `<rect x="${x.toFixed(1)}" y="78" width="${Math.max(w, 2).toFixed(1)}" height="10" fill="${l.color}"/>`; x += w; return s; }).join("");
  const bar = `<clipPath id="bar"><rect x="25" y="78" width="${W}" height="10" rx="5"/></clipPath><g class="bar" clip-path="url(#bar)"><rect x="25" y="78" width="${W}" height="10" fill="${t.track}"/>${segs}</g>`;
  const legend = top.map((l, i) => {
    const col = i % 2, row = Math.floor(i / 2), lx = 25 + col * 220, ly = 122 + row * 27;
    return `<g class="in" style="animation-delay:${200 + i * 90}ms"><circle cx="${lx + 6}" cy="${ly - 5}" r="6" fill="${l.color}"/><text x="${lx + 20}" y="${ly}" ${FONT} font-size="14" fill="${t.text}">${esc(l.name)} <tspan fill="${t.sub}" font-size="13">${l.pct.toFixed(1)}%</tspan></text></g>`;
  }).join("\n");
  return card(t, 480, 230, "Most used languages", `by code size across ${d.projects} public projects`, bar + "\n" + legend);
}

function wave(baseline, amp, period, width, height) {
  let p = `M0 ${baseline}`;
  for (let x = 0, up = true; x < width; x += period / 2, up = !up) p += ` Q${x + period / 4} ${baseline + (up ? -amp : amp)} ${x + period / 2} ${baseline}`;
  return `${p} L${width} ${height} L0 ${height} Z`;
}

function footer(t) {
  const W = 1200, H = 220;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Let's build something intelligent together">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.g1}"/><stop offset="1" stop-color="${t.g2}"/></linearGradient></defs>
<style>
.w1{animation:w 16s linear infinite}.w2{animation:w 11s linear infinite reverse}
@keyframes w{from{transform:translateX(0)}to{transform:translateX(-600px)}}
.t{opacity:0;animation:in 1s ease-out .2s forwards}@keyframes in{to{opacity:1}}
</style>
<g class="t">
<text x="600" y="78" ${FONT} font-size="34" font-weight="700" fill="${t.title}" text-anchor="middle">Let's build something intelligent together</text>
<text x="600" y="114" ${FONT} font-size="18" fill="${t.sub}" text-anchor="middle">Full Stack AI Developer · Open to remote and international roles</text>
</g>
<path class="w1" d="${wave(168, 16, 600, 2400, H)}" fill="url(#g)" opacity="0.35"/>
<path class="w2" d="${wave(184, 12, 600, 2400, H)}" fill="url(#g)" opacity="0.85"/>
</svg>
`;
}

const data = await collect();
const totals = {};
for (const r of data.repos) for (const [lang, bytes] of Object.entries(r.langs)) if (!CONFIG_LANGS.has(lang)) totals[lang] = (totals[lang] || 0) + bytes;
const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
const langs = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([name, bytes], i) => ({ name, pct: (bytes / sum) * 100, color: COLORS[name] ?? PALETTE[i % PALETTE.length] }));
const d = {
  projects: data.repos.length,
  demos: data.repos.filter((r) => r.homepage).length,
  ci: data.repos.filter((r) => r.workflows > 0).length,
  languages: langs.length,
  langs,
  ...data.contrib,
};
await mkdir("assets", { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  await writeFile(`assets/overview-${name}.svg`, overview(t, d));
  await writeFile(`assets/languages-${name}.svg`, languages(t, d));
  await writeFile(`assets/footer-${name}.svg`, footer(t));
}
console.log(`cards written: ${d.projects} projects, ${d.demos} demos, ${d.ci} with CI, ${d.languages} languages, ${d.total} contributions`);
