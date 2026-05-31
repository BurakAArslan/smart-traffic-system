def retrieve_rag_context(query: str, top_k: int = 1):
    from src.rag.rag_store import get_collection, embed_text

    collection = get_collection()
    query_embedding = embed_text(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=1
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    contexts = []

    for doc, meta in zip(documents, metadatas):
        cleaned_doc = (
            doc
            .replace("SISLI_HAVA_SURUS", "")
            .replace("YAGMURLU_HAVA_SURUS", "")
            .replace("BUZLANMA_SURUS", "")
            .replace("KARLI_HAVA_SURUS", "")
            .strip()
        )

        contexts.append({
            "text": cleaned_doc,
            "source": meta.get("source", "unknown")
        })

    return contexts


def build_rag_query_from_route(route: dict):
    parts = []

    traffic_level = route.get("traffic_level")
    risk_level = route.get("risk_level")
    incident_count = route.get("incident_count", 0)
    weather_risk = route.get("weather_risk")

    if traffic_level:
        parts.append(f"Trafik yoğunluğu {traffic_level}")

    if risk_level:
        parts.append(f"Rota risk seviyesi {risk_level}")

    if incident_count and incident_count > 0:
        parts.append("Rota üzerinde kaza yol çalışması veya trafik olayı")

    if weather_risk and weather_risk != "low":
        parts.append(f"Hava durumu riski {weather_risk}")

    if not parts:
        parts.append("Güvenli sürüş önerileri")

    return " ".join(parts)


def generate_rag_advice(route: dict):
    query = build_rag_query_from_route(route)

    contexts = retrieve_rag_context(
        query,
        top_k=1
    )

    if not contexts:
        return {
            "rag_query": query,
            "rag_contexts": [],
            "rag_advice": ""
        }

    seen = set()
    advice_lines = []

    for item in contexts:
        text = item["text"].strip()
        text = text.replace("SISLI_HAVA_SURUS", "")
        text = text.replace("YAGMURLU_HAVA_SURUS", "")
        text = text.replace("BUZLANMA_SURUS", "")
        text = text.replace("KARLI_HAVA_SURUS", "")

        sentences = text.split(".")

        for sentence in sentences:
            sentence = sentence.strip()

            if len(sentence) < 20:
                continue

            if sentence in seen:
                continue

            seen.add(sentence)
            advice_lines.append(f"- {sentence}.")

            if len(advice_lines) >= 2:
                break

        if len(advice_lines) >= 2:
            break

    return {
        "rag_query": query,
        "rag_contexts": contexts,
        "rag_advice": "\n".join(advice_lines)
    }