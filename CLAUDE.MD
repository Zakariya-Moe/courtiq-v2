# CourtIQ — Product & Engineering Reference

This document is the source of truth for every development session.
Read it before writing any code. It does not drift — changes require explicit product decisions.

---

## What We Are Building

**Not a stats app.**

CourtIQ is the intelligence layer on top of basketball data.
We don't show more stats — we show what the stats mean.

CourtIQ is a real-time basketball intelligence platform.
The goal is to make raw data instantly understandable.

**Core principle:**

```
Performance × Context = Meaning
```

Example:
- 30 points in a blowout ≠ 30 points in a tight game
- Same stat. Different meaning. We surface that difference.

---

## Product Philosophy

**Only surface what you can defend from the data.**

This means:
- Suppress outputs below minimum sample thresholds
- Never imply a pattern from noise
- If a claim requires data we don't have → don't make it
- If a number restates something already visible → remove it

The product builds trust by being accurate, not comprehensive.

---

## Design References

| Reference | What we take from it |
|-----------|---------------------|
| Robinhood | Dominant numbers, instant clarity, scan-first |
| Bloomberg | Dense but purposeful — everything has meaning |
| Notion | Clean hierarchy, structure, breathing room |
| ESPN | Real-time utility, familiarity |

We are not copying them visually. We are combining what they do well.

---

## Surface-Specific Design Philosophy

Different screens have different jobs. They should feel different.

### Hot Page → Robinhood model
**One question:** Who matters right now?
**One number per row:** Context-weighted average (ctxAvgPts)
**Principle:** Fast scan, minimal layers, rank is the answer

### Player Profile → Bloomberg model
**One question:** Is this player worth a pick right now?
**Answer:** Form verdict (delta + trend direction)
**Principle:** More data than hot page, but all structured and purposeful
**PPG is what happened. The verdict is what it means. The verdict is always the answer.**

### Game Detail
**One question:** What happened in this game and who drove it?
**Answer:** Verdict + one-line explanation + standout player + line score
**Principle:** Three parts, one narrative — nothing competes

### Games List
**One question:** Which games matter right now?
**Answer:** Score + story label (WIRE / TIGHT / SOLID / DOMINANT)
**Principle:** Scan surface — context label adds meaning, doesn't explain

---

## Desktop Layout Spec

Mobile is the primary experience. Desktop is the same system with more space —
not a different product, not a different hierarchy.

**Breakpoint:** `≥ 720px` (already the threshold in `globals.css`)

### Core principle

On desktop, the user can hold two things in view simultaneously.
The layout exposes what mobile hides behind scrolling:

```
LEFT COLUMN  = decision layer   (what should I conclude?)
RIGHT COLUMN = evidence layer   (why is that the conclusion?)
```

Same hierarchy as mobile. Verdict still leads. Detail still follows.
The difference: both are visible at the same time.

### Player Profile — two-column above 720px

```
┌─────────────────────┬──────────────────────┐
│  LEFT (decision)    │  RIGHT (evidence)     │
│                     │                       │
│  Form verdict       │  Game log             │
│  Identity row       │    with context tags  │
│  Stat grid          │                       │
│  Shooting splits    │                       │
│  Toggle             │                       │
└─────────────────────┴──────────────────────┘
         Performance chart (full-width below)
```

- Left column: `~44%` width — the answer
- Right column: `~56%` width — the evidence
- Chart: full-width below both columns, `marginTop: 24px`
- Left and right columns align at the top; right column scrolls independently if game log is long

**Rationale:** A user evaluating a player sees the verdict and validates it
against the game log simultaneously — no scrolling between the conclusion
and its supporting evidence.

### Game Detail — two-column above 720px

```
┌─────────────────────┬──────────────────────┐
│  LEFT (decision)    │  RIGHT (evidence)     │
│                     │                       │
│  Score hero         │  Box score            │
│  Game intel card    │    sorted by GmSc     │
│    verdict          │    with team filter   │
│    explanation      │                       │
│    standout         │                       │
└─────────────────────┴──────────────────────┘
```

- Left column: `~44%` width
- Right column: `~56%` width
- No full-width section below — the two columns contain the full page

**Rationale:** A user reading the standout player can immediately find
that player in the box score without losing context.

### Games List — single column, wider proportions

No two-column layout. Wider screen = more breathing room, not different structure.

- Cards get `maxWidth: 680px`, centered
- Side panels (`#050505`) fill the void — already implemented
- Signal feed stays below the filter tabs in the single column

**Rationale:** Scan surface. The job is to read multiple cards quickly.
A two-column layout would split attention across rows rather than down a list.

