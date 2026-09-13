/**
 * Confidence Scorer & Explanation Generator
 * Computes quantifiable confidence (0-100%) and concise rationale for decisions
 */

export function calculateConfidence({
  intent,
  intentKeywords = [],
  entitiesFound = [],
  entitiesRequired = [],
  ambiguityFlags = [],
  securityRiskDetected = false,
  contradictions = []
}) {
  if (securityRiskDetected) {
    return {
      score: 0.10,
      percentage: 10,
      level: 'CRITICAL_RISK',
      rationale: 'Security policy violation or prompt injection pattern detected in input.',
      factors: {
        intentConfidence: 0.10,
        entityCompleteness: 0.0,
        contextConsistency: 0.0,
        riskFactor: 1.0
      }
    };
  }

  // 1. Intent keyword clarity (0.0 - 1.0)
  let intentScore = 0.50;
  if (intentKeywords.length >= 3) {
    intentScore = 0.95;
  } else if (intentKeywords.length >= 1) {
    intentScore = 0.80;
  }

  // 2. Entity completeness (0.0 - 1.0)
  let entityScore = 0.60;
  if (entitiesRequired.length > 0) {
    const matched = entitiesRequired.filter(req => entitiesFound.includes(req));
    entityScore = matched.length / entitiesRequired.length;
  } else if (entitiesFound.length > 0) {
    entityScore = 0.85;
  }

  // 3. Context consistency (0.0 - 1.0)
  let consistencyScore = 1.0 - (contradictions.length * 0.35);
  consistencyScore = Math.max(0.10, consistencyScore);

  // 4. Risk / Ambiguity factor (0.0 - 1.0)
  let riskScore = 0.0;
  if (ambiguityFlags.length > 0) {
    riskScore += ambiguityFlags.length * 0.20;
  }
  riskScore = Math.min(1.0, riskScore);

  // Overall aggregate score
  let score = (intentScore * 0.35) + (entityScore * 0.35) + (consistencyScore * 0.20) - (riskScore * 0.15);
  score = Math.max(0.10, Math.min(0.98, score));
  const percentage = Math.round(score * 100);

  let level = 'HIGH';
  if (percentage < 60) level = 'LOW';
  else if (percentage < 80) level = 'MEDIUM';

  // Generate concise rationale
  let rationale = `Intent classified as '${intent}' based on detected parameters.`;
  if (level === 'HIGH') {
    rationale = `High confidence (${percentage}%): Explicit intent '${intent}' with ${entitiesFound.length} validated parameter(s).`;
  } else if (level === 'MEDIUM') {
    rationale = `Moderate confidence (${percentage}%): Clear intent '${intent}', but optional parameters may require clarification.`;
  } else {
    rationale = `Low confidence (${percentage}%): Ambiguous request or missing required parameters (${ambiguityFlags.join(', ') || 'unspecified'}).`;
  }

  return {
    score: Number(score.toFixed(2)),
    percentage,
    level,
    rationale,
    factors: {
      intentConfidence: Number(intentScore.toFixed(2)),
      entityCompleteness: Number(entityScore.toFixed(2)),
      contextConsistency: Number(consistencyScore.toFixed(2)),
      riskFactor: Number(riskScore.toFixed(2))
    }
  };
}
