"""Generate the review documents from the planning model; no application code."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODEL = json.loads((ROOT / 'docs/review/flow-model.json').read_text(encoding='utf-8-sig'))
NODES = {n['id']: n for n in MODEL['nodes']}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--visual", type=Path, default=ROOT / "docs/review/quotefix-status-review.html", help="Output review fragment; requires compatible inline host for interaction")
VISUAL = parser.parse_args().visual.resolve()
VISUAL.parent.mkdir(parents=True, exist_ok=True)

def mermaid(ids, direction='TB', edge_sources=None, nodes=None, edges=None):
    nodes = NODES if nodes is None else nodes
    edges = MODEL['edges'] if edges is None else edges
    selected = set(ids)
    rows = ['flowchart ' + direction]
    for key in ids:
        n = nodes[key]
        marker = {'c': 'C', 'p': 'P', 'o': '?'}[n['kind']]
        rows.append(f'  {key}["{key.upper()}: {n["label"]} [{marker}]"]:::{n["kind"]}')
    for edge in edges:
        if edge['from'] in selected and edge['to'] in selected and (edge_sources is None or edge['from'] in edge_sources):
            arrow = '-.->' if edge['type'] == 'side' else '-->'
            rows.append(f'  {edge["from"]} {arrow}|"{edge["label"]}"| {edge["to"]}')
    rows += ['  classDef c fill:#dcfce7,stroke:#166534,color:#17211b',
             '  classDef p fill:#fef3c7,stroke:#92400e,color:#291c0c',
             '  classDef o fill:#fee2e2,stroke:#991b1b,color:#2a1111']
    return '\n'.join(rows) + '\n'

for chapter in MODEL['chapters']:
    (ROOT / f'docs/review/{chapter["id"]}.mmd').write_text(mermaid(chapter['ids'], chapter.get('direction', 'TB'), chapter.get('edgeSources')), encoding='utf-8')
# Account billing has its own diagram; its assessment events are not ticket stages.
ticket_nodes = [key for key, node in NODES.items() if node.get('surface') != 'account-billing']
(ROOT / 'docs/review/quotefix-full-flow.mmd').write_text(mermaid(ticket_nodes), encoding='utf-8')
for proposal in MODEL.get('proposals', []):
    lookup = {n['id']: n for n in proposal['nodes']}
    (ROOT / f'docs/review/{proposal["id"]}.mmd').write_text(mermaid(list(lookup), proposal.get('direction','TB'), nodes=lookup, edges=proposal['edges']), encoding='utf-8')

fragment = (ROOT / 'docs/review/review-shell.html').read_text(encoding='utf-8')
start = '<script id="qf-flow-data" type="application/json">'
before, remainder = fragment.split(start, 1)
_, after = remainder.split('</script>', 1)
encoded = json.dumps(MODEL, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
VISUAL.write_text(before + start + encoded + '</script>' + after, encoding='utf-8')

reference = ['# QuoteFix node reference — review ' + MODEL['version'], '',
             'Planning only. C = confirmed behaviour, P = proposed behaviour, ? = decision needed. Owner-confirmed wording is marked per node; other UI copy is proposed. These are workflow checkpoints and side tasks, not a request to create one backend status per node.', '',
             'See [review questions](../LIFECYCLE_REVIEW_QUESTIONS.md). Node IDs are stable comment anchors.', '']
for n in MODEL['nodes']:
    reference += [f'## {n["id"].upper()} — {n["label"]}', '',
                  f'**Authority:** {MODEL["legend"][n["kind"]]}.', '',
                  f'**Ticket label:** {n["status"] or "None — internal process"}  ', f'**Waiting-on bar:** {n["pending"] or "None"}  ',
                  f'**Action:** {n["action"] or "None — no button"}', '', f'**Entry trigger:** {n["trigger"]}', '',
                  f'**Checkpoint:** {n["checkpoint"]}', '', f'**Exceptions / limits:** {n["note"]}', '']
    if n.get('copyConfirmed'):
        reference += ['**Owner-confirmed wording:** ' + ', '.join(n['copyConfirmed']) + '.', '']
    if n.get('auditRequirement'):
        reference += ['**Audit record:** ' + n['auditRequirement'], '']
    if n.get('workspaceGroup'):
        reference += ['**Workspace group:** ' + n['workspaceGroup'] + '. ' + n.get('presentationDecision',''), '']
    if n.get('uiNote'):
        reference += ['**UI visibility:** ' + n['uiNote'], '']
    if n.get('countdown'):
        timer=n['countdown']
        reference += ['**Countdown — ' + ', '.join(timer['visibleTo']) + ':** ' + timer['authority'], '', *['- '+x for x in timer['examples']], '', timer['rules'], '']
    if n.get('pendingVariants'):
        reference += ['**Concrete pending lines by situation:**', '']
        for v in n['pendingVariants']:
            reference += [f'- {v["label"]}: **{v["pending"]}**; next stage {v["next"].upper()}.']
        reference += ['']
    if n.get('fields'):
        reference += ['**Fields:** ' + '; '.join(n['fields']) + '.', '']
    if n['questions']:
        reference += ['**Open decisions:** ' + ', '.join(n['questions']) + '.', '']
    for edge in MODEL['edges']:
        if edge['from'] == n['id']:
            reference += [f'- {edge["label"]} → **{edge["to"].upper()}** ({NODES[edge["to"]]["label"]}).']
    reference += ['']
(ROOT / 'docs/review/NODE_REFERENCE.md').write_text('\n'.join(reference), encoding='utf-8')

template = (ROOT / 'docs/review/lifecycle-template.md').read_text(encoding='utf-8')
main = ['i1','q1','q2','s1','s2','w1','w2','r1','r4','p1','p2','p4','p6']
rows = ['| ID | Ticket label | Waiting-on bar | Gate to advance | Rule |', '| --- | --- | --- | --- | --- |']
for key in main:
    n = NODES[key]
    rows.append(f'| {key.upper()} | {n["status"]} | {n["pending"]} | {n["checkpoint"]} | '+{'c':'C','p':'P','o':'?'}[n['kind']]+' |')
(ROOT / 'docs/TICKET_LIFECYCLE.md').write_text(template.replace('<!-- NODE_TABLE -->', '\n'.join(rows)), encoding='utf-8')
print(json.dumps({'nodes': len(NODES), 'edges': len(MODEL['edges']), 'sections': len(MODEL['chapters']), 'visual_bytes': VISUAL.stat().st_size}))
