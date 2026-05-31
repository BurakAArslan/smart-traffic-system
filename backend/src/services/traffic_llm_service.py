import torch
from pathlib import Path

from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer
)

from peft import (
    PeftModel,
    PeftConfig
)

MODEL_NAME = "Qwen/Qwen2.5-3B-Instruct"

BASE_DIR = Path(__file__).resolve().parents[1]

LORA_PATH = (
    BASE_DIR
    / "database"
    / "models"
    / "traffic_qwen_lora"
)

OFFLOAD_DIR = BASE_DIR / "offload"

OFFLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)

print(
    "ADAPTER EXISTS:",
    (LORA_PATH / "adapter_config.json").exists()
)

print("LORA PATH:", LORA_PATH)

print("OFFLOAD DIR:", OFFLOAD_DIR)

print("Base Qwen modeli yükleniyor...")

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME
)

from transformers import BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4"
)

base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config,
    device_map="auto",
    offload_folder=str(OFFLOAD_DIR),
    offload_state_dict=True
)

print("LoRA adapter yükleniyor...")

peft_config = PeftConfig.from_pretrained(
    str(LORA_PATH),
    local_files_only=True
)

model = PeftModel.from_pretrained(
    base_model,
    str(LORA_PATH),
    config=peft_config,
    local_files_only=True,
    offload_folder=str(OFFLOAD_DIR),
    offload_dir=str(OFFLOAD_DIR)
)

model.eval()

print("Traffic LoRA modeli hazır.")


def generate_traffic_response(user_message: str):

    messages = [
        {
            "role": "user",
            "content": user_message
        }
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = tokenizer(
        text,
        return_tensors="pt"
    ).to(model.device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=80,
        temperature=0.15,
        top_p=0.8,
        repetition_penalty=1.15,
        do_sample=True,
        eos_token_id=tokenizer.eos_token_id
    )

    generated_ids = outputs[0][
        inputs["input_ids"].shape[-1]:
    ]

    response = tokenizer.decode(
        generated_ids,
        skip_special_tokens=True
    )

    return response.strip()