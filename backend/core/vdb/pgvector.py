from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document
from .base import VectorDB
from common.schemas.worker import VectorDBCollectionConfig
from typing import List, Dict, Any, Optional
from langchain_postgres.v2.engine import PGEngine
from langchain_postgres.v2.vectorstores import PGVectorStore
from langchain_postgres import Column
import logging
import asyncpg


class PostgreSQLVectorDB(VectorDB):
    def __init__(self, embedding_function: Embeddings, config: VectorDBCollectionConfig):
        super().__init__(embedding_function, config)
        self._connection_string = self._build_connection_string(config.connection_config)
        self._engine = PGEngine.from_connection_string(url=self._connection_string)
        self._collection_name = config.collection_name or "langchain_collection"
        self._embedding_dim = config.embedding_dimension
        self._metadata_columns = getattr(config, "metadata_columns", [])
        self._client = None
        self.is_connected = False

    def _build_connection_string(self, db_config: Dict[str, Any]) -> str:
        """
        Build the PostgreSQL connection string for psycopg3 driver.
        """
        user = db_config.get("user")
        password = db_config.get("password")
        host = db_config.get("host", "localhost")
        port = db_config.get("port", 5432)
        db = db_config.get("db", db_config.get("database"))
        return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{db}"

    async def _check_id_column_exists(self):
        """
        Check if the id column exists in the target table.
        """
        try:
            conn = await asyncpg.connect(self._connection_string.replace("+psycopg", ""))
            query = f"SELECT column_name FROM information_schema.columns WHERE table_name = '{self._collection_name}' AND column_name = 'id'"
            result = await conn.fetch(query)
            await conn.close()
            return len(result) > 0
        except Exception as e:
            logging.error(f"Failed to check id column: {e}")
            return False

    async def connect(self):
        """
        Test database connection and initialize self._client for subsequent operations.
        """
        try:
            conn = await asyncpg.connect(self._connection_string.replace("+psycopg", ""))
            await conn.close()
            self._client = await PGVectorStore.create(
                engine=self._engine,
                table_name=self._collection_name,
                embedding_service=self.embedding_function,
                metadata_columns=self._metadata_columns,
                id_column="id",
            )
            self.is_connected = True
        except Exception as e:
            logging.error(f"PGVectorStore.connect failed: {e}")
            self.is_connected = False
            raise
        return self.is_connected

    async def disconnect(self) -> bool:
        """
        Disconnect the client (no explicit close needed for PGVector, just dereference).
        """
        logging.info(f"PostgreSQLVectorDB.disconnect: {self._client}")
        self._client = None
        self.is_connected = False
        return True

    async def health_check(self) -> bool:
        """
        Check if the client is connected.
        """
        return self.is_connected

    async def init_collection(self):
        """
        Initialize the vector table using langchain-postgres best practice, force id as UUID primary key.
        """
        from langchain_postgres import Column
        try:
            await self._engine.ainit_vectorstore_table(
                table_name=self._collection_name,
                vector_size=self._embedding_dim,
                metadata_columns=[Column(col, "TEXT") for col in self._metadata_columns],
                id_column=Column("id", "UUID"),
                metadata_json_column=Column("metadata", "JSONB"),
            )
        except Exception as e:
            logging.error(f"ainit_vectorstore_table failed: {e}")
            raise

    def check_permission(self, user_team_id: int) -> bool:
        """
        Check if the user has permission to access this collection.
        """
        if hasattr(self.config, "is_private") and self.config.is_private:
            return user_team_id == getattr(self.config, "team_id", None)
        return True

    async def get_statistics(self) -> Dict[str, Any]:
        """
        Return basic statistics for the vector database.
        """
        return {"is_connected": self.is_connected}

    def get_supported_features(self) -> Dict[str, bool]:
        """
        Return the supported features for the frontend display.
        """
        return {
            "add_documents": True,
            "add_texts": True,
            "similarity_search": True,
            "similarity_search_with_score": True,
            "delete": True,
            "as_retriever": True,
            "max_marginal_relevance_search": True,
            "filter": True,
            "hybrid_search": False,
            "pagination": True,
            "update_document": False,
            "statistics": True
        }

    def add_documents(self, documents: List[Document]) -> List[str]:
        """
        Add a list of Document objects to the vector store.
        """
        ids = [str(doc.metadata.get("id", None)) for doc in documents]
        return self._client.add_documents(documents, ids=ids)

    def add_texts(self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None) -> List[str]:
        """
        Add a list of texts with optional metadata to the vector store.
        """
        return self._client.add_texts(texts, metadatas=metadatas)

    def similarity_search(self, query: str, k: int = 4, **kwargs) -> List[Document]:
        """
        Perform a similarity search for the given query.
        """
        filter_ = kwargs.get("filter", None)
        return self._client.similarity_search(query, k=k, filter=filter_)

    def similarity_search_with_score(self, query: str, k: int = 4, **kwargs) -> List[tuple[Document, float]]:
        """
        Perform a similarity search and return documents with their similarity scores.
        """
        filter_ = kwargs.get("filter", None)
        return self._client.similarity_search_with_score(query, k=k, filter=filter_)

    def similarity_search_with_relevance_scores(self, query: str, k: int = 4, **kwargs) -> list[tuple[Document, float]]:
        """
        Perform a similarity search and return documents with their relevance scores.
        """
        filter_ = kwargs.get("filter", None)
        return self._client.similarity_search_with_relevance_scores(query, k=k, filter=filter_)

    def delete(self, ids: List[str]) -> None:
        """
        Delete documents from the vector store by their IDs.
        """
        self._client.delete(ids=ids)

    def as_retriever(self, **kwargs):
        """
        Return a retriever object for advanced retrieval operations.
        """
        return self._client.as_retriever(**kwargs)

    def max_marginal_relevance_search(self, query: str, k: int = 4, fetch_k: int = 20, lambda_mult: float = 0.5, **kwargs) -> List[Document]:
        """
        Perform maximal marginal relevance search for the given query.
        """
        filter_ = kwargs.get("filter", None)
        return self._client.max_marginal_relevance_search(query, k=k, fetch_k=fetch_k, lambda_mult=lambda_mult, filter=filter_)

    def filter(self, filter: Dict[str, Any], k: int = 4, **kwargs) -> List[Document]:
        """
        Filter documents by metadata and return the top k results.
        """
        return self._client.similarity_search("", k=k, filter=filter, **kwargs)

    def get(self, where: dict = None, include: list = None) -> dict:
        """
        Retrieve all document chunks matching the where condition using direct SQL query.
        Returns a dict with 'documents' and 'metadatas' lists.
        """
        import psycopg
        from psycopg.rows import dict_row
        # Parse connection string for psycopg
        conn_str = self._connection_string.replace('postgresql+psycopg://', 'postgresql://')
        table = self._collection_name
        filter_sql = ""
        params = []
        if where and 'doc_id' in where:
            filter_sql = "WHERE (metadata->>'doc_id')::text = %s"
            params.append(str(where['doc_id']))
        sql = f"SELECT content, metadata FROM {table} {filter_sql} ORDER BY (metadata->>'chunk_id')::int ASC"
        documents = []
        metadatas = []
        with psycopg.connect(conn_str, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                for row in cur.fetchall():
                    documents.append(row['content'])
                    metadatas.append(row['metadata'])
        return {"documents": documents, "metadatas": metadatas}

    @classmethod
    def from_texts(cls, texts, embedding, metadatas=None, **kwargs):
        """
        Not implemented for this VDB.
        """
        raise NotImplementedError("from_texts not implemented for this VDB")

    @classmethod
    def from_documents(cls, documents, embedding, **kwargs):
        """
        Not implemented for this VDB.
        """
        raise NotImplementedError("from_documents not implemented for this VDB")

    async def test_connection(self) -> bool:
        """
        Test only the database connection and table structure, do not instantiate client.
        Return True if connection is ok and table exists (id column present), else False.
        """
        import asyncpg
        try:
            conn = await asyncpg.connect(self._connection_string.replace("+psycopg", ""))
            # Check if table exists
            table_query = f"SELECT to_regclass('{self._collection_name}')"
            table_result = await conn.fetchval(table_query)
            if not table_result:
                await conn.close()
                return True  # Table not exist is allowed for test_connection
            # Check if id column exists
            id_query = f"SELECT column_name FROM information_schema.columns WHERE table_name = '{self._collection_name}' AND column_name = 'id'"
            id_result = await conn.fetch(id_query)
            await conn.close()
            return len(id_result) > 0
        except Exception as e:
            logging.error(f"test_connection failed: {e}")
            return False
