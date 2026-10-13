import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
import app.models  # Asegura que los modelos se carguen para Base.metadata

logger = logging.getLogger(__name__)

app = FastAPI(
    title="CaféTrace IA API",
    description="API para el ecosistema de trazabilidad de café y e-commerce",
    version="0.1.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-IoT-Device", "X-IoT-Token"],
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
        # El detalle del driver puede contener host, usuario o partes de la URL.
        # Se conserva en el log del servidor, nunca en la respuesta pública.
        logger.exception("Database readiness check failed")
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "database": "unavailable"},
        ) from exc

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
