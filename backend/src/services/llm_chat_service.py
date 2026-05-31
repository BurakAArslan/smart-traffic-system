from transformers import pipeline
import torch

pipe = None


def get_pipe():

    global pipe

    if pipe is None:

        pipe = pipeline(
            "text-generation",
            model="Qwen/Qwen2.5-3B-Instruct",
            device_map="auto",
            torch_dtype=torch.float16
        )

        print("LOADED MODEL:", pipe.model.name_or_path)

    return pipe


def generate_llm_chat(prompt: str):

    pipe = get_pipe()

    messages = [
        {
            "role": "system",
            "content": (
                "Sen akıllı trafik sistemi asistanısın. "
                "Kısa, net ve mantıklı cevaplar ver. "
                "Uydurma bilgi üretme. "
                "Kullanıcının verdiği trafik ve rota bilgilerine göre cevap ver."
            )
        },
        {
            "role": "user",
            "content": prompt
        }
    ]

    output = pipe(
        messages,
        max_new_tokens=80,
        temperature=0.2,
        top_p=0.9,
        repetition_penalty=1.1,
        do_sample=False
    )

    return output[0]["generated_text"][-1]["content"].strip()