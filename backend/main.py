from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
import redis
import os
import json

app = FastAPI(title="CRUD App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "db"),
        database=os.getenv("DB_NAME", "cruddb"),
        user=os.getenv("DB_USER", "cruduser"),
        password=os.getenv("DB_PASSWORD", "crudpass")
    )

def get_redis():
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "redis"),
        port=6379,
        decode_responses=True
    )

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE
        )
    """)
    conn.commit()
    cur.close()
    conn.close()

@app.on_event("startup")
def startup():
    init_db()

class Item(BaseModel):
    title: str
    description: Optional[str] = ""
    is_active: Optional[bool] = True

class ItemResponse(Item):
    id: int

@app.get("/health")
def health():
    return {"status": "ok", "service": "backend"}

@app.get("/items/", response_model=List[ItemResponse])
def list_items():
    r = get_redis()
    cached = r.get("items_list")
    if cached:
        return json.loads(cached)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, title, description, is_active FROM items ORDER BY id")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    items = [{"id": r[0], "title": r[1], "description": r[2], "is_active": r[3]} for r in rows]
    r.set("items_list", json.dumps(items), ex=60)
    return items

@app.post("/items/", response_model=ItemResponse)
def create_item(item: Item):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO items (title, description, is_active) VALUES (%s, %s, %s) RETURNING id",
        (item.title, item.description, item.is_active)
    )
    item_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    get_redis().delete("items_list")
    return {"id": item_id, **item.dict()}

@app.get("/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, title, description, is_active FROM items WHERE id=%s", (item_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"id": row[0], "title": row[1], "description": row[2], "is_active": row[3]}

@app.put("/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item: Item):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE items SET title=%s, description=%s, is_active=%s WHERE id=%s RETURNING id",
        (item.title, item.description, item.is_active, item_id)
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    get_redis().delete("items_list")
    return {"id": item_id, **item.dict()}

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM items WHERE id=%s RETURNING id", (item_id,))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    get_redis().delete("items_list")
    return {"message": "Item deleted"}
