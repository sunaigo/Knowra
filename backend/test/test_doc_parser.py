import os
import pytest
from dotenv import load_dotenv
from core.file_parser.doc_parser import WordFileParser
from core.model import ModelFactory
from common.schemas.model import ModelConfig
from core.file_parser.base_parser import ChunkParams

load_dotenv()

@pytest.fixture(scope="module")
def vision_model():
    config = ModelConfig(
        model_name=os.getenv("OPENAI_VISION_MODEL"),
        model_type="vision",
        provider=os.getenv("VISION_PROVIDER", "openai"),
        api_base=os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1"),
        api_key=os.getenv("OPENAI_API_KEY"),
        extra_config=None
    )

    print(config.model_dump())
    return ModelFactory.create(config)

@pytest.mark.skipif(not os.path.exists(os.path.join(os.path.dirname(__file__), "sample.docx")), reason="缺少测试用docx文件")
def test_word_parser_with_real_vision(vision_model):
    docx_path = os.path.join(os.path.dirname(__file__), "sample.docx")
    parser = WordFileParser(vision_model=vision_model)
    results = parser.parse_to_text_chunks_lazy(file_path=docx_path, chunk_params=ChunkParams(chunk_size=200, overlap=20))
    # 合并所有内容为一篇文章，图片/表格/标题等类型用简单分隔
    print("article result:\n", "\n".join([c for c in results]))
