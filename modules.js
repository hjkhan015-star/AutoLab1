// ═══════════════════════════════════════════════════════════════════════
// modules.js — Auto Lab registry: SYSTEMS and their MODULES in ONE file.
//
// ADD A NEW MODULE  →  add one object inside the "modules" list of the
// system it belongs to (order in the list = learning order). Nothing else.
//
//   id        unique key (URLs, messages, localStorage)
//   label     short name on the card
//   title     full title in the module header
//   subtitle  category · sub-line
//   file      relative path to the module HTML
//   color     accent colour (hex)
//   icon      raw SVG inner markup (24×24, stroke-based)
//   level     'Basic' | 'Intermediate' | 'Advanced'      (default Basic)
//   min       estimated minutes                          (default 10)
//   mode      '3D' | '2D' | '2D + 3D'                    (default 3D)
//
// ADD A NEW SYSTEM  →  add an object to SYSTEMS below:
//   id, domain (one of DOMAINS), title, color, icon, blurb,
//   flow     ["Label"] or ["Label|moduleId"]  (clickable step)
//   soon     roadmap cards shown dimmed        related  other system ids
//   modules  the list of module objects
// ═══════════════════════════════════════════════════════════════════════

const DOMAINS = ["Engine", "Electrical & Control", "Drivetrain", "Chassis"];

