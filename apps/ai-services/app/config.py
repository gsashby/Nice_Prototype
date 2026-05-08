from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    anthropic_api_key: str = "placeholder"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_trust_center"
    redis_url: str = "redis://localhost:6379/0"
    allowed_origins: List[str] = ["http://localhost:3000"]
    ai_services_port: int = 8001

    model_config = {"env_file": ".env"}


settings = Settings()