### Hot Page — single column, wider proportions

Same as games list. No two-column.

- Leader card gets more horizontal space for the sparkline
- Player rows get more breathing room
- No structural change

### What does NOT change on desktop

- Information hierarchy (verdict always leads)
- Color system (same three states)
- Component padding (20px on cards)
- Type scale (same four levels)
- Motion system (same Framer Motion animations)

Desktop is a layout change, not a design change.

### Implementation approach

Use CSS Grid at the page level, not inside components.
Each page wrapper checks viewport width and applies a two-column grid class.
Components themselves stay unchanged — they just sit in the correct column.

```tsx
// Conceptual — actual implementation in page files
<div className="md:grid md:grid-cols-[44fr_56fr] md:gap-6">
  <div>{/* decision layer */}</div>
  <div>{/* evidence layer */}</div>
</div>
```

The `720px` breakpoint maps to Tailwind's `md:` prefix (`min-width: 768px`).
Use `md:` for all two-column activations.

---

## Core Design Rules (Non-Negotiable)

**Three levels of hierarchy — nested, never competing:**

1. **One screen = one question** — the screen answers exactly one thing
2. **One card = one dominant insight** — each card has one primary element that reads first
3. **One primary number per cell** — within a stat cell, one number leads

This nesting matters: the form verdict panel is the screen-level dominant element on the player profile. The stat grid is a card with five cells, each with one primary number. Both follow the rule at their level. When in doubt, ask: what is the user supposed to read first at this level?

**Additional rules (non-negotiable):**

4. **Color = meaning, not decoration**
5. **If it restates → remove it**
6. **Trust the number** — don't add a sentence to explain a number that explains itself
7. **No redundant information** — if two elements answer the same question, one goes

If a feature doesn't strengthen Performance × Context = Meaning, don't build it.

UI should be obvious in under 3 seconds.

---

## Color System

Three states. These exact CSS values. Nothing else for verdict/context.

