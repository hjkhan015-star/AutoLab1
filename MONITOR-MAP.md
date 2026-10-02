# MONITOR-MAP.md — Phase 7a inventory

Generated from the Phase 5 zip (`AutoLab1-main.zip`, cache autolab-v8.5) by scanning every module page. "Value surfaces today" lists every place a number is printed before 7a.
Legend: **7a-1** = done in part 1; **7a-2** = done in part 2 (both in this zip) (Monitor core + guided apply). **7a-2** = remaining half of 7a (see `PHASE-7a-PART2.md`). **7b** = Phase 7b.

| Module | Kind | Value surfaces today | Duplicates (D10–D13 candidates) | 7a-1 (this zip) | 7a-2 | Phase |
|---|---|---|---|---|---|---|
| abs-esc | bespoke | chip; 5 ui.chip calls; 8 ro-* ids; 1 setRpmLabel; badge | - | chip → Monitor via wrapper (works, unchanged) | 7a done: speed row already shows km/h; static unit label deleted (duplicate removed) | 7a done |
| airfilter | guided | big+bar (Airflow); 2 chip rows; 5 ro rows (grid→rows); no canvas | big value = ro row flow (dropped from rows); chip rows share ro ids: dp,pw | 7a-1 done: big/bar/status/rows/ro → ui.monitor | - | 7a |
| automatic | bespoke | chip; 7 ui.chip calls; 1 setRpmLabel | - | chip → Monitor via wrapper (works, unchanged) | 7a done: row `speed` 'Vehicle speed' (km/h) | 7a done |
| awd | guided | big+bar (Rear torque); 2 chip rows; 11 ro rows (grid→rows); canvas #awd-graph; warn #awd-warn | chip rows share ro ids: fslip,rslip | 7a-1 done: big/bar/status/rows/ro → ui.monitor | 7a done: graph canvas → Monitor trace `hist` (two series, 0–100 % of the old axis ranges), warn → status (tone warn) | 7a done |
| braking | bespoke | chip; 6 ui.chip calls; badge | - | chip → Monitor via wrapper (works, unchanged) | - | 7b |
| carburetor | bespoke | chip; 3 ui.chip calls; 1 setRpmLabel; badge | - | chip → Monitor via wrapper (works, unchanged) | 7a done: row `rpm` 'Engine speed' | 7a done |
| catalytic | guided | big+bar (CO conversion); 2 chip rows; 9 ro rows (grid→rows); canvas #cat-graph; warn #cat-warn | chip rows share ro ids: hc,nox | 7a-1 done: big/bar/status/rows/ro → ui.monitor | 7a done: graph canvas → Monitor trace `hist` (two series, 0–100 % of the old axis ranges), warn → status (tone warn) | 7a done |
| clutch | bespoke | chip; 5 ui.chip calls; 1 setRpmLabel | - | chip → Monitor via wrapper (works, unchanged) | 7a done: row `rpm` 'Engine speed' | 7a done |
| coilplug | guided | big+bar (Engine speed); 2 chip rows; 5 ro rows (grid→rows); no canvas | big value = ro row rpm (dropped from rows); chip rows share ro ids: dwell,sps | 7a-1 done: big/bar/status/rows/ro → ui.monitor | - | 7a |
| commonrail | guided | big+bar (Rail pressure); 2 chip rows; 10 ro rows (grid→rows); canvas #cr-graph; warn #cr-warn | big value = ro row press (dropped from rows); chip rows share ro ids: qty | 7a-1 done: big/bar/status/rows/ro → ui.monitor | 7a done: graph canvas → Monitor trace `hist` (two series, 0–100 % of the old axis ranges), warn → status (tone warn) | 7a done |
| cooling | bespoke | chip; 8 ui.chip calls; 1 setRpmLabel; badge | - | chip → Monitor via wrapper (works, unchanged) | 7a done: row `rpm` 'Engine speed' | 7a done |
| crankshaft-piston | bespoke | chip; 5 ui.chip calls; 1 ro-* ids; canvas #cp-graph | - | chip → Monitor via wrapper (works, unchanged) | - | 7b |
| differential | bespoke | chip; 7 ui.chip calls; 1 setRpmLabel | - | chip → Monitor via wrapper (works, unchanged) | 7a done: row `rpm` 'Input speed' (L/R rows unchanged) | 7a done |
| dpf | guided | big+bar (Back pressure); 2 chip rows; 9 ro rows (grid→rows); canvas #dpf-graph; warn #dpf-warn | big value = ro row bp (dropped from rows); chip rows share ro ids: soot,regen | 7a-1 done: big/bar/status/rows/ro → ui.monitor | 7a done: graph canvas → Monitor trace `hist` (two series, 0–100 % of the old axis ranges), warn → status (tone warn) | 7a done |
| driveshaft | guided | big+bar (Speed swing); 2 chip rows; 11 ro rows (grid→rows); canvas #ds-graph; warn #ds-warn | big value = ro row swing (dropped from rows); chip rows share ro ids: ratio,rpm | 7a-1 done: big/bar/status/rows/ro → ui.monitor | 7a done: graph canvas → Monitor trace `hist` (two series, 0–100 % of the old axis ranges), warn → status (tone warn) | 7a done |
| ecu | bespoke | chip; 5 ui.chip calls; 9 ro-* ids; badge | - | chip → Monitor via wrapper (works, unchanged) | - | 7b |
| egr | guided | big+bar (NOx (ppm)); 2 chip rows; 9 ro rows (grid→rows); canvas #egr-graph; warn #egr-warn | chip rows share ro ids: lift,temp | 7a-1 done: big/bar/status/rows/ro → ui.monitor | 7a done: graph canvas → Monitor trace `hist` (two series, 0–100 % of the old axis ranges), warn → status (tone warn) | 7a done |
| electrical | bespoke | chip; 23 ui.chip calls; 1 setRpmLabel; canvas #waveform-canvas; badge | - | chip → Monitor via wrapper (works, unchanged) | 7a done: `eng` row already prints the same engine rpm; setRpmLabel deleted (duplicate removed) | 7a done (rpm label) + 7b (canvases/rows) |
| engine | bespoke | chip; 4 ui.chip calls; badge | - | chip → Monitor via wrapper (works, unchanged) | - | 7b |
| exhaustsystem | bespoke | chip; 19 ui.chip calls; 1 setRpmLabel; canvas #spectrum-strip; badge | - | chip → Monitor via wrapper (works, unchanged) | 7a done: `eng` row already prints the same rpm; setRpmLabel deleted (duplicate removed) | 7a done (rpm label) + 7b (canvases/rows) |
| fuelpump | guided | big+bar (Rail pressure); 2 chip rows; 8 ro rows (grid→rows); canvas #fp-graph; warn #fp-warn | big value = ro row press (dropped from rows); chip rows share ro ids: supply,cur | 7a-1 done: big/bar/status/rows/ro → ui.monitor | 7a done: graph canvas → Monitor trace `hist` (two series, 0–100 % of the old axis ranges), warn → status (tone warn) | 7a done |
| gearbox | bespoke | chip; 5 ui.chip calls; canvas #torque-canvas; badge | - | chip → Monitor via wrapper (works, unchanged) | - | 7b |
| ignition | bespoke | chip; 10 ui.chip calls; 1 setRpmLabel; canvas #adv-curve | - | chip → Monitor via wrapper (works, unchanged) | 7a done: `rpm` row + the dock RPM axis already show it; setRpmLabel deleted (duplicate removed) | 7a done (rpm label) + 7b (canvases/rows) |
| intercooler | guided | big+bar (Effectiveness); 2 chip rows; 10 ro rows (grid→rows); canvas #ic-graph; warn #ic-warn | big value = ro row eff (dropped from rows); chip rows share ro ids: tin,gain | 7a-1 done: big/bar/status/rows/ro → ui.monitor | 7a done: graph canvas → Monitor trace `hist` (two series, 0–100 % of the old axis ranges), warn → status (tone warn) | 7a done |
| lighting | guided | big+bar (-); 0 chip rows; 0 ro rows (grid→rows); no canvas | - | 7a-1 done: big/bar/status/rows/ro → ui.monitor | - | 7a |
| lubrication | bespoke | chip; 6 ui.chip calls; canvas #temp-graph | - | chip → Monitor via wrapper (works, unchanged) | - | 7b |
| mpfi | bespoke | chip; 6 ui.chip calls; 1 setRpmLabel; canvas #mp-graph; badge | - | chip → Monitor via wrapper (works, unchanged) | 7a done: row `rpm` 'Engine speed' | 7a done (rpm label) + 7b (canvases/rows) |
| obd2 | bespoke | chip; 5 ui.chip calls; 7 ro-* ids; badge | - | chip → Monitor via wrapper (works, unchanged) | - | 7b |
| oilfilter | guided | big+bar (Pressure drop); 2 chip rows; 5 ro rows (grid→rows); no canvas | big value = ro row dp (dropped from rows); chip rows share ro ids: thru | 7a-1 done: big/bar/status/rows/ro → ui.monitor | - | 7a |
| oilpump | guided | big+bar (Oil pressure); 2 chip rows; 9 ro rows (grid→rows); canvas #oilp-graph; warn #oilp-warn | big value = ro row press (dropped from rows); chip rows share ro ids: flow,relief | 7a-1 done: big/bar/status/rows/ro → ui.monitor | 7a done: graph canvas → Monitor trace `hist` (two series, 0–100 % of the old axis ranges), warn → status (tone warn) | 7a done |
| radiator | guided | big+bar (Heat rejected); 2 chip rows; 11 ro rows (grid→rows); canvas #rad-graph; warn #rad-warn | big value = ro row qout (dropped from rows); chip rows share ro ids: tin,tout | 7a-1 done: big/bar/status/rows/ro → ui.monitor | 7a done: graph canvas → Monitor trace `hist` (two series, 0–100 % of the old axis ranges), warn → status (tone warn) | 7a done |
| sensors | bespoke | canvas #sc | - | - | - | 7b |
| sparkplug | guided | big+bar (Required voltage); 2 chip rows; 7 ro rows (grid→rows); no canvas | big value = ro row req (dropped from rows); chip rows share ro ids: gap,burn | 7a-1 done: big/bar/status/rows/ro → ui.monitor | - | 7a |
| starting-system | bespoke | chip; 24 ui.chip calls; 1 setRpmLabel; canvas #rpm-strip; badge | - | chip → Monitor via wrapper (works, unchanged) | 7a done: row `rpm` 'Engine speed' (the big value shows A / starter rpm, so it is not a duplicate) | 7a done (rpm label) + 7b (canvases/rows) |
| steering | bespoke | chip; 5 ui.chip calls; badge | - | chip → Monitor via wrapper (works, unchanged) | - | 7b |
| suspension | bespoke | chip; 7 ui.chip calls; 2 setRpmLabel; badge | - | chip → Monitor via wrapper (works, unchanged) | 7a done: `speed` row already prints km/h; both setRpmLabel calls deleted (duplicate removed) | 7a done |
| thermostat | guided | big+bar (Coolant temp); 2 chip rows; 8 ro rows (grid→rows); no canvas | big value = ro row temp (dropped from rows); chip rows share ro ids: open,rad | 7a-1 done: big/bar/status/rows/ro → ui.monitor | - | 7a |
| transmission | bespoke | chip; 12 ui.chip calls | - | chip → Monitor via wrapper (works, unchanged) | - | 7b |
| turbocharger | bespoke | chip; 7 ui.chip calls; 1 setRpmLabel; badge | - | chip → Monitor via wrapper (works, unchanged) | 7a done: row `rpm` 'Engine speed' (the `drive` row is turbine rpm, a different quantity) | 7a done |
| tyres | guided | big+bar (Contact patch); 2 chip rows; 7 ro rows (grid→rows); no canvas | big value = ro row patch (dropped from rows); chip rows share ro ids: patch,wear | 7a-1 done: big/bar/status/rows/ro → ui.monitor | - | 7a |
| valvetrain | bespoke | chip; 5 ui.chip calls; 9 ro-* ids | - | chip → Monitor via wrapper (works, unchanged) | - | 7b |
| wiring | guided | big+bar (Current); 2 chip rows; 7 ro rows (grid→rows); no canvas | big value = ro row amps (dropped from rows); chip rows share ro ids: fuse,temp | 7a-1 done: big/bar/status/rows/ro → ui.monitor | - | 7a |

## Notes
- Guided modules: the panel `ro-*` grid is gone; its rows live in the Monitor. A ro row whose label equals the big-value label is dropped (same number); chip rows that share an id with a ro row are one row.
- Bespoke modules still call `ui.chip.*` / build their own panel grids; those calls now land in the Monitor through thin wrappers (deleted in 7b).
- `ui.toolbar.setRpmLabel` has no caller left in any page (7a-2); the kit keeps the definition until 7b deletes it.
- 7a-2 (this zip): the ten guided graph modules and all 13 rpm-label callers are done. Duplicates removed: abs-esc (static unit), electrical, exhaustsystem, ignition, suspension.
- Trace values are normalised to 0–100 % of each old axis range, so both series keep their old shape; the caption says "% of full scale".
- Duplicates for bespoke modules need a human read of each page (listed under 7b); this scan only flags where two surfaces exist.
