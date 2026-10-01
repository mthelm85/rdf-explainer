// How each publisher *wrote* a skill in its own documents before linking it
// to the shared framework. Used to simulate keyword (string) matching.
// Keys are skill local names in the sk: namespace.
export const PHRASING = {
  // Employers (job postings)
  acme: {
    "plc-programming": "Ladder logic",
    "robot-operation": "FANUC robot operation",
    "sensors-instrumentation": "Sensors",
    troubleshooting: "Troubleshooting",
    "electrical-safety": "NFPA 70E",
    "blueprint-reading": "Read schematics",
    python: "Python",
    sql: "SQL queries",
    "data-analysis": "Data analysis",
    teamwork: "Works well on a team"
  },
  north: {
    "plc-programming": "PLCs",
    "motor-controls": "Motor control circuits",
    wiring: "Conduit bending & wiring",
    "electrical-safety": "Electrical safety",
    "blueprint-reading": "Blueprint reading",
    troubleshooting: "Troubleshooting",
    "sensors-instrumentation": "Instrumentation",
    teamwork: "Communication"
  },
  // Education & training (credential competencies)
  rcc: {
    "plc-programming": "PLC Programming",
    "robot-operation": "Industrial Robot Operation",
    "sensors-instrumentation": "Sensors & Instrumentation",
    "hydraulics-pneumatics": "Fluid Power",
    "blueprint-reading": "Blueprint Reading",
    troubleshooting: "Troubleshooting",
    "electrical-safety": "Electrical Safety",
    python: "Python",
    sql: "Database Fundamentals",
    "data-analysis": "Data Analysis"
  },
  mea: {
    wiring: "Wiring Methods",
    "motor-controls": "Motor Controls",
    "electrical-safety": "NFPA 70E",
    "blueprint-reading": "Print Reading",
    "plc-programming": "PLCs",
    troubleshooting: "Troubleshooting"
  },
  // Workers' own words for skills they learned outside formal programs
  maria: {python: "Python"},
  jordan: {},
  sam: {teamwork: "Teamwork", "data-analysis": "Excel / data analysis"}
};

export function sourceOf(iri) {
  if (iri.includes("acme-robotics")) return "acme";
  if (iri.includes("northgate-electric")) return "north";
  if (iri.includes("riverbend-cc")) return "rcc";
  if (iri.includes("midstate-electrical")) return "mea";
  const m = iri.match(/wallet\.example\/(\w+)/);
  return m ? m[1] : null;
}
