export function ionizationFactor(type, pH, pKa) {
  if (type === "acid") return 1 + Math.pow(10, pH - pKa);
  if (type === "base") return 1 + Math.pow(10, pKa - pH);
  return 1;
}

export function neutralFraction(type, pH, pKa) {
  return 1 / ionizationFactor(type, pH, pKa);
}

export function ionizedFraction(type, pH, pKa) {
  return 1 - neutralFraction(type, pH, pKa);
}

export function logD(type, pH, pKa, logP) {
  return logP - Math.log10(ionizationFactor(type, pH, pKa));
}

export function equilibriumDistribution({ type, pKa, pHA, pHB, volumeA, volumeB, totalAmount = 100 }) {
  const factorA = ionizationFactor(type, pHA, pKa);
  const factorB = ionizationFactor(type, pHB, pKa);
  const neutralConcentration = totalAmount / (volumeA * factorA + volumeB * factorB);
  const concentrationA = neutralConcentration * factorA;
  const concentrationB = neutralConcentration * factorB;
  const amountA = concentrationA * volumeA;
  const amountB = concentrationB * volumeB;

  return {
    factorA,
    factorB,
    neutralConcentration,
    concentrationA,
    concentrationB,
    amountA,
    amountB,
    fractionAmountA: amountA / totalAmount,
    fractionAmountB: amountB / totalAmount,
    ratioBA: concentrationB / concentrationA,
    logRatioBA: Math.log10(concentrationB / concentrationA)
  };
}

export function trappingCurve({ type, pKa, pHA, volumeA, volumeB, totalAmount = 100, step = 0.05 }) {
  const points = [];
  for (let pHB = 0; pHB <= 14.0001; pHB += step) {
    const eq = equilibriumDistribution({ type, pKa, pHA, pHB, volumeA, volumeB, totalAmount });
    points.push({ pHB, logRatioBA: eq.logRatioBA, ratioBA: eq.ratioBA });
  }
  return points;
}
