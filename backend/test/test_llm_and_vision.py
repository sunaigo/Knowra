import os
import pytest
import base64
from core.model.llm.factory import LLMFactory
from core.model.vision.factory import VisionModelFactory
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()  # 自动加载 .env 文件

api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL")
model = os.getenv("OPENAI_MODEL")
vision_model = os.getenv("OPENAI_VISION_MODEL")


# 路径可替换为实际存在的图片
SAMPLE_IMAGE_PATH = os.path.join(os.path.dirname(__file__), "sample.jpg")

@pytest.mark.parametrize("provider,config", [
    ("openai", {"provider": "openai", "base_url": base_url, "api_key": api_key, "model": model})
])
def test_llm_dialog(provider, config):
    llm = LLMFactory.create(config)
    # 简单对话测试
    messages = [HumanMessage(content="Hello, who are you?")]
    try:
        response = llm.invoke(messages)
        print(f"[{provider}] LLM response: {response}")
        assert response is not None
    except Exception as e:
        print(f"[{provider}] LLM invoke failed: {e}")




@pytest.mark.parametrize("provider,config", [
    ("openai", {"provider": "openai", "base_url": base_url, "api_key": api_key, "model": vision_model})
])
def test_vision_model_image_understanding(provider, config):
    vision = VisionModelFactory.create(config)
    # 读取本地图片并base64编码
    if not os.path.exists(SAMPLE_IMAGE_PATH):
        print(f"Sample image not found: {SAMPLE_IMAGE_PATH}")
        return
    with open(SAMPLE_IMAGE_PATH, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")
    # 构造多模态输入
    messages = [
        HumanMessage(content=[
            {"type": "text", "text": "Describe this image in detail."},
            {"type": "image", "source_type": "base64", "data": image_data, "mime_type": "image/jpeg"}
        ])
    ]
    try:
        response = vision.invoke(messages)
        print(f"[{provider}] Vision response: {response}")
        assert response is not None
    except Exception as e:
        print(f"[{provider}] Vision invoke failed: {e}") 