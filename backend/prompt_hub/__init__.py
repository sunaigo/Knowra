import json
from pathlib import Path
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from typing import Union

def get_prompt(prompt_key: str) -> Union[PromptTemplate, ChatPromptTemplate]:
    """
    Load a prompt from local .template file by key.
    Automatically returns PromptTemplate or ChatPromptTemplate based on file content.
    Args:
        prompt_key: e.g. 'vision_image_description.zh' (without .template)
    Returns:
        PromptTemplate or ChatPromptTemplate
    Raises:
        FileNotFoundError if file does not exist
        ValueError if file format is invalid
    """
    prompt_dir = Path(__file__).parent
    file_path = prompt_dir / f"{prompt_key}.template"
    if not file_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        try:
            data = json.loads(content)
            # ChatPromptTemplate (multimodal or chat)
            if data.get("type") == "chat" and "messages" in data:
                return ChatPromptTemplate.from_messages(data["messages"])
        except Exception:
            pass
        # Fallback: treat as string template
        return PromptTemplate.from_template(content) 