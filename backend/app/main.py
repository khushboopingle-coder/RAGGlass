import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .database import engine, Base
from .routes import auth, projects, documents, query, ollama

load_dotenv()

# Initialize Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RAGGlass API",
    description="Local RAG Observability Backend API",
    version="1.0.0"
)

# Dynamic CORS Configuration from environment settings
raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
if raw_origins.strip() == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(query.router)
app.include_router(ollama.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app": "RAGGlass",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

