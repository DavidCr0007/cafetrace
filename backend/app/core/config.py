from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CaféTrace IA"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/cafetrace"
    
    # Security & JWT
    # Nunca se entrega una clave utilizable desde el código fuente.
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    AUTH_RATE_LIMIT_ATTEMPTS: int = 5
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 60

    # Los orígenes son siempre una allowlist explícita, incluso en desarrollo.
    ENVIRONMENT: Literal["development", "test", "production"] = "development"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.51:3000",
    ]

    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_cors_origins(cls, origins: list[str]) -> list[str]:
        if not origins:
            raise ValueError("CORS_ORIGINS debe contener al menos un origen")
        if any(origin == "*" or "*" in origin for origin in origins):
            raise ValueError("CORS_ORIGINS no admite comodines")
        return [origin.rstrip("/") for origin in origins]

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.ENVIRONMENT == "production":
            if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY debe tener al menos 32 caracteres en producción")
            forbidden_development_origins = ("localhost", "127.0.0.1", "[::1]")
            if any(any(value in origin for value in forbidden_development_origins) for origin in self.CORS_ORIGINS):
                raise ValueError("CORS_ORIGINS de producción no puede incluir orígenes locales")
        return self

    # Pronóstico meteorológico usado como contexto para el módulo IoT.
    WEATHER_PROVIDER: str = "open-meteo"
    WEATHER_LOCATION_NAME: str = "Icononzo, Tolima, Colombia"
    WEATHER_LATITUDE: float = 4.1767
    WEATHER_LONGITUDE: float = -74.5325
    WEATHER_TIMEZONE: str = "America/Bogota"
    WEATHER_FORECAST_DAYS: int = 7
    WEATHER_CACHE_SECONDS: int = 900

    # Blockchain: disabled by default until a real RPC, contract and signer exist.
    BLOCKCHAIN_ENABLED: bool = False
    BLOCKCHAIN_RPC_URL: str = ""
    BLOCKCHAIN_CHAIN_ID: int = 80002
    BLOCKCHAIN_CONTRACT_ADDRESS: str = ""
    BLOCKCHAIN_PRIVATE_KEY: str = ""
    BLOCKCHAIN_CONFIRMATIONS: int = 1
    BLOCKCHAIN_TX_TIMEOUT_SECONDS: int = 120

    # IoT device authentication. Rotate this value outside source control.
    IOT_MAX_CLOCK_SKEW_SECONDS: int = 300

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