| State | Meaning | CSS Color | Background | Border |
|-------|---------|-----------|------------|--------|
| `tension` | Close game, outcome uncertain | `var(--green)` = `#00C805` | `rgba(0,200,5,0.09)` | `rgba(0,200,5,0.22)` |
| `notable` | Unusual — high-scoring, pulling away live | `var(--amber)` = `#FF9F0A` | `rgba(255,159,10,0.09)` | `rgba(255,159,10,0.22)` |
| `settled` | Decided, lower urgency | `rgba(255,255,255,0.35)` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.08)` |

**Color grammar:**
- Green = tension / meaningful / worth watching
- Amber = notable / unusual / something happened
- Neutral = settled / decided / for the record

This system runs through: game cards, game intel card, player profile form verdict, hot page context split, game log context tags. **The user learns it once and reads it everywhere.**

---

## Type Scale (Locked)

Four levels. Use exactly these. Do not approximate.

| Level | Size | Font | Use |
|-------|------|------|-----|
| Hero | 40px+ | Syne (`var(--font-display)`) | Scores, verdict delta, primary numbers |
| Primary | 20–22px | Syne | Card titles, key stats (PTS/REB/AST) |
| Secondary | 13–15px | DM Sans | Names, labels, supporting data |
| Caption | 9–11px | DM Sans | Metadata, timestamps, units, tags |

**Letter spacing by level:**
- Hero: `-0.05em` to `-0.07em`
- Primary: `-0.025em` to `-0.04em`
- Secondary: `-0.01em` to `-0.02em`
- Caption: `0.04em` to `0.07em` (uppercase labels)

---

## Spacing System (Locked)

Base unit: **4px**. All spacing must be a multiple.

| Token | Value | Use |
|-------|-------|-----|
| `space-2` | 8px | Gap between inline elements |
| `space-3` | 12px | Tight internal padding, small gaps |
| `space-4` | 16px | Standard card padding, section gaps |
| `space-5` | 20px | Primary card padding |
| `space-6` | 24px | Section separation |
| `space-8` | 32px | Major section breaks |

**Card padding standard: 20px** on mobile.
Do not mix 16, 18, 20, 22 arbitrarily. Pick 20 and use it.

---

## Sample Thresholds (Locked — No Guessing)

| Output | Minimum | Rationale |
|--------|---------|-----------|
| Signals | 2 completed games | One game could be an outlier; two establishes a direction |
| Context fraction ("3/5 tight") | 3 final games with scores | Below 3, a single game dominates the fraction — "1/1 tight" implies nothing |
| Pattern line (tension vs settled) | 5 final games with scores | A 3-game split (e.g. 2 tight / 1 settled) isn't a pattern, it's noise |
| Context weighting | Always applied | Weights are always computed; interpretation (clutchLabel etc.) suppressed below 3 |
| Form verdict panel | 2 games | One game has no baseline to compare against |
| Clutch index | 2 games in each bucket | Single-game averages in a bucket are not averages, they're data points |

**Rule:** If data is weak → show the data without interpretation. Never imply a pattern from insufficient sample.

**The distinction that matters:** showing `"24.8 pts"` is showing data. Saying `"elevates in close games"` is interpretation. When sample is thin, keep the number, drop the claim.

---

## Analytics Library Ownership

Logic lives in `/lib/analytics/`. Components call lib functions — they do not compute intelligence inline.

| File | Owns | Exports |
|------|------|---------|
| `game-verdict.ts` | Game state classification | `getGameVerdict`, `getVerdictContext`, `VERDICT_COLORS`, `VerdictState` |
| `player-context.ts` | Cross-game patterns | `computePlayerContext`, `getPatternSummary`, `PlayerContext`, `ContextBucket` |
| `signals.ts` | Current form signals | `generatePlayerSignals`, `getPrimarySignal`, `Signal`, `SignalType`, `GameEntry` |
| `signal-diff.ts` | Signal comparison | `compareSignals`, `isHighPriority` |
| `signal-events.ts` | In-session signal feed | `recordSignalEvent`, `getHighPriorityEvents` |
| `freshness.ts` | Data staleness | `computeFreshness`, `freshnessColors` |

**Dependency direction:** `signals.ts` can accept context-weighted input from `player-context.ts`.
`game-verdict.ts` has no dependencies on other analytics files.
Components import from lib — lib does not import from components.

---

## Context Weighting System

Applied in `hot-players` API and player profile. Weights per game context:

| Context | Weight | Rationale |
|---------|--------|-----------|
| Tension (Wire/Tight) | `1.0` | Full weight — most meaningful |
| Notable (High-scoring) | `0.7` | Partial — unusual context |
| Settled (Solid/Comfort/Blowout) | `0.5` | Down-weighted — padding risk |
| In-progress / unclassified | `1.0` | Neutral — no penalty for unknown |

This feeds into: hot page ranking (`ctxAvgPts`), signal engine (`contextWeightedGames`), player context (`computePlayerContext`).

---

## API Behaviour

### `/api/cron`
- Runs every 15 minutes (`*/15 * * * *` in vercel.json)
- Fast-path early exit when no active games — ~100ms, no external calls
- Requires `BALLDONTLIE_API_KEY` env var
- Auth: accepts `Authorization: Bearer <CRON_SECRET>` OR Vercel's `x-vercel-signature`

### `/api/hot-players`
- Returns `ctxAvgPts`, `ctxAvgReb`, `ctxAvgAst` (context-weighted) alongside raw `avgPts` etc.
- `showRawPts: true` when `|ctxAvgPts - avgPts| >= 1.0 AND diff >= 5% of raw`
- Sorted by `ctxAvgPts` descending
- 14-day window, minimum 2 games to appear

### `/api/players/[id]`
- Game log includes `homeScore`, `awayScore`, `gameStatus` for context tags
- `teamAbbr` from `stats[0].team_abbr` (not loop variable)

---

## What Not To Build (Yet)

| Feature | Why not yet |
|---------|-------------|
| PropEdge layer | Needs sportsbook prop line data — not available |
| Largest lead | Requires play-by-play — not in current schema |
| Comeback narrative | Requires quarter-by-quarter scoring |
| Injury context | Requires separate data source |
| Push notifications | Phase 17 — after Phase 16 (service worker) |

Do not build UI for these. Do not fake them with approximations.

---

## Information Hierarchy Per Screen

### Player Profile
```
1. Form verdict panel          ← THE ANSWER (delta % vs baseline)
2. Identity row + signal badge ← who + current state (one badge only)
3. Toggle + stat grid          ← supporting evidence (season or recent)
4. Shooting splits             ← secondary — smaller visual weight
5. Performance chart           ← trend over time
6. Game log                    ← evidence, with context tags
   └── Pattern line            ← only when ≥5 games, no interpretation suffix
```

### Game Detail
```
1. Score hero                  ← what happened
2. Game intel card             ← WHY it happened (verdict + explanation + standout)
3. Box score                   ← evidence, sorted by GameScore
```

### Hot Page (scan surface)
```
1. Leader card                 ← top performer with sparkline
2. Ranked list                 ← rank + ctxAvgPts + one contextual signal OR fraction
   Signal badge XOR context fraction — never both
