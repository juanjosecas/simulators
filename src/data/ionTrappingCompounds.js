export const ionTrappingCompounds = {
  naproxen: {
    name: "Naproxen",
    type: "acid",
    pKa: 4.15,
    logP: 3.18,
    real: true,
    note: "Weak acid. Useful for visualizing accumulation in the more alkaline compartment."
  },
  lidocaine: {
    name: "Lidocaine",
    type: "base",
    pKa: 7.94,
    logP: 2.30,
    real: true,
    note: "Weak base. Acidic compartments increase protonation and ion trapping."
  },
  amphetamine: {
    name: "Amphetamine",
    type: "base",
    pKa: 9.90,
    logP: 1.76,
    real: true,
    note: "Weak base. A strong pH gradient can produce marked accumulation in the acidic compartment."
  },
  customAcid: {
    name: "Custom weak acid",
    type: "acid",
    pKa: 4.50,
    logP: 2.00,
    real: false,
    note: "Invented monoprotic weak acid. Edit all parameters."
  },
  customBase: {
    name: "Custom weak base",
    type: "base",
    pKa: 8.50,
    logP: 2.00,
    real: false,
    note: "Invented monoprotic weak base. Edit all parameters."
  }
};
