# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-10-07
- Primary product surfaces: goals, projects, four-level planning overview.
- Evidence reviewed: src/app/goals/page.tsx, src/app/projects/page.tsx, src/app/strategy/page.tsx, src/components/life-game-shell.tsx, prisma/schema.prisma.
- Approved hierarchy: Goal → Project → Milestone → Task; each project belongs to one goal. Existing unassigned records remain compatible.

## Brand
- Personality: warm, readable LifeOS game interface.
- Trust signals: saved business records and explicit outcome acceptance.
- Avoid: replacing existing styling or showing implementation details in normal product flows.

## Product goals
- Goals: follow a direction down to actionable tasks; inspect and edit entities without losing place.
- Non-goals: free-form diagram authoring, arbitrary connectors, automatic acceptance of upper-level outcomes.
- Success signals: editing and completing a task updates detail, map and list; refresh preserves records.

## Personas and jobs
- Primary personas: the personal LifeOS user.
- User jobs: plan results, split stages, execute tasks, review outcomes.
- Key contexts of use: desktop planning and mobile inspection/execution.

## Information architecture
- Primary navigation: existing goals and projects entries.
- Core routes/screens: /goals, /goals/[id], /projects, /projects/[id], /tasks.
- Content hierarchy: the entire compact goal card is a link to a full-viewport planning map; map nodes open detail drawers. The goal and project maps omit the application sidebar/banner and summary statistics.
- Primary authoring: add a project from its goal node, a milestone from its project node, and a task from its milestone node. Node actions also provide edit and delete, with a concrete deletion confirmation.
- KR remains a goal metric, not a fifth hierarchy level.

## Design principles
- Use one business data source for list, map and drawer.
- Separate node selection, branch expansion and creation/deletion actions.
- Enter directly into the map. Keep only small floating return and view controls; do not place a dashboard above the map.
- Preserve viewport when saving and refreshing data.
- Outcome completion is explicit; task completion does not automatically complete milestones/projects/goals.

## Visual language
- Color: existing theme and semantic statuses.
- Typography: existing site fonts; clamp long titles within map cards.
- Spacing/layout rhythm: consistent bounded node sizes; left-to-right tree.
- Shape/radius/elevation: existing cards and panel surfaces.
- Motion: restrained; avoid unexpected pan/zoom after saving.
- Imagery/iconography: existing lucide icon set; no new art required.

## Components
- Existing components to reuse: UI inputs/buttons, Radix Dialog, React Query mutations and rewards.
- New/changed components: compact linked goal cards, full-viewport React Flow map, node authoring actions, entity detail drawer, deletion confirmation and optional outline.
- Variants and states: goal/project/milestone/task; planned/active/completed; unassigned tasks.
- Token/component ownership: existing theme; planning-specific styles stay within planning components.

## Accessibility
- Target standard: keyboard-operable controls, readable labels and visible focus.
- Keyboard/focus behavior: drawer focus trap and return; Escape closes; node controls have accessible labels.
- Contrast/readability: preserve theme contrast; status has text labels.
- Screen-reader semantics: accessible outline alternative and named node actions.
- Reduced motion and sensory considerations: do not require animation to understand progress.

## Responsive behavior
- Supported breakpoints/devices: desktop and narrow mobile.
- Layout adaptations: map remains the default on all screen sizes; provide an optional accessible outline switch and a full-width drawer on phones.
- Touch/hover differences: actions remain visible and do not depend on hover.

## Interaction states
- Loading: explicit loading indicator.
- Empty: explain absence and offer relevant creation action.
- Error: visible request failure and retry without discarding edits.
- Success: persisted record reflected through query refresh.
- Disabled: mutation buttons disabled while submitting.
- Offline/slow network: retain input and explain failed saves.

## Content voice
- Tone: concise Chinese, outcome-oriented.
- Terminology: 目标 / 项目 / 里程碑 / 任务 / 验收条件 / 待归类任务.
- Microcopy rules: distinguish action completion from result acceptance.

## Implementation constraints
- Framework/styling system: Next.js 15, React 19, TypeScript, current Tailwind/CSS.
- Design-token constraints: reuse existing styles.
- Performance constraints: dynamically load map; scope API reads to one root; Dagre lays out only visible nodes.
- Compatibility constraints: nullable milestone relation preserves existing tasks; foreign-owner and mismatched-project relations rejected on server.
- Test/screenshot expectations: isolated PostgreSQL API smoke; desktop/mobile browser interactions; lint/typecheck/build.

## Open questions
- [ ] Future arbitrary node positioning is outside the current scope.
- [ ] Historic unassigned projects and tasks require user classification, not fabricated milestones.

## Periodic task check-ins
- The `/events` entry becomes 周期任务; the original event experience remains at `/events/archive`.
- Desktop: left-side 每日 / 每周 / 每月 tabs and a compact completion summary; right-side task rows with area, rewards, check-in and edit controls. Mobile: horizontal tabs above the list.
- Reuse the warm cream, green and gold palette, existing dialogs and reward feedback; no new image assets or dependency.
- Each task can be completed once per current period. Daily resets at local midnight, weekly starts Monday, monthly starts on the first, all in the account timezone.
- Users can browse previous periods read-only, create/edit templates, and archive a task while preserving history. Current check-ins can be undone, reversing the originally paid rewards.
- The server owns period boundaries and rewards. Repeated/concurrent desired-state check-ins must not duplicate rewards; stale period submissions show an error and refresh.
- Habits, routines and project tasks retain their existing behavior and data.
- Acceptance: task CRUD, all three periods, check/undo, reward consistency, duplicate requests, account isolation, previous-period browsing, and desktop/mobile keyboard operation.

### Daily task view switch
- 每日任务 supports 日视图 / 周视图 without changing task frequency. 周视图 shows one task per row and Monday–Sunday check-in columns.
- Navigate by calendar week; account timezone controls today. Today's cells support the existing check/undo transaction, past cells are read-only and future cells show 未到日期. Dates before template creation show 尚未建立.
- Fetch one week snapshot rather than seven independent day requests. Day and week queries are mutually enabled and share mutation invalidation.
- On mobile the week table scrolls horizontally inside its own labelled, keyboard-focusable region; page width stays within the viewport.

### Compact application header
- Shared app header height is 56px, controlled by `--app-header-height`; page offsets and notes workspace height use that same value.
- Show the page name, stamina icon and amount, experience icon and level/amount, utility icons and a small avatar in one row. Remove the subtitle, status cards and progress bars; retain complete status descriptions as accessible labels and hover titles.
- On phones, hide capacity denominators and the less essential utility shortcuts to keep both status amounts visible without wrapping. The account avatar remains accessible.
- The overview header uses 总览; the existing sidebar motto editor remains available. Full-screen goal/project maps retain their current layout.
