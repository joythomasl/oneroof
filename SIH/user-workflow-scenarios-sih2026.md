# User Workflow & Scenarios — Samanvay / Unified Disaster Response Platform

*This is a walkthrough, not a feature list — the same system described in the spec, followed through one continuous illustrative event, plus a set of stress-test scenarios showing how each gap-closing feature behaves in practice. All names, places, and events below are fictional and constructed for this document; nothing here describes a real incident.*

---

## Personas used in this walkthrough

| Persona | Role | Represents |
|---|---|---|
| **Priya** | CPOC, Vadakarai district | On-scene authority, approves and closes |
| **Arjun** | Deputy CPOC, Vadakarai district | Mandatory backup authority (GAP-2) |
| **Karthik** | Fire Force station officer | First local responder, usually first to know |
| **SDRF Team 4** | State Disaster Response Force unit | Specialist rescue |
| **NDRF Unit 7** | National Disaster Response Force unit | Specialist rescue, cross-district deployment |
| **Devi** | Sub-Inspector, local police | Missing-persons filing |
| **Latha** | Camp Registrar, relief camp | Phase 3 safe-list registration |
| **Ravi** | Intake Operator, 112 control room | Civilian call handling |
| **State Command Centre** | State-level controllers | Multi-district oversight, resource allocation |
| **Meena** | A civilian, mother of a missing man | The reason any of this matters |

*Vadakarai district is a fictional coastal district in Tamil Nadu, used only to anchor this walkthrough.*

---

## Part 1 — Core workflow: one continuous scenario

### Phase 1 — Alert

Forty hours before landfall, the meteorological feed crosses threshold for Vadakarai district. Command Centre's system auto-proposes an alert level; a controller confirms it, and the district turns **orange** on the map. *(M2)*

Every responder app in the district gets the alert with a risk-and-measures checklist specific to a coastal cyclone profile — what to stage, what to expect. *(M2)*

Priya, the CPOC, opens her roster and assigns standby roles: Fire Force to low-lying wards, SDRF to the river mouth, Medical to the primary health centre, Camp teams to the two pre-identified shelters. Each unit acknowledges; Priya's dashboard shows who has and hasn't. *(M6)*

Arjun is confirmed as Deputy CPOC — the district cannot leave NORMAL without this being set. *(M1, GAP-2)*

As the cyclone track sharpens, the district is upgraded to **red**. Everyone is now on standby, briefed, and geographically pre-positioned.

### Transition — Activation

Landfall happens overnight. Around 2:40 AM, Karthik's fire station gets word — from a neighbour's shout, not from any feed — that a two-storey building has partially collapsed in a low-lying ward, with flooding rising fast. He knows before Command Centre does, because that is how it always happens.

Karthik opens the app and files an **Emergency Activation Request**: two photos, a voice note describing what he can see, auto-attached GPS and timestamp. *(M3)*

Priya reviews it against the risk map and approves within four minutes. The entire district flips to **EMERGENCY**. Every app in Vadakarai reconfigures automatically — mesh radios on, location pings every 30 seconds instead of every 5 minutes, high-contrast emergency UI, offline tiles already cached from Phase 1. *(M3)*

### Phase 2 — Emergency

Cell towers in the worst-hit ward go down within the hour. Karthik's team, SDRF Team 4, and NDRF Unit 7 (pre-positioned nearby under a state mutual-aid arrangement) start talking to each other over BLE mesh — no tower needed. *(M4)*

Reports land on the shared map as they happen: flooding, a blocked access road, a downed power line, people trapped on a rooftop. Each is tagged P0–P3 by whoever reports it. *(M5)*

At 3:15 AM, Ravi at the 112 control room takes a call about the same collapsed building Karthik already reported — a neighbour, panicking, giving a slightly different address. Ravi logs it as a staged civilian report. Twelve minutes later the system flags it as a probable duplicate of Karthik's original report — same type, 80 m apart, well inside the auto-link window — and links it as a corroborating child under one parent incident. Nothing is lost; both reports, both reporters, are visible under the same map point. *(M5, M7, GAP-3, GAP-4)*

