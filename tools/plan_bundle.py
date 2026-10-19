"""Generate, validate and package QuoteFix planning documents; no application code."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
PLAN = DOCS / "implementation"
MANIFEST = PLAN / "plan-manifest.json"
MODEL = DOCS / "review" / "flow-model.json"
REPORT = PLAN / "PLANNING_VALIDATION.md"
FENCE = chr(96) * 3


def read(path):
    return path.read_text(encoding="utf-8-sig")


def write(path, body):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body.rstrip() + "\n", encoding="utf-8")


def load():
    return json.loads(read(MANIFEST)), json.loads(read(MODEL))


def chapter_tests(chapter):
    result = []
    for line in read(PLAN / "chapters" / chapter["file"]).splitlines():
        if re.match(r"^\| CH\d{2}-T\d{2} \|", line):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) != 3:
                raise ValueError(f"Malformed test row in {chapter['file']}: {line}")
            result.append(dict(zip(("id", "scenario", "expected"), cells)))
    return result


def timer_rows():
    result = {}
    for line in read(DOCS / "TIMING_AND_NOTIFICATION_REGISTER.md").splitlines():
        match = re.match(r"^\| (T\d{2}) \|", line)
        if match and match[1] not in result:
            result[match[1]] = [c.strip() for c in line.strip().strip("|").split("|")][1:]
    return result


def link_ch(ch):
    return f"[{ch['number']:02d} — {ch['title']}](chapters/{ch['file']})"


def cell(text):
    return str(text).replace("|", r"\|").replace("\n", " ")


def generate():
    manifest, model = load()
    chapters = manifest["chapters"]
    nodes = {n["id"]: n for n in model["nodes"]}
    owners = {n: c for c in chapters for n in c["nodes"]}
    timers = {t: c for c in chapters for t in c["timers"]}
    for ch in chapters:
        ch["tests"] = chapter_tests(ch)
    write(MANIFEST, json.dumps(manifest, ensure_ascii=False, indent=2))
    tests = [t for c in chapters for t in c["tests"]]
    preamble = f"Plan {manifest['version']} · {manifest['prepared']} · lifecycle {model['version']}. [Master](../IMPLEMENTATION_PLAN.md). Generated from the manifest and current sources; no policy is decided by generation."
    coverage = [
        "# Implementation coverage index", "", preamble, "",
        f"**{len(chapters)} chapters · {len(nodes)} active lifecycle anchors · {len(model['edges'])} directed routes · {len(model['chapters'])} diagram views · {len(timers)} timer rules · {len(tests)} planned verification scenarios.**", "",
        "A primary owner means the chapter responsible for wiring the behavior; other chapters may consume its events. Coverage is documentation traceability, not evidence that the feature is implemented or every route has an executed test.", "",
        "## 1. Chapter ownership", "",
        "| Chapter | Primary lifecycle anchors | Primary clocks | Planned tests |",
        "| --- | --- | --- | --- |"]
    for c in chapters:
        coverage.append(f"| {link_ch(c)} | {', '.join(n.upper() for n in c['nodes']) or 'Shared/non-node capability'} | {', '.join(c['timers']) or 'Inherited'} | {len(c['tests'])} |")
    coverage += ["", "## 2. Every active lifecycle anchor", "",
                 "Exact labels, entry conditions, visibility, conditional pending lines and exits remain in [Node reference](../review/NODE_REFERENCE.md). Full transition-to-chapter mapping is in [Routing coverage](ROUTING_COVERAGE.md). C/P/? authority and per-field copy approval remain in the source; chapter ownership does not promote a proposal to confirmed.", "",
                 "| Anchor | Meaning | Primary implementation chapter |", "| --- | --- | --- |"]
    for n in model["nodes"]:
        coverage.append(f"| {n['id'].upper()} | {cell(n['label'])} | {link_ch(owners[n['id']])} |")
    coverage += ["", "Retired C5 and P5 are excluded: no Admin veto gate before cancellation and no Finishing up screen. Their surviving safeguards belong to the actual domain transitions.", "",
                 "## 3. All clocks and key days", "",
                 "This table copies the timing register's current concise summary. Read the [register](../TIMING_AND_NOTIFICATION_REGISTER.md) and owning chapter for recipients, messages, countdown, stop guards and exceptions. T07/T09/T22 are reused by several features; do not schedule duplicate chases.", "",
                 "| Rule | Trigger | Wait / cadence | Effect | Primary chapter |", "| --- | --- | --- | --- | --- |"]
    for t, parts in sorted(timer_rows().items()):
        coverage.append(f"| {t} | {' | '.join(cell(p) for p in parts)} | {link_ch(timers[t])} |")
    coverage += ["", "## 4. Capabilities beyond diagram nodes", "",
                 "| Capability | Owning chapters / verification focus |", "| --- | --- |",
                 "| Environments, migrations, real data versus fixtures | 01, 19; no production fixture/reset path |",
                 "| Login, sessions, membership, estate isolation | 02; identity/role escalation denied |",
                 "| Exact versions, concurrency, audit and idempotency | 03 plus every consequential command |",
                 "| Private media, immutable finalization, sanitised preview | 03, 06, 07, 11, 12, 18, 20 |",
                 "| Waiting-on bar, role task versus per-user read state | 04, 18; no read-to-complete shortcut |",
                 "| Server clocks, failure monitoring, notice issuance | 04, 19; outage/duplicate/obsolete-worker guards |",
                 "| AI factual refinement and explainable comparison | 06, 08, 16; human decisions and source versions |",
                 "| Credentials and independent restriction reasons | 05, 13; fee freeze cannot cancel existing work |",
                 "| Confidential reports and identity masking | 02, 03, 08, 14, 17, 18, 20; list/file/export/AI/sync |",
                 "| Inspection ratings, provenance and moderation | 11, 15, 16; acceptance is a distinct fact |",
                 "| MCST warning settings without automatic fraud verdict | 17; event-time versioned policy |",
                 "| Search, analytics and exportable decision packs | 18; permitted sources and denominators |",
                 "| Backup, security, monitoring and safe release | 19; evidence required before launch |",
                 "| Mobile cache, file retry and installed-client compatibility | 03, 20; shared online decision authority |",
                 "", "## 5. Deliberate non-alerts and unresolved gaps", "",
                 "No automatic Admin silence chase is invented for unpublished drafts, optional photos/updates, informational final-resolution acknowledgments, not-yet-due Feedback or a selected quote's former expiry. Real obligations retain their domain tasks. After Admin acknowledges an unresolved issue, a saved next action/date keeps it on the queue.", "",
                 "Open extras remain in [Decision gates](DECISION_GATES.md): ordinary repeats beyond the approved +1 BD Admin reminder, warranty/advance reminders and archive. G03 no-agreed-start requests were resolved by the owner on 14 October 2026. Other visible design gaps retain their recorded gates.", "",
                 "## 6. Using coverage during implementation", "",
                 "Before coding a feature, extend its command/schema design with explicit rule → permission → invariant → event/task/timer → test evidence mappings. Exercise its exits in Routing coverage, including conditional pending actors. The scenario count alone does not prove every route is tested. Chapter 19 combines complete journeys and cross-cutting failure/security cases."]
    write(PLAN / "COVERAGE_INDEX.md", "\n".join(coverage))

    routes = ["# Lifecycle routing coverage", "", preamble, "",
              "A static index of the current model, not an additional workflow. See [Node reference](../review/NODE_REFERENCE.md) for full guards and [Diagrams](../review/DIAGRAMS.md) for visuals. No anchor automatically becomes a separate required page.", "",
              "## Every directed route", "",
              "| From | Trigger / outcome label | To | Route kind | Implementation chapters |",
              "| --- | --- | --- | --- | --- |"]
    for edge in model["edges"]:
        a, b = owners[edge["from"]], owners[edge["to"]]
        ch = link_ch(a) if a == b else link_ch(a) + " → " + link_ch(b)
        routes.append(f"| {edge['from'].upper()} | {cell(edge['label'])} | {edge['to'].upper()} | {edge.get('type', 'flow')} | {ch} |")
    routes += ["", "## Situation-specific next actors", "",
               "These preserve the source's conditional waiting-on lines. A generic Role responsible label is not a substitute. Labels are proposed except where source copy approval is explicit.", "",
               "| Node / situation | Waiting-on line | Next anchor | Owning chapter |", "| --- | --- | --- | --- |"]
    for n in model["nodes"]:
        for v in n.get("pendingVariants", []):
            routes.append(f"| {n['id'].upper()} — {cell(v['label'])} | {cell(v['pending'])} | {v['next'].upper()} | {link_ch(owners[n['id']])} |")
    write(PLAN / "ROUTING_COVERAGE.md", "\n".join(routes))

    verify = ["# Verification scenario index", "", preamble, "",
              f"**{len(tests)} scenario specifications across {len(chapters)} chapters.** These rows define requirements rather than claiming completion. Executed local subsets are recorded separately in [01–02 evidence](CH01_CH02_VERIFICATION.md), [03–04 evidence](CHAPTERS_03_04_BUILD.md), [05–06 evidence](CHAPTERS_05_06_BUILD.md), [07–08 evidence](CHAPTERS_07_08_BUILD.md), [09–10 evidence](CHAPTERS_09_10_BUILD.md), [11–12 evidence](CHAPTERS_11_12_BUILD.md), [13–14 evidence](CHAPTERS_13_14_BUILD.md), [15–16 evidence](CHAPTERS_15_16_BUILD.md) and [17–18 evidence](CHAPTERS_17_18_BUILD.md). Chapter 19 release and Chapter 20 native scenarios remain planned; local checks do not establish production readiness.", "",
              "## Evidence to retain", "",
              "For each scenario: source rule/version, isolated fixture, actor/role/estate, initial record versions and clock, command/request ID, expected/actual result, changed database/audit/outbox/tasks/bells, UI/error evidence, and pass/fail with environment/build. A failure preserves observations; do not edit expected policy to conceal it.", "",
              "Use real transaction/permission/worker boundaries where needed. Mock-only or screenshot-only evidence cannot prove financial uniqueness, access isolation or deadline recovery. Test each Conditional required field with and without its triggering condition.", "",
              "## Shared fixture families", "",
              "| Fixture | Purpose |", "| --- | --- |",
              "| Two estates, equal-role named accounts, reported subject, rival Contractors | Denied cross-estate/subject/rival access; shared tasks versus per-user reads |",
              "| Zero/one/two/three valid quotes; expiry, revisions, material changes | Sourcing count, early selection, pause/resume and reconfirmation |",
              "| Under/equal/above threshold; CM versus MCST | Correct direct authority versus required MCST approval |",
              "| Future/missed Start, unknown/revised target, failed remedies | Distinct clock anchors and numbered re-inspection |",
              "| Full/partial/zero/adjusted invoice, late entry, disputed transfer | Balances, deeming, independent fees and duplicate/lost-response recovery |",
              "| Cancelled, timely claim, draft-only claim, no response | Cutoff, non-waiver, preserved debt and actual execution |",
              "| Date-only/instant, holiday/weekend, delayed notice/outage | Calendar precision and first-issued anchoring |",
              "| Positive/negative/Unable to assess/missing Feedback | No fabricated durability/reputation; moderation and reference provenance |",
              "| Two devices, expired session, revoked access, interrupted media | Online decisions, privacy, sync and resumability |",
              "", "Fictional fixtures are isolated from production. Genuine external references are verified separately. Freeze the test clock and supply a versioned holiday calendar rather than depending on the host's current date.", ""]
    for c in chapters:
        verify += [f"## Chapter {c['number']:02d} — {c['title']}", "", link_ch(c), "",
                   "| Test ID | Scenario | Expected result |", "| --- | --- | --- |"]
        for t in c["tests"]:
            verify.append(f"| {t['id']} | {cell(t['scenario'])} | {cell(t['expected'])} |")
        verify += [""]
    verify += ["## Whole-system acceptance", "",
               "Chapter 19 defines fourteen multi-role journeys plus recovery/privacy/load/release gates. Add all applicable routes from [Routing coverage](ROUTING_COVERAGE.md) to the executable trace when implementing commands. Document tables are not executable cases or a release sign-off."]
    write(PLAN / "VERIFICATION_INDEX.md", "\n".join(verify))

    diagrams = ["# QuoteFix lifecycle — Mermaid gallery for GitHub", "",
                f"Lifecycle {model['version']}. Existing .mmd sources embedded here; no lifecycle logic changed during chapter planning.", "",
                "Green C = confirmed behavior; amber P = proposed behavior; red ? = decision needed. Copy approval is per field in [Node reference](NODE_REFERENCE.md). Dashed arrows are side routes; color and letter identify authority.", "",
                "Use the smaller sections first. The full graph is for completeness, not one screen per node. Account fees have their own view.", "",
                "These sections render on GitHub. Interactive node-comment capture belongs to the compatible inline host; this gallery does not promise commenting inside GitHub Mermaid.", "",
                "## Section index", ""]
    for index, view in enumerate(model["chapters"], 1):
        diagrams.append(f"- {index:02d}. {view['title']} — [editable Mermaid]({view['id']}.mmd)")
    for index, view in enumerate(model["chapters"], 1):
        diagrams += ["", f"## {index:02d}. {view['title']}", "", view.get("reviewStatus", ""), "",
                     FENCE + "mermaid", read(DOCS / "review" / f"{view['id']}.mmd").strip(), FENCE]
    diagrams += ["", "## Full ticket flow", "", "Contractor QuoteFix fees remain in the separate account view.", "",
                 FENCE + "mermaid", read(DOCS / "review" / "quotefix-full-flow.mmd").strip(), FENCE]
    write(DOCS / "review" / "DIAGRAMS.md", "\n".join(diagrams))


def local_links():
    errors, checked = [], 0
    files = [ROOT / "README.md", ROOT / "AGENTS.md"] + list(DOCS.rglob("*.md"))
    for path in files:
        text = re.sub(FENCE + r".*?" + FENCE, "", read(path), flags=re.S)
        for match in re.finditer(r"\[[^\]\n]+\]\(([^)\n]+)\)", text):
            target = match[1].strip()
            if target.startswith("<") and target.endswith(">"):
                target = target[1:-1]
            if re.match(r"^[a-zA-Z][\w+.-]*:", target) or target.startswith("#"):
                continue
            target = unquote(target.split("#", 1)[0])
            if not target:
                continue
            # Template links are written for its generated docs/TICKET_LIFECYCLE.md.
            base = DOCS if path.name == "lifecycle-template.md" else path.parent
            if not (base / target).resolve().exists():
                errors.append(f"{path.relative_to(ROOT)} -> {target}")
            checked += 1
    return checked, errors


def validate():
    manifest, model = load()
    errors = []
    chapters = manifest["chapters"]
    if [c["number"] for c in chapters] != list(range(1, 21)):
        errors.append("Chapter numbers are not the unique 01–20 sequence")
    if {p.name for p in (PLAN / "chapters").glob("*.md")} != {c["file"] for c in chapters}:
        errors.append("Chapter directory and manifest differ")
    if manifest["lifecycleVersion"] != model["version"]:
        errors.append("Manifest lifecycle version is stale")
    all_tests = []
    for c in chapters:
        if any(n >= c["number"] or n < 1 for n in c["dependencies"]):
            errors.append(f"Forward/cyclic dependency: chapter {c['number']}")
        found = chapter_tests(c)
        if found != c.get("tests"):
            errors.append(f"Stale test index chapter {c['number']}; run generate")
        ids = [t["id"] for t in found]
        if ids != [f"CH{c['number']:02d}-T{i:02d}" for i in range(1, len(ids) + 1)]:
            errors.append(f"Nonsequential test IDs chapter {c['number']}")
        if len(ids) < 6:
            errors.append(f"Missing verification specification chapter {c['number']}")
        all_tests += ids
    if len(set(all_tests)) != len(all_tests):
        errors.append("Duplicate test IDs")
    node_ids = [n["id"] for n in model["nodes"]]
    owned_nodes = [n for c in chapters for n in c["nodes"]]
    if Counter(owned_nodes) != Counter({n: 1 for n in node_ids}):
        errors.append("Missing, duplicate or unknown primary node ownership")
    if len(set(node_ids)) != len(node_ids):
        errors.append("Duplicate lifecycle node IDs")
    for edge in model["edges"]:
        if edge["from"] not in node_ids or edge["to"] not in node_ids:
            errors.append(f"Bad edge: {edge}")
    variants = 0
    for n in model["nodes"]:
        for v in n.get("pendingVariants", []):
            variants += 1
            if v["next"] not in node_ids:
                errors.append(f"Bad variant target: {n['id']} {v}")
    for view in model["chapters"]:
        if any(n not in node_ids for n in view["ids"]):
            errors.append(f"Bad view node: {view['id']}")
    owned_timers = [t for c in chapters for t in c["timers"]]
    expected_timers = {f"T{i:02d}" for i in range(1, 24)}
    if Counter(owned_timers) != Counter({t: 1 for t in expected_timers}):
        errors.append("Missing, duplicate or unknown primary timer ownership")
    if set(timer_rows()) != expected_timers:
        errors.append("Timing summary must contain T01–T23")
    defined = set(re.findall(r"^\| (G\d{2}) /", read(PLAN / "DECISION_GATES.md"), flags=re.M))
    for c in chapters:
        used = set(re.findall(r"\bG\d{2}\b", read(PLAN / "chapters" / c["file"])))
        if used - defined:
            errors.append(f"Undefined gates chapter {c['number']}: {sorted(used-defined)}")
    if not REPORT.exists():
        write(REPORT, "# Planning validation report\n\nValidation in progress.")
    checked, link_errors = local_links()
    errors += link_errors
    for path in [ROOT / "README.md", DOCS / "IMPLEMENTATION_PLAN.md"] + list(PLAN.rglob("*.md")) + [DOCS / "review" / "DIAGRAMS.md"]:
        if len(re.findall("^" + FENCE, read(path), flags=re.M)) % 2:
            errors.append(f"Unbalanced fences: {path.relative_to(ROOT)}")
    by_id = {n["id"]: n for n in model["nodes"]}
    if {"p5", "c5"} & set(node_ids):
        errors.append("Retired extra stages restored")
    if any(e["to"] != "d2" for e in model["edges"] if e["from"] == "d3"):
        errors.append("Evidence bypasses Admin review")
    if any(v["next"] != "d2" for v in by_id["d3"].get("pendingVariants", [])):
        errors.append("Evidence variant bypasses Admin review")
    if "ResizeObserver" in read(DOCS / "review" / "review-shell.html"):
        errors.append("Review shell reintroduces ResizeObserver; inspect")
    counts = dict(chapters=len(chapters), tests=len(all_tests), nodes=len(node_ids),
                  edges=len(model["edges"]), pendingVariants=variants,
                  timers=len(owned_timers), diagramViews=len(model["chapters"]), localLinks=checked)
    lines = ["# Planning validation report", "",
             f"Plan {manifest['version']} · baseline {manifest['prepared']} · lifecycle {model['version']}.", "",
             "**Documentation validation: " + ("FAILED" if errors else "PASSED") + ".**", "",
             "These checks validate documentation only. Local construction through Chapters 01–18 is recorded in the separate chapter build records and the [Chapters 09–18 audit](CHAPTERS_09_18_AUDIT.md). Chapters 19–20 and production release remain outstanding; planned scenario IDs are not executable-test counts.", "",
             "| Check | Result |", "| --- | --- |",
             f"| Ordered chapter set | {counts['chapters']} / 20 |",
             f"| Unique sequential planned test IDs | {counts['tests']} |",
             f"| Active node ownership | {counts['nodes']}, one primary chapter each |",
             f"| Valid directed routes | {counts['edges']} |",
             f"| Valid conditional next targets | {counts['pendingVariants']} |",
             f"| Timer ownership | {counts['timers']} / 23 |",
             f"| Source diagram views | {counts['diagramViews']} |",
             f"| Local Markdown file references | {counts['localLinks']} |",
             "| Forward/cyclic dependencies | Checked |",
             "| Decision-gate references and Markdown fences | Checked |",
             "| Retired C5/P5 and Admin-only evidence routing | Checked |",
             "| Existing resize repair | Review shell contains no ResizeObserver |",
             "", "## Scope and limits", "",
             "Static chapter/node/timer/link coverage does not prove executable behavior or all exception paths. The audit distinguishes implemented local behavior, executed tests, unfinished integrations and production gates. Future-chapter schemas, features and verification remain their own deliverables. Open gates stay open.", "",
             "GitHub Mermaid sections package existing model/diagram sources. No new browser/runtime test was run for this document organization; earlier review-tool checks remain dated in its README.", "",
             "The export utility verifies ZIP integrity and hashes every included file. Re-run validation after edits."]
    if errors:
        lines += ["", "## Errors", ""] + [f"- {e}" for e in errors]
    write(REPORT, "\n".join(lines))
    return counts, errors


def package():
    generate()
    counts, errors = validate()
    if errors:
        raise ValueError("Cannot package invalid plan:\n" + "\n".join(errors))
    candidates = [ROOT / n for n in ("README.md", "AGENTS.md", ".gitignore", "tools/plan_bundle.py")]
    allowed = {".md", ".json", ".mmd", ".html", ".py", ".cjs", ".docx"}
    candidates += [p for p in DOCS.rglob("*") if p.is_file() and p.suffix in allowed
                   and "__pycache__" not in p.parts]
    entries = []
    for p in sorted(set(candidates)):
        data = p.read_bytes()
        entries.append({"path": p.relative_to(ROOT).as_posix(), "bytes": len(data),
                        "sha256": hashlib.sha256(data).hexdigest()})
    export = {"planVersion": "0.3", "date": "2026-10-13", "root": "quotefix-blueprint",
              "scope": "Planning documents/review tooling only; no implemented QuoteFix application.",
              "counts": counts, "files": entries}
    out = ROOT / "exports"
    out.mkdir(exist_ok=True)
    destination = out / "QuoteFix-Implementation-Blueprint-v0.3-2026-10-13.zip"
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for e in entries:
            z.writestr("quotefix-blueprint/" + e["path"], (ROOT / e["path"]).read_bytes())
        z.writestr("quotefix-blueprint/EXPORT_MANIFEST.json", json.dumps(export, ensure_ascii=False, indent=2) + "\n")
    with zipfile.ZipFile(destination) as z:
        if z.testzip() is not None:
            raise ValueError("ZIP integrity failed")
        for e in entries:
            if hashlib.sha256(z.read("quotefix-blueprint/" + e["path"])).hexdigest() != e["sha256"]:
                raise ValueError("ZIP hash mismatch: " + e["path"])
        if len(z.namelist()) != len(entries) + 1:
            raise ValueError("Unexpected archive entries")
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    write(destination.with_suffix(".zip.sha256"), f"{digest}  {destination.name}")
    return {"zip": str(destination), "bytes": destination.stat().st_size,
            "sourceFiles": len(entries), "archiveEntries": len(entries) + 1, "sha256": digest, **counts}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("generate", "validate", "package"))
    args = parser.parse_args()
    if args.action == "generate":
        generate()
        print("Generated chapter/test/route/timer indices and GitHub Mermaid gallery.")
    elif args.action == "validate":
        counts, errors = validate()
        print(json.dumps({"status": "failed" if errors else "passed", **counts, "errors": errors}, indent=2))
        return 1 if errors else 0
    else:
        print(json.dumps(package(), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
