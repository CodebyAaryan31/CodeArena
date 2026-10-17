from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "CODEARENA"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "CHANGE_ME_use_openssl_rand_hex_32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./codearena.db"

    # Runner service (internal)
    RUNNER_BASE_URL: str = "http://localhost:8001"
    RUNNER_API_KEY: str = "CHANGE_ME_internal_key"

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Execution defaults
    DEFAULT_TIME_LIMIT_MS: int = 5000
    DEFAULT_MEMORY_LIMIT_MB: int = 256

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