const SYSTEMS = [
  {
    id: "engine", domain: "Engine", title: "Engine Mechanical", color: "#38bdf8",
    blurb: "The four-stroke cycle, valvetrain and moving parts that turn fuel into rotation.",
    icon: "<circle cx=\"12\" cy=\"15\" r=\"4\"/><line x1=\"12\" y1=\"11\" x2=\"12\" y2=\"7\"/><rect x=\"9\" y=\"3\" width=\"6\" height=\"4\" rx=\"1\"/><line x1=\"4\" y1=\"20\" x2=\"20\" y2=\"20\"/>",
    flow: ["Intake|engine", "Compression|engine", "Power|engine", "Exhaust|engine"],
    soon: ["Valvetrain", "Crankshaft & Pistons"],
    related: ["fuel", "ignition", "lube"],
    modules: [
      { id: "engine", label: "Engine", title: "4-Stroke Engine",
        subtitle: "Automotive · Cycle & Valvetrain",
        file: "engine.html", color: "#38bdf8",
        level: "Basic", min: 12, mode: "3D",
        icon: "<circle cx=\"12\" cy=\"15\" r=\"4\"/><line x1=\"12\" y1=\"11\" x2=\"12\" y2=\"7\"/><rect x=\"9\" y=\"3\" width=\"6\" height=\"4\" rx=\"1\"/><line x1=\"4\" y1=\"20\" x2=\"20\" y2=\"20\"/>" }
    ]
  },
  {
    id: "air", domain: "Engine", title: "Air Intake & Boost", color: "#fb7185",
    blurb: "Getting more air into the cylinders: filtering, compressing and cooling the charge.",
    icon: "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\" fill=\"currentColor\"/><line x1=\"12\" y1=\"4\" x2=\"12\" y2=\"9.5\"/><line x1=\"12\" y1=\"14.5\" x2=\"12\" y2=\"20\"/><line x1=\"4\" y1=\"12\" x2=\"9.5\" y2=\"12\"/><line x1=\"14.5\" y1=\"12\" x2=\"20\" y2=\"12\"/>",
    flow: ["Air filter", "Compressor|turbo", "Intercooler", "Throttle", "Cylinder"],
    soon: ["Air Filter & Intake", "Intercooler"],
    related: ["exhaust", "fuel"],
    modules: [
      { id: "turbo", label: "Turbo", title: "Turbocharger",
        subtitle: "Forced Induction · Boost",
        file: "turbocharger.html", color: "#fb7185",
        level: "Advanced", min: 15, mode: "3D",
        icon: "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\" fill=\"currentColor\"/><line x1=\"12\" y1=\"4\" x2=\"12\" y2=\"9.5\"/><line x1=\"12\" y1=\"14.5\" x2=\"12\" y2=\"20\"/><line x1=\"4\" y1=\"12\" x2=\"9.5\" y2=\"12\"/><line x1=\"14.5\" y1=\"12\" x2=\"20\" y2=\"12\"/>" }
    ]
  },
  {
    id: "fuel", domain: "Engine", title: "Fuel Supply", color: "#10b981",
    blurb: "Storing, delivering and metering fuel: from the tank to the cylinder.",
    icon: "<rect x=\"9\" y=\"3\" width=\"6\" height=\"5\" rx=\"1\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"13\"/><path d=\"M8 17l4-4 4 4M9 21h6\"/>",
    flow: ["Tank", "Pump", "Filter", "Carburetor|carburetor", "Injector|mpfi", "Cylinder"],
    soon: ["Fuel Pump & Tank", "Diesel Common Rail"],
    related: ["sensors", "air", "ignition"],
    modules: [
      { id: "carburetor", label: "Carb", title: "Carburetor",
        subtitle: "Fuel System · Venturi",
        file: "carburetor.html", color: "#f59e0b",
        level: "Basic", min: 10, mode: "3D",
        icon: "<path d=\"M12 3c-3 5-6 8-6 11a6 6 0 0 0 12 0c0-3-3-6-6-11z\"/>" },
      { id: "mpfi", label: "Injection", title: "Electronic Fuel Injection (MPFI)",
        subtitle: "Fuel System · Port / Common Rail",
        file: "mpfi.html", color: "#10b981",
        level: "Intermediate", min: 14, mode: "3D",
        icon: "<rect x=\"9\" y=\"3\" width=\"6\" height=\"5\" rx=\"1\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"13\"/><path d=\"M8 17l4-4 4 4M9 21h6\"/>" }
    ]
  },
  {
    id: "ignition", domain: "Engine", title: "Ignition", color: "#f97316",
    blurb: "Creating and timing the spark that starts combustion.",
    icon: "<path d=\"M13 2L3 14h7l-1 8 10-12h-7l1-8z\"/>",
    flow: ["Battery", "Coil|ignition", "Timing", "Spark plug", "Cylinder"],
    soon: ["Spark Plugs", "Coil-on-Plug"],
    related: ["elec", "sensors", "engine"],
    modules: [
      { id: "ignition", label: "Ignition", title: "Ignition System",
        subtitle: "Electrical · Coil & Timing",
        file: "ignition.html", color: "#f97316",
        level: "Intermediate", min: 12, mode: "3D",
        icon: "<path d=\"M13 2L3 14h7l-1 8 10-12h-7l1-8z\"/>" }
    ]
  },
  {
    id: "lube", domain: "Engine", title: "Lubrication", color: "#84cc16",
    blurb: "Oil circulation that reduces friction, carries heat and protects bearings.",
    icon: "<path d=\"M12 3c-2 3-5 7-5 10a5 5 0 0 0 10 0c0-3-3-7-5-10z\"/><circle cx=\"12\" cy=\"14\" r=\"2\"/>",
    flow: ["Sump", "Pump|lubrication", "Filter", "Gallery", "Bearings"],
    soon: ["Oil Pump Types", "Oil Filters"],
    related: ["cooling", "engine"],
    modules: [
      { id: "lubrication", label: "Lubrication", title: "Lubrication System",
        subtitle: "Engine · Oil & Wear",
        file: "lubrication.html", color: "#84cc16",
        level: "Basic", min: 10, mode: "3D",
        icon: "<path d=\"M12 3c-2 3-5 7-5 10a5 5 0 0 0 10 0c0-3-3-7-5-10z\"/><circle cx=\"12\" cy=\"14\" r=\"2\"/>" }
    ]
  },
  {
    id: "cooling", domain: "Engine", title: "Cooling", color: "#06b6d4",
    blurb: "Removing excess heat and holding the engine at its best operating temperature.",
    icon: "<path d=\"M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z\"/>",
    flow: ["Engine block", "Thermostat", "Radiator", "Water pump|cooling"],
    soon: ["Thermostat", "Radiator"],
    related: ["lube", "sensors"],
    modules: [
      { id: "cooling", label: "Cooling", title: "Cooling System",
        subtitle: "Engine Cooling · Air / Liquid",
        file: "cooling.html", color: "#06b6d4",
        level: "Basic", min: 10, mode: "3D",
        icon: "<path d=\"M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z\"/>" }
    ]
  },
  {
    id: "exhaust", domain: "Engine", title: "Exhaust & Emissions", color: "#78909c",
    blurb: "Carrying burnt gases away, cleaning them and quieting the noise.",
    icon: "<path d=\"M3 14h4l2-6 4 10 3-6h5\"/><circle cx=\"6\" cy=\"17\" r=\"1.2\"/><circle cx=\"20\" cy=\"17\" r=\"1.2\"/>",
    flow: ["Manifold|exhaustsystem", "Catalyst|exhaustsystem", "Muffler|exhaustsystem", "Tailpipe|exhaustsystem"],
    soon: ["Catalytic Converter", "EGR", "DPF"],
    related: ["air", "sensors"],
    modules: [
      { id: "exhaustsystem", label: "Exhaust", title: "Exhaust System",
        subtitle: "Emissions · Silencer & Catalyst",
        file: "exhaustsystem.html", color: "#78909c",
        level: "Basic", min: 10, mode: "3D",
        icon: "<path d=\"M3 14h4l2-6 4 10 3-6h5\"/><circle cx=\"6\" cy=\"17\" r=\"1.2\"/><circle cx=\"20\" cy=\"17\" r=\"1.2\"/>" }
    ]
  },
  {
    id: "elec", domain: "Electrical & Control", title: "Electrical & Starting", color: "#fbbf24",
    blurb: "Battery, starter and alternator: storing, using and regenerating electrical energy.",
    icon: "<rect x=\"3\" y=\"8\" width=\"14\" height=\"8\" rx=\"1.5\"/><line x1=\"17\" y1=\"10\" x2=\"21\" y2=\"10\"/><line x1=\"17\" y1=\"14\" x2=\"21\" y2=\"14\"/><line x1=\"5\" y1=\"10\" x2=\"5\" y2=\"14\"/><line x1=\"9\" y1=\"10\" x2=\"9\" y2=\"14\"/>",
    flow: ["Battery|electrical", "Starter|starting", "Engine", "Alternator|electrical", "Battery|electrical"],
    soon: ["Lighting", "Wiring Harness"],
    related: ["ignition", "sensors"],
    modules: [
      { id: "electrical", label: "Electrical", title: "Battery · Starter · Alternator",
        subtitle: "Electrical · Charging",
        file: "electrical.html", color: "#fbbf24",
        level: "Basic", min: 12, mode: "3D",
        icon: "<rect x=\"3\" y=\"8\" width=\"14\" height=\"8\" rx=\"1.5\"/><line x1=\"17\" y1=\"10\" x2=\"21\" y2=\"10\"/><line x1=\"17\" y1=\"14\" x2=\"21\" y2=\"14\"/><line x1=\"5\" y1=\"10\" x2=\"5\" y2=\"14\"/><line x1=\"9\" y1=\"10\" x2=\"9\" y2=\"14\"/>" },
      { id: "starting", label: "Starting", title: "Starting System",
        subtitle: "Electrical · Starter Motor",
        file: "starting-system.html", color: "#818cf8",
        level: "Basic", min: 10, mode: "3D",
        icon: "<rect x=\"2\" y=\"8\" width=\"11\" height=\"8\" rx=\"2\"/><line x1=\"13\" y1=\"12\" x2=\"17\" y2=\"12\"/><circle cx=\"19.5\" cy=\"12\" r=\"2\"/><path d=\"M6.5 10l-1.2 3h2.4l-1.2 3\"/>" }
    ]
  },
  {
    id: "sensors", domain: "Electrical & Control", title: "Sensors & Control", color: "#22c55e",
    blurb: "How sensors, the ECU and actuators work together to manage the engine.",
    icon: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M6 12a6 6 0 0 1 12 0M3 12a9 9 0 0 1 18 0\"/>",
    flow: ["Sensors|sensors", "ECU", "Actuators", "Engine"],
    soon: ["ECU", "OBD-II Diagnostics"],
    related: ["fuel", "ignition", "elec"],
    modules: [
      { id: "sensors", label: "Sensors", title: "Sensors & Wiring",
        subtitle: "Electrical · Sensing & Control",
        file: "sensors.html", color: "#22c55e",
        level: "Intermediate", min: 15, mode: "2D + 3D",
        icon: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M6 12a6 6 0 0 1 12 0M3 12a9 9 0 0 1 18 0\"/>" }
    ]
  },
  {
    id: "drive", domain: "Drivetrain", title: "Transmission & Drivetrain", color: "#3b82f6",
    blurb: "Carrying engine power through clutch, gears and differential to the wheels.",
    icon: "<rect x=\"3\" y=\"9\" width=\"8\" height=\"6\" rx=\"1\"/><rect x=\"13\" y=\"9\" width=\"8\" height=\"6\" rx=\"1\"/><line x1=\"11\" y1=\"12\" x2=\"13\" y2=\"12\"/>",
    flow: ["Engine", "Clutch|clutch", "Gearbox|gearbox", "Driveshaft", "Differential|differential", "Wheels"],
    soon: ["Driveshafts", "4WD / AWD"],
    related: ["engine", "chassis"],
    modules: [
      { id: "transmission", label: "Trans", title: "Transmission System",
        subtitle: "Drivetrain · 2W / 4W",
        file: "transmission.html", color: "#3b82f6",
        level: "Basic", min: 10, mode: "3D",
        icon: "<rect x=\"3\" y=\"9\" width=\"8\" height=\"6\" rx=\"1\"/><rect x=\"13\" y=\"9\" width=\"8\" height=\"6\" rx=\"1\"/><line x1=\"11\" y1=\"12\" x2=\"13\" y2=\"12\"/>" },
      { id: "clutch", label: "Clutch", title: "Clutch",
        subtitle: "Transmission · Friction Disc",
        file: "clutch.html", color: "#e11d48",
        level: "Basic", min: 10, mode: "3D",
        icon: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><line x1=\"12\" y1=\"3\" x2=\"12\" y2=\"6\"/><line x1=\"12\" y1=\"18\" x2=\"12\" y2=\"21\"/><line x1=\"3\" y1=\"12\" x2=\"6\" y2=\"12\"/><line x1=\"18\" y1=\"12\" x2=\"21\" y2=\"12\"/>" },
      { id: "gearbox", label: "Gearbox", title: "Manual Gearbox",
        subtitle: "Transmission · H-Pattern",
        file: "gearbox.html", color: "#22c55e",
        level: "Intermediate", min: 14, mode: "3D",
        icon: "<line x1=\"6\" y1=\"4\" x2=\"6\" y2=\"20\"/><line x1=\"12\" y1=\"4\" x2=\"12\" y2=\"12\"/><line x1=\"18\" y1=\"4\" x2=\"18\" y2=\"12\"/><line x1=\"12\" y1=\"12\" x2=\"18\" y2=\"12\"/>" },
      { id: "automatic", label: "Auto", title: "Automatic Transmission",
        subtitle: "Drivetrain · Torque Converter",
        file: "automatic.html", color: "#2dd4bf",
        level: "Advanced", min: 16, mode: "3D",
        icon: "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><line x1=\"12\" y1=\"4\" x2=\"12\" y2=\"9\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"20\"/><line x1=\"4\" y1=\"12\" x2=\"9\" y2=\"12\"/><line x1=\"15\" y1=\"12\" x2=\"20\" y2=\"12\"/>" },
      { id: "differential", label: "Diff", title: "Differential",
        subtitle: "Drivetrain · Torque Split",
        file: "differential.html", color: "#eab308",
        level: "Intermediate", min: 12, mode: "3D",
        icon: "<circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"12\" r=\"3\"/><line x1=\"9\" y1=\"12\" x2=\"15\" y2=\"12\"/><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"6\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"18\"/>" }
    ]
  },
  {
    id: "chassis", domain: "Chassis", title: "Steering, Suspension & Brakes", color: "#a855f7",
    blurb: "Directing the vehicle, absorbing the road and bringing it safely to a stop.",
    icon: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/><line x1=\"12\" y1=\"3\" x2=\"12\" y2=\"9.5\"/><line x1=\"4.5\" y1=\"16.5\" x2=\"9.9\" y2=\"13.2\"/><line x1=\"19.5\" y1=\"16.5\" x2=\"14.1\" y2=\"13.2\"/>",
    flow: ["Driver", "Steering|steering", "Suspension|suspension", "Tyres", "Brakes|braking"],
    soon: ["ABS & ESC", "Wheels & Tyres"],
    related: ["drive"],
    modules: [
      { id: "steering", label: "Steering", title: "Steering System",
        subtitle: "Steering · Rack & Pinion",
        file: "steering.html", color: "#a855f7",
        level: "Basic", min: 12, mode: "3D",
        icon: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/><line x1=\"12\" y1=\"3\" x2=\"12\" y2=\"9.5\"/><line x1=\"4.5\" y1=\"16.5\" x2=\"9.9\" y2=\"13.2\"/><line x1=\"19.5\" y1=\"16.5\" x2=\"14.1\" y2=\"13.2\"/>" },
      { id: "suspension", label: "Suspension", title: "Suspension System",
        subtitle: "Chassis · Springs & Dampers",
        file: "suspension.html", color: "#ec4899",
        level: "Basic", min: 12, mode: "3D",
        icon: "<path d=\"M7 3h10M7 21h10M6 3c0 3 12 3 12 6s-12 3-12 6 12 3 12 6\"/>" },
      { id: "braking", label: "Brakes", title: "Hydraulic Braking System",
        subtitle: "Chassis · Disc & Drum",
        file: "braking.html", color: "#ef4444",
        level: "Intermediate", min: 14, mode: "3D",
        icon: "<circle cx=\"11\" cy=\"12\" r=\"7\"/><circle cx=\"11\" cy=\"12\" r=\"2.5\"/><rect x=\"16\" y=\"8\" width=\"4\" height=\"8\" rx=\"1\"/>" }
    ]
  }
];

/* ── Derived globals used by the shell (do not edit) ─────────────────── */
window.AUTO_DOMAINS = DOMAINS;
window.AUTO_MODULES = [];
window.AUTO_META    = {};
window.AUTO_SYSTEMS = SYSTEMS.map(function (s) {
  s.modules.forEach(function (m) {
    window.AUTO_MODULES.push(m);
    window.AUTO_META[m.id] = [m.level || 'Basic', m.min || 10, m.mode || '3D'];
  });
  return Object.assign({}, s, { modules: s.modules.map(function (m) { return m.id; }) });
});
