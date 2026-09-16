from dotenv import load_dotenv
import os

from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("URL:", url)
print("KEY EXISTS:", bool(key))
print("KEY PREFIX:", key[:12] if key else "EMPTY")
print("KEY LENGTH:", len(key) if key else 0)

try:
    client = create_client(url, key)
    print("SUCCESS: Supabase client created")
except Exception as e:
    print("FAILED:", type(e).__name__)
    print("ERROR:", str(e))