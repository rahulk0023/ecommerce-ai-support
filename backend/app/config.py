from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    database_url: str = "postgresql://postgres:password@localhost:5432/ecommerce_support"
    secret_key: str = "changeme-in-production-please"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # refund thresholds
    max_auto_refund_amount: float = 5000.0
    return_window_days: int = 7


settings = Settings()

# when running locally outside Docker, swap the docker service host 'db' for 'localhost'
if "@db:" in settings.database_url and not os.path.exists("/.dockerenv"):
    settings.database_url = settings.database_url.replace("@db:", "@localhost:")
