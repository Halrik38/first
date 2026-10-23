import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DATABASE_PATH = os.getenv("DATABASE_PATH", str(Path(__file__).with_name("desserts.db")))

DESSERTS = [
    ("tarte-citron", "Tarte au citron meringuée", "Une pâte sablée, un crémeux citron et une meringue légère.", 6.50, "photo-1519915028121-7d3463d20b13", "Tarte"),
    ("eclair-chocolat", "Éclair au chocolat", "Une crème onctueuse au chocolat dans une pâte délicate.", 4.80, "photo-1621303837174-89787a7d4729", "Éclair"),
    ("macarons", "Macarons assortis", "Six petits macarons fondants aux parfums de saison.", 8.00, "photo-1569864358642-9d1684040f43", "Macarons"),
    ("fraisier", "Fraisier gourmand", "Des fraises fraîches, une crème légère et une génoise moelleuse.", 7.50, "photo-1464195244916-405fa0a82545", "Fraisier"),
    ("millefeuille", "Mille-feuille vanille", "Un feuilletage croustillant et une crème généreuse à la vanille.", 6.90, "photo-1488477181946-6428a0291777", "Mille-feuille"),
    ("fondant", "Fondant au chocolat", "Un cœur intensément chocolaté, à savourer tout doucement.", 5.90, "photo-1606313564200-e75d5e30476c", "Fondant"),
]


def connect():
    path = Path(DATABASE_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    return db


def initialize_database():
    with connect() as db:
        db.execute("CREATE TABLE IF NOT EXISTS desserts (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, price_cents INTEGER NOT NULL, image_id TEXT NOT NULL, category TEXT NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, total_cents INTEGER NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id), dessert_id TEXT NOT NULL, name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price_cents INTEGER NOT NULL)")
        db.executemany("INSERT OR IGNORE INTO desserts VALUES (?, ?, ?, ?, ?, ?)", [(i, n, d, round(p * 100), im, c) for i, n, d, p, im, c in DESSERTS])


@asynccontextmanager
async def lifespan(_app):
    initialize_database()
    yield


app = FastAPI(title="Douce Heure — API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class OrderItem(BaseModel):
    dessert_id: str
    quantity: int = Field(ge=1, le=99)


class OrderRequest(BaseModel):
    items: list[OrderItem] = Field(min_length=1)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/desserts")
def list_desserts():
    with connect() as db:
        rows = db.execute("SELECT * FROM desserts ORDER BY rowid").fetchall()
    return [{**dict(row), "price": row["price_cents"] / 100, "image": f"https://images.unsplash.com/{row['image_id']}?auto=format&fit=crop&w=900&q=85"} for row in rows]


@app.post("/api/orders", status_code=201)
def create_order(order: OrderRequest):
    quantities = {}
    for item in order.items:
        quantities[item.dessert_id] = quantities.get(item.dessert_id, 0) + item.quantity
    with connect() as db:
        desserts = {row["id"]: row for row in db.execute("SELECT * FROM desserts").fetchall()}
        if any(dessert_id not in desserts for dessert_id in quantities):
            raise HTTPException(status_code=400, detail="Un dessert de votre panier est introuvable.")
        total = sum(desserts[key]["price_cents"] * quantity for key, quantity in quantities.items())
        cursor = db.execute("INSERT INTO orders (created_at, total_cents) VALUES (?, ?)", (datetime.now(timezone.utc).isoformat(), total))
        order_id = cursor.lastrowid
        db.executemany("INSERT INTO order_items (order_id, dessert_id, name, quantity, unit_price_cents) VALUES (?, ?, ?, ?, ?)", [(order_id, key, desserts[key]["name"], quantity, desserts[key]["price_cents"]) for key, quantity in quantities.items()])
    return {"id": order_id, "total": total / 100, "message": "Votre commande a bien été enregistrée. Merci pour votre gourmandise !"}


@app.get("/api/orders/{order_id}")
def get_order(order_id: int):
    with connect() as db:
        order = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if order is None:
            raise HTTPException(status_code=404, detail="Commande introuvable.")
        items = db.execute("SELECT dessert_id, name, quantity, unit_price_cents FROM order_items WHERE order_id = ?", (order_id,)).fetchall()
    return {"id": order["id"], "created_at": order["created_at"], "total": order["total_cents"] / 100, "items": [{**dict(item), "unit_price": item["unit_price_cents"] / 100} for item in items]}