SDRF Team 4, mid-extraction, needs cutting equipment they don't have. One tap sends a backup request; it routes to the nearest unit with a matching capability tag — NDRF Unit 7, 600 m away — who accept and arrive in under ten minutes. *(M6)*

Karthik's team finishes clearing the rooftop. He marks it `RESOLVED_PENDING_VERIFICATION` and takes a photo through the app's locked camera — GPS and timestamp bind to it automatically. Priya reviews the before/after pair from her side and closes it. The map point turns green. *(M8)*

Through all of this, State Command Centre watches Vadakarai's map fill and slowly clear, and separately approves Priya's request for a second NDRF column when she flags that two more wards need attention than her current strength can cover. *(M10)*

### Phase 3 — Recovery

Twenty-two hours in, the worst has passed. Priya declares the shift to **RECOVERY**.

At the relief camp, Latha registers every arriving family into the safe list — name, age, contact, where they came from, who they're travelling with. Among them: a mother and two children whose home flooded out. *(M9, Track A)*

Devi, the sub-inspector, files a missing-person report for a man last seen near the collapsed building the night before — his family can't reach him and fears the worst.

The matching engine surfaces a probable match: a man fitting that description checked into a different camp four kilometres away, two hours earlier. Devi reviews the candidate, confirms it's him, and the family — including Meena, his mother — is notified. *(M9, Track B, matching engine)*

Meanwhile the incident map has become a worklist: 41 open points, ordered by severity and age. Units work through them one by one — same photo, same verification, same closure loop as Phase 2, just without the urgency of an active emergency. *(M5, M8)*

As the last point turns green, Vadakarai reverts to **NORMAL**. The district's full record — every report, every closure, every registration — stays in the audit log, available for the after-action review. *(M3, M11)*

---

## Part 2 — Potential scenarios: how the system behaves under stress

Each of these is a standalone situation, not a continuation of the story above — written to show a specific behaviour a panel is likely to probe.

### 1. The CPOC goes dark

**Trigger:** Priya's phone dies mid-emergency and stays unreachable for eleven minutes.
**What happens:** The heartbeat check notices, and authority auto-transfers to Arjun, the Deputy CPOC, with a banner notification to everyone in the district. When Priya's phone comes back online, the transfer is reversible — she resumes, and the handover is logged with a note either way.
**Why it matters:** A single unreachable person does not stall an entire district's emergency response.
**Ties to:** M1, M3 · GAP-2

### 2. Nobody has to approve at all

**Trigger:** Three different agencies — Fire Force, SDRF, and a passing Home Guard patrol — independently file activation requests for the same general area within eight minutes of each other, and neither Priya nor Arjun is reachable.
**What happens:** The multi-report auto-trigger recognises independent corroboration from different agencies and escalates the district to a **provisional EMERGENCY** on its own, flagged for confirmation the moment either CPOC is reachable again.
**Why it matters:** The system doesn't wait on a person who can't be reached, but it also doesn't let a single false report trigger a district-wide emergency alone — it takes independent corroboration.
**Ties to:** M3 · GAP-2

### 3. No warning at all

**Trigger:** An earthquake hits a district that was sitting quietly in NORMAL — no cyclone, no rain, nothing in the hazard feed.
**What happens:** There is no ALERT phase to pass through. The first field report of structural collapse auto-proposes EMERGENCY directly; the CPOC confirms it, and the district activates exactly as it would after a slower-building hazard — just without the standby period.
**Why it matters:** Phase 1 depending on a weather feed would leave the system blind to exactly the disasters that give no warning.
**Ties to:** M2, M3 · GAP-1

### 4. Two responders, same incident, no signal between them

