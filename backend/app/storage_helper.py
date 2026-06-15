import os
import uuid
import requests
from fastapi import UploadFile
from app.config import settings

UPLOAD_DIR = "uploads"

# Ensure local upload dir exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

def upload_receipt_file(file: UploadFile) -> str:
    """
    Uploads file to Supabase Storage if configured; otherwise saves locally.
    Returns the URL/path to access the uploaded file.
    """
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    # Try uploading to Supabase Storage if configuration is present
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            # Prepare API headers
            url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET}/{unique_filename}"
            headers = {
                "Authorization": f"Bearer {settings.SUPABASE_KEY}",
                "apikey": settings.SUPABASE_KEY
            }
            
            # Read file content
            content = file.file.read()
            
            # Upload request
            response = requests.post(url, headers=headers, data=content, files={"file": (unique_filename, content, file.content_type)})
            
            if response.status_code == 200:
                # Return public URL of the uploaded image
                return f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.SUPABASE_BUCKET}/{unique_filename}"
            else:
                print(f"Supabase upload failed: {response.text}. Saving locally instead.")
        except Exception as e:
            print(f"Supabase upload error: {e}. Saving locally instead.")
            
    # Local fallback
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    # Reset file pointer since we might have read it for Supabase
    file.file.seek(0)
    
    with open(file_path, "wb") as f:
        f.write(file.file.read())
        
    # In production/deployment, we return the relative path or host URL
    # We will serve this folder statically from FastAPI under /uploads
    return f"/uploads/{unique_filename}"
