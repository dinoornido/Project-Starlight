import psycopg2
from psycopg2.extras import RealDictCursor, Json
from sentence_transformers import SentenceTransformer
import os
from datetime import datetime
from typing import List, Dict, Optional, Any

class LongTermMemory:
    def __init__(self, dbname="long_term_memory", user="dino", password="dino", host="localhost"):
        self.dbname = dbname
        self.user = user
        self.password = password
        self.host = host
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.create_schema()
        print("[LongTermMemory] Connected to PostgreSQL successfully.")

    def _get_connection(self):
        return psycopg2.connect(
            dbname=self.dbname,
            user=self.user,
            password=self.password,
            host=self.host
        )

    def create_schema(self):
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS facts (
                        id SERIAL PRIMARY KEY,
                        content TEXT NOT NULL,
                        embedding VECTOR(384),
                        metadata JSONB,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE IF NOT EXISTS episodes (
                        id SERIAL PRIMARY KEY,
                        summary TEXT NOT NULL,
                        full_content TEXT,
                        embedding VECTOR(384),
                        session_id TEXT,
                        metadata JSONB,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE IF NOT EXISTS entities (
                        id SERIAL PRIMARY KEY,
                        name TEXT UNIQUE NOT NULL,
                        type TEXT,
                        embedding VECTOR(384),
                        metadata JSONB
                    );
                    CREATE TABLE IF NOT EXISTS relations (
                        id SERIAL PRIMARY KEY,
                        source_id INTEGER REFERENCES entities(id),
                        target_id INTEGER REFERENCES entities(id),
                        relation_type TEXT,
                        metadata JSONB
                    );
                """)
            conn.commit()

    def generate_embedding(self, text: str) -> List[float]:
        return self.model.encode(text).tolist()

    # ==================== FACT METHODS ====================
    def add_fact(self, content: str, metadata: dict = None) -> int:
        embedding = self.generate_embedding(content)
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO facts (content, embedding, metadata)
                    VALUES (%s, %s, %s) RETURNING id
                """, (content, embedding, Json(metadata or {})))
                fact_id = cur.fetchone()[0]
            conn.commit()
        return fact_id

    def search_facts(self, query: str, limit: int = 5) -> List[Dict]:
        embedding = self.generate_embedding(query)
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, content, metadata, timestamp,
                           1 - (embedding <=> %s::vector) as similarity
                    FROM facts
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                """, (embedding, embedding, limit))
                return cur.fetchall()

    def semantic_search_facts(self, query: str, limit: int = 5) -> List[Dict]:
        return self.search_facts(query, limit)

    def delete_fact(self, fact_id: int) -> bool:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM facts WHERE id = %s", (fact_id,))
                deleted = cur.rowcount > 0
            conn.commit()
        return deleted

    def list_facts(self, limit: int = 20) -> List[Dict]:
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM facts ORDER BY timestamp DESC LIMIT %s", (limit,))
                return cur.fetchall()

    # ==================== EPISODE METHODS ====================
    def add_episode(self, summary: str, full_content: str = "", session_id: str = None, metadata: dict = None) -> int:
        embedding = self.generate_embedding(summary)
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO episodes (summary, full_content, embedding, session_id, metadata)
                    VALUES (%s, %s, %s, %s, %s) RETURNING id
                """, (summary, full_content, embedding, session_id, Json(metadata or {})))
                episode_id = cur.fetchone()[0]
            conn.commit()
        return episode_id

    def get_recent_episodes(self, limit: int = 10) -> List[Dict]:
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM episodes ORDER BY timestamp DESC LIMIT %s", (limit,))
                return cur.fetchall()

    def semantic_search_episodes(self, query: str, limit: int = 5) -> List[Dict]:
        embedding = self.generate_embedding(query)
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, summary, full_content, session_id, metadata, timestamp,
                           1 - (embedding <=> %s::vector) as similarity
                    FROM episodes
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                """, (embedding, embedding, limit))
                return cur.fetchall()

    def delete_episode(self, episode_id: int) -> bool:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM episodes WHERE id = %s", (episode_id,))
                deleted = cur.rowcount > 0
            conn.commit()
        return deleted

    def get_episode(self, episode_id: int) -> Optional[Dict]:
        """Retrieve full episode details by ID"""
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, summary, full_content, session_id, metadata, timestamp
                    FROM episodes 
                    WHERE id = %s
                """, (episode_id,))
                return cur.fetchone()

    def search_episodes_by_session(self, session_id: str) -> List[Dict]:
        """Get all episodes belonging to a specific session"""
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, summary, full_content, timestamp
                    FROM episodes 
                    WHERE session_id = %s
                    ORDER BY timestamp ASC
                """, (session_id,))
                return cur.fetchall()

    def list_episodes(self, limit: int = 20) -> List[Dict]:
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM episodes ORDER BY timestamp DESC LIMIT %s", (limit,))
                return cur.fetchall()

    # ==================== ENTITY & RELATION METHODS ====================
    def add_entity(self, name: str, entity_type: str = None, metadata: dict = None) -> int:
        embedding = self.generate_embedding(name)
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO entities (name, type, embedding, metadata)
                    VALUES (%s, %s, %s, %s) RETURNING id
                """, (name, entity_type, embedding, Json(metadata or {})))
                entity_id = cur.fetchone()[0]
            conn.commit()
        return entity_id

    def get_related_entities(self, entity_id: int) -> List[Dict]:
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT e.*, r.relation_type 
                    FROM entities e
                    JOIN relations r ON (r.target_id = e.id OR r.source_id = e.id)
                    WHERE r.source_id = %s OR r.target_id = %s
                """, (entity_id, entity_id))
                return cur.fetchall()

