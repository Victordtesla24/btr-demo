---
alwaysApply: true
---

# Guard-Rails

## Scope & Evidence
- Touch only code directly implicated by failing tests, stack traces, or typed errors; no speculative edits.
- Align strictly with project docs in `/docs/` directory; never invent shapes/endpoints/states.

## No Fake Green & duplicate or unnecessary file creation
- No mocks/placeholders/fallbacks in **runtime** paths. Tests may use proper doubles; app code must be real.
- Do not “fix” by weakening tests unless the behavior matches documented contracts and user flows.
- Do not create **DUPLICATE** or **UNNECESSARY** files, documents if not in user request
- No new file creation **ALLOWED** before checking the same file exists elsewhere in the codebase or when it is absolutely necessary/explicitly asked in the user request. **UPDATE ONLY EXISTING FILES AT ALL TIMES, EVERYTIME**

## Research Pass
- Official `/docs/` directory (see Scope & Evidence for subdirectories).
- Internet search using `web_search` tool to find suitable & effective solutions with minimal code changes using credible, authentic, valid and top-rated/highly-reviewed online resources.

## Error Trail (must append every attempt)
- **Append/Upsert** to `.cursor/memory-bank/currentTaskContext.md` & `.cursor/memory-bank/progressTracking.md` 
  - If the folder/file doesn’t exist, check if it exists else where in the codebase, if not **ONLY THEN**, **create new**, ***STRICTLY NO DUPLICATION OR UNNECESARY NEW FOLDER CREATION ALLOWED***.
  - Sections (all required): **Symptom**, **Root Cause**, **Impacted Modules**, **Evidence** (file:line/stack),
    **Fix Summary**, **Files Touched**, **Why This Works**, **Verification Evidence** (commands + key outputs).

## Repeat-Error Research Escalation
- If a **similar class of error** persists for **≥ 2 attempts**, perform a **Research Pass** (see Research Pass section above).
  - Use only **official, pre-indexed docs** (`/docs/` directory) or approved internal docs; cite exact sections.
  - If needed docs aren't indexed, **pause and request** adding them before continuing.
- Only mark "resolved" when **all** gates pass with no regressions.

## Completion Policy
- Do **not** declare task as "COMPLETE" until **all** failures from the current test summary are resolved **and** verification gates pass (see `.cursor/commands/fix-errors.md` for verification commands).

