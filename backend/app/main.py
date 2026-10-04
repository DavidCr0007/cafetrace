from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
import app.models  # Asegura que los modelos se carguen para Base.metadata

app = FastAPI(
    title="CaféTrace IA API",
    description="API para el ecosistema de trazabilidad de café y e-commerce",
    version="0.1.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-IoT-Token"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "message": "CaféTrace IA API is running",
        "version": "0.1.0"
    }


@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    from sqlalchemy import text
    from app.core.database import engine
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ready", "database": "ok"}
    except Exception as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail={"status": "not_ready", "database": str(exc)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
