from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from urllib.parse import unquote, quote_plus
from app.config import settings

def make_safe_db_url(url: str) -> str:
    if not url.startswith("postgresql://") and not url.startswith("postgres://"):
        return url
        
    prefix = "postgresql://" if url.startswith("postgresql://") else "postgres://"
    remainder = url[len(prefix):]
    
    if '@' not in remainder:
        return url
        
    # Split by the last '@' to separate credentials from host details
    parts = remainder.rsplit('@', 1)
    creds = parts[0]
    host_details = parts[1]
    
    if ':' not in creds:
        return url
        
    user, pwd = creds.split(':', 1)
    
    # Strip literal enclosing single/double quotes if added for env escaping
    if (pwd.startswith("'") and pwd.endswith("'")) or (pwd.startswith('"') and pwd.endswith('"')):
        pwd = pwd[1:-1]
        
    decoded_password = unquote(pwd)
    encoded_password = quote_plus(decoded_password)
    
    return f"postgresql://{user}:{encoded_password}@{host_details}"

db_url = make_safe_db_url(settings.DATABASE_URL)

# Create engine and test connection; fall back to local SQLite if it fails
try:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as e:
    print(f"\n⚠️ PostgreSQL connection failed: {e}")
    print("Falling back to local SQLite database: family_tracker.db for local execution...\n")
    db_url = "sqlite:///./family_tracker.db"
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