```

### Games List
```
1. Score (dominant)            ← primary read
2. Story label                 ← subtle context (WIRE / TIGHT etc.)
3. Momentum bar                ← visual ratio
```

---

## Motion Principles

Using Framer Motion. Intentional, not decorative.

**Principles (what matters):**
- Motion confirms an interaction happened — card press, page transition, stat load
- Motion reveals structure — bars grow, verdicts slide in, lists stagger
- Motion never decorates — don't animate something just because you can
- Weight matches importance — hero numbers spring, secondary elements fade

**What to animate and how:**
- Page transitions: fade + subtle upward movement. Easing should feel snappy, not floaty.
- Card press: slight scale-down (≈0.975). Immediate feedback.
- List entrance: stagger, first load only. Not on filter changes or re-renders.
- Hero numbers (scores, verdict delta): spring. Everything else: duration + easing.
- Structural reveals (accent bars, chart bars): grow from origin point.

**Do not animate:** every number, every badge, routine state changes, scroll position, hover states on mobile.

Exact spring values (stiffness, damping) live in the components, not here. If an animation still feels right after you change the values, the principle is being followed.

---

## Empty and Error States

The "only surface what you can defend" principle applies when data is absent, not just when it's thin.

**Three distinct states — handle each differently:**

### No data yet (scheduled game, new player, pre-tip-off)
Show structure, suppress interpretation. The screen should still answer its question — just with nothing to say yet.
- Score hero without the intel card (game hasn't happened)
- Player identity row without the verdict panel (no game log yet)
- The card shape stays. The interpretation layer disappears entirely.
- Never show a placeholder verdict or fake signal.

### Data loading (SWR fetching, skeleton state)
Show a skeleton that matches the real layout exactly — same card proportions, same section structure. No spinners floating in the middle of a card. No "Loading..." text inside a card that will have a number.

The skeleton is a promise about the layout. It should never lie — if the real content has a two-row structure, the skeleton has two rows.

### Data absent or API error
Show a minimal message inside the card shape it would have occupied. Same padding, same border radius as the card it replaces. Never a full-page error for a partial data failure.

```
// Correct — error stays in its card shape
<div style={{ background: 'var(--s1)', borderRadius: 18, border: '1px solid var(--b1)', padding: '36px 20px', textAlign: 'center' }}>
  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Stats loading...</p>
</div>

// Wrong — never replace the whole page for a partial failure
return <div>Error loading player data</div>
```

### Desktop edge case — empty right column
When the right column has no content (e.g. game with no box score yet, player with no game log), **render single column regardless of breakpoint**. An empty right column on desktop looks broken. The two-column grid should only activate when both columns have content to show.

```tsx
// Gate the grid on content availability
const showTwoColumn = gameLog && gameLog.length > 0;

<div className={showTwoColumn ? 'md:grid md:gap-6' : ''} style={...}>
```

### What never changes in any state
- Card padding (20px)
- Border radius
- Background color
- The screen's primary question — even an empty screen is still asking the same question, just unable to answer it yet

---

## Common Mistakes to Avoid

1. **Restating a number in text** — if the delta is `+22%`, don't add "outperforming baseline"
2. **Competing interpretation layers** — pick the strongest one, remove the rest
3. **Inline intelligence computation** — belongs in `/lib/analytics/`, not inside components
4. **Inconsistent padding** — use 20px card padding, full stop
5. **Signal badge + context fraction together** — they answer the same question; pick one
6. **Showing interpretation below sample threshold** — show data, suppress interpretation
7. **Adding features before data exists** — no PropEdge without prop lines

---

## Session Checklist

**Before writing any code:**

- [ ] Read this file
- [ ] Identify which surface is being modified
- [ ] State the one question that screen answers
- [ ] Confirm the change is presentation, not logic (or confirm it belongs in lib)
- [ ] Check sample thresholds apply correctly
- [ ] Verify spacing uses 4px multiples
- [ ] Verify color is from the three-state system (if verdict/context related)

**Before calling anything shipped (definition of done):**

- [ ] The screen answers its one question without scrolling on a 390px screen
- [ ] Every color used for verdict/context comes from the three-state system
- [ ] The primary element on the screen has the highest visual weight
- [ ] No element restates something already visible elsewhere on the screen
- [ ] Empty and loading states follow the pattern in the Empty States section
- [ ] On desktop (≥768px), the two-column grid only activates when both columns have content
- [ ] Card padding is 20px — no 16px, 18px, or 22px except on intentional exceptions (row padding, empty state vertical padding)
- [ ] Intelligence computation happens in `/lib/analytics/`, not inline in the component
