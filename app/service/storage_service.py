import boto3
import os
from botocore.client import Config

def get_minio_client():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("MINIO_URL"),
        aws_access_key_id=os.getenv("MINIO_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("MINIO_SECRET_KEY"),
        config=Config(signature_version="s3v4")
    )

def ensure_bucket_exists():
    client = get_minio_client()
    bucket = os.getenv("MINIO_BUCKET", "pdfs")
    existing = client.list_buckets()["Buckets"]
    names = [b["Name"] for b in existing]
    if bucket not in names:
        client.create_bucket(Bucket=bucket)
    
def upload_pdf(file_bytes: bytes, filename: str) -> str:
    ensure_bucket_exists()
    client = get_minio_client()
    bucket = os.getenv("MINIO_BUCKET", "pdfs")
    client.put_object(
        Bucket=bucket,
        Key=filename,
        Body=file_bytes,
        ContentType="application/pdf"
    )
    return filename

def download_pdf(storage_path: str) -> bytes:
    client = get_minio_client()
    bucket = os.getenv("MINIO_BUCKET", "pdfs")
    response = client.get_object(Bucket=bucket, Key=storage_path)
    return response["Body"].read()
