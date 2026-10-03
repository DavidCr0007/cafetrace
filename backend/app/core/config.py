from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CaféTrace IA"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/cafetrace"
    
    # Security & JWT
    SECRET_KEY: str = "cafetrace-default-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS — permitir el frontend en localhost y en la IP de red local
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.51:3000",
    ]

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
