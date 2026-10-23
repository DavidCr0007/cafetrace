from typing import Optional


def predict_quality(temperature_c: Optional[float], humidity_pct: Optional[float], sca_score: Optional[float]) -> dict:
    """Baseline explicable; replace with trained model after dataset approval."""
    score = 0.5
    reasons = []
    if sca_score is not None:
        score += max(0, min(0.4, (sca_score - 70) / 75))
    if temperature_c is not None:
        score += 0.1 if 2 <= temperature_c <= 4 else -0.15
        reasons.append("temperatura dentro de cadena de frío" if 2 <= temperature_c <= 4 else "temperatura fuera de rango 2-4 C")
    if humidity_pct is not None:
        score += 0.05 if humidity_pct <= 65 else -0.05
    return {"model": "baseline-v0", "quality_probability": round(max(0, min(1, score)), 3), "reasons": reasons, "production_ready": False}
