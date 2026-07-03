from rapidfuzz import fuzz


def best_match_score(line: str, labels: list[str]) -> float:
  scores = [fuzz.partial_ratio(line, label) for label in labels]
  return max(scores) if scores else 0