**Trigger:** A mesh partition splits a ward in half. Two different responders, unaware of each other, both update the same incident — one adds a photo, the other changes the severity.
**What happens:** Every action is logged as an event, not an edit, stamped with a vector clock. When the mesh reconnects, both contributions merge in causal order — nothing is overwritten. Because only the CPOC's `CLOSE` action is authoritative, neither responder could have closed it by accident; the conflicting severity change surfaces to the CPOC as a flagged divergence for a human decision.
**Why it matters:** Offline-first only works if simultaneous edits don't silently destroy each other.
**Ties to:** M4 · GAP-6

### 5. Every report says urgent

**Trigger:** Within twenty minutes of activation, six reports arrive, five of them tagged P0. One team is free.
**What happens:** The worklist doesn't sort by arrival time — it sorts by severity, then by how long each P0 has been open, then by which available unit is closest. A P0 sitting unattended past its target response time visibly escalates on the map, so it can't quietly get buried under newer reports.
**Why it matters:** "Everything is urgent" is the default state of an emergency; the system's job is to make the actual next move obvious anyway.
**Ties to:** M5 · GAP-5

### 6. A closure that wasn't real

**Trigger:** A responder, exhausted and behind schedule, marks an incident resolved and attaches a photo taken from the wrong location.
**What happens:** The geo-fence check flags that the closure photo's coordinates fall outside the tolerance radius of the original incident. Priya's verification queue shows this as a mismatch rather than a clean before/after pair; she rejects it with a mandatory reason, and the incident reopens for the responder to actually complete.
**Why it matters:** A single trusted verification step is what makes "closed" mean something afterward — to families, auditors, and enquiry commissions alike.
**Ties to:** M8

### 7. The missed check-in

**Trigger:** A responder enters a partially collapsed structure alone to check for survivors and sets a check-in timer. The timer lapses with no check-in.
**What happens:** An automatic alert fires to the CPOC and every nearby unit, along with the responder's last known position before the device stopped moving. Backup is dispatched to that location without the responder having to ask.
**Why it matters:** The system notices a responder in trouble before their team does, which is exactly the gap that costs lives in the chaos of an active emergency.
**Ties to:** M6

### 8. The aftershock

**Trigger:** A second, smaller earthquake hits Vadakarai eighteen hours into RECOVERY, while camps are open and most incidents are already closed.
**What happens:** The district re-enters EMERGENCY without discarding anything — camps stay registered, closed incidents stay closed, and new reports from the aftershock layer on top as fresh points. Recovery work already done isn't lost or reset.
**Why it matters:** Real disasters don't politely wait for recovery to finish before the ground moves again.
**Ties to:** M3

### 9. A family, two camps, one match

**Trigger:** This is scenario from Part 1, told from Meena's side. Her son went missing the night of the collapse. She has no way to check every relief camp in the district herself.
**What happens:** Devi's missing-person report and Latha's camp registration — filed independently, by two different people, in two different systems on paper — become two records in one database the moment they're entered. The matching engine does in seconds what would otherwise take days of phone calls between camps and stations.
**Why it matters:** This is the scenario the whole People Registry module exists for. Everything else in Phase 3 is process; this is the outcome that actually matters to a family.
**Ties to:** M9

---

## Quick reference — scenario to feature mapping

| Scenario | Modules | Gap resolved |
|---|---|---|
| CPOC goes dark | M1, M3 | GAP-2 |
| Multi-report auto-escalation | M3 | GAP-2 |
| Sudden-onset earthquake | M2, M3 | GAP-1 |
| Mesh partition, conflicting edits | M4 | GAP-6 |
| Every report is urgent | M5 | GAP-5 |
| False closure caught | M8 | — (core trust feature) |
| Missed check-in | M6 | — (responder safety) |
| Aftershock during recovery | M3 | — (cascade handling) |
| Family reunification | M9 | — (Phase 3 outcome) |
| Duplicate collapse report | M5, M7 | GAP-3, GAP-4 |
