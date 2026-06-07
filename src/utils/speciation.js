export function calculateSpeciation(aminoAcid) {
  const orderedPKas = getOrderedPKas(aminoAcid);
  const k1 = pKaToKa(orderedPKas[0]);
  const k2 = pKaToKa(orderedPKas[1]);
  const k3 = orderedPKas[2] === undefined ? null : pKaToKa(orderedPKas[2]);
  const points = [];

  for (let pH = 0; pH <= 14.0001; pH += 0.1) {
    const h = Math.pow(10, -pH);
    const species = k3 === null
      ? calculateTwoGroupFractions(h, k1, k2)
      : calculateThreeGroupFractions(h, k1, k2, k3);

    points.push({ pH: Number(pH.toFixed(1)), species });
  }

  return points;
}

export function calculateIsoelectricPoint(aminoAcid) {
  if (aminoAcid.pKaR === null) {
    return average(aminoAcid.pKa1, aminoAcid.pKa2);
  }

  if (aminoAcid.sideChain === "acidic") {
    return average(aminoAcid.pKa1, aminoAcid.pKaR);
  }

  if (aminoAcid.sideChain === "basic") {
    return average(aminoAcid.pKa2, aminoAcid.pKaR);
  }

  return average(aminoAcid.pKa1, aminoAcid.pKa2);
}

export function getSpeciesLabels(aminoAcid) {
  if (aminoAcid.pKaR === null) {
    return ["Cationic", "Zwitterionic", "Anionic"];
  }

  if (aminoAcid.sideChain === "basic") {
    return ["+2", "+1", "Neutral", "-1"];
  }

  return ["+1", "Neutral", "-1", "-2"];
}

function calculateTwoGroupFractions(h, k1, k2) {
  const d = h ** 2 + k1 * h + k1 * k2;

  return [
    h ** 2 / d,
    k1 * h / d,
    k1 * k2 / d
  ];
}

function calculateThreeGroupFractions(h, k1, k2, k3) {
  const d = h ** 3 + k1 * h ** 2 + k1 * k2 * h + k1 * k2 * k3;

  return [
    h ** 3 / d,
    k1 * h ** 2 / d,
    k1 * k2 * h / d,
    k1 * k2 * k3 / d
  ];
}

function getOrderedPKas(aminoAcid) {
  return [aminoAcid.pKa1, aminoAcid.pKa2, aminoAcid.pKaR]
    .filter((value) => value !== null)
    .sort((a, b) => a - b);
}

function pKaToKa(pKa) {
  return Math.pow(10, -pKa);
}

function average(a, b) {
  return (a + b) / 2;
}
