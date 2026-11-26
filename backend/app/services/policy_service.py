from pathlib import Path

# policy doc lives next to the data folder
POLICY_FILE = Path(__file__).parent.parent.parent / "data" / "return_policy.txt"


def load_policy_text() -> str:
    if not POLICY_FILE.exists():
        return "Return policy document not found."
    return POLICY_FILE.read_text(encoding="utf-8")


def search_policy(query: str) -> str:
    """
    Basic keyword search over the policy file.
    Not RAG but works fine for a small policy doc like this.
    Returns the top matching paragraphs.
    """
    policy = load_policy_text()
    keywords = [w.lower() for w in query.split() if len(w) > 3]

    paragraphs = [p.strip() for p in policy.split("\n\n") if p.strip()]
    scored = []
    for para in paragraphs:
        lower = para.lower()
        score = sum(1 for kw in keywords if kw in lower)
        if score > 0:
            scored.append((score, para))

    if not scored:
        return policy  # just return the whole thing if nothing matches

    scored.sort(reverse=True, key=lambda x: x[0])
    return "\n\n".join(p for _, p in scored[:3])
