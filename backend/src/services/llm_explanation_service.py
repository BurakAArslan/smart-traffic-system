from transformers import pipeline

pipe = None


def get_pipe():

    global pipe

    if pipe is None:

        pipe = pipeline(
            "text-generation",
            model="Qwen/Qwen2.5-3B-Instruct",
            device_map="auto",
            torch_dtype="auto"
        )

        print(
            "LOADED MODEL:",
            pipe.model.name_or_path
        )

    return pipe


def generate_llm_explanation(data):

    if "prompt" not in data:
        return None

    pipe = get_pipe()

    messages = [
        {
            "role": "system",
            "content": (
                "Sen modern bir trafik "
                "asistanısın. "
                "Kısa ve doğal Türkçe konuş. "
                "En fazla 2 cümle kullan."
            )
        },
        {
            "role": "user",
            "content": data["prompt"]
        }
    ]

    output = pipe(
        messages,
        max_new_tokens=50,
        temperature=0.3,
        do_sample=False
    )

    return output[0]["generated_text"][-1]["content"]