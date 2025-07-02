from langchain_chroma import Chroma

COLLECTION_NAME = "test_collection"
PERSIST_DIR = "/Users/sunyulong/Codes/vector_store"

db = Chroma(
    collection_name=COLLECTION_NAME,
    persist_directory=PERSIST_DIR
)

print("=== Chroma get() 全量 ===")
all_data = db.get()
print(all_data)

print("\n=== Chroma get(where={'doc_id': 1}) ===")
try:
    data_by_int = db.get(where={"doc_id": 1})
    print(data_by_int)
except Exception as e:
    print(f"where doc_id=1 查询报错: {e}")

print("\n=== Chroma get(where={'doc_id': '1'}) ===")
try:
    data_by_str = db.get(where={"doc_id": "1"})
    print(data_by_str)
except Exception as e:
    print(f"where doc_id='1' 查询报错: {e}") 