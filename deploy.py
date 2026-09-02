import os
import json
import uuid
import ssl
import time
import zipfile
import subprocess
import http.cookiejar
import urllib.request
import urllib.parse

LOCAL_ROOT = os.path.dirname(os.path.abspath(__file__))

# Load local .env file if present
env_file = os.path.join(LOCAL_ROOT, ".env")
if os.path.exists(env_file):
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("\"'"))

HOST = os.environ.get("CPANEL_HOST", "acmwsnu.hosting.acm.org")
PORT = int(os.environ.get("CPANEL_PORT", 2083))
USER = os.environ.get("CPANEL_USER", "")
PASS = os.environ.get("CPANEL_PASS", "")
REMOTE_ROOT = os.environ.get("CPANEL_REMOTE_ROOT", "public_html")

if not USER or not PASS:
    import sys
    print("❌ Error: Deployment credentials missing!")
    print("Please create a .env file (excluded from git) with:")
    print("  CPANEL_USER=your_user")
    print("  CPANEL_PASS=your_password")
    print("Or export CPANEL_USER and CPANEL_PASS environment variables.")
    sys.exit(1)

EXCLUDE_DIRS = {".git", ".idea", ".vscode", "node_modules", "scratch"}
EXCLUDE_FILES = {".DS_Store", "deploy.py", "package-lock.json", "deploy_bundle.zip", ".env"}


def get_session():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=ctx),
        urllib.request.HTTPCookieProcessor(cj)
    )

    login_data = urllib.parse.urlencode({"user": USER, "pass": PASS}).encode("utf-8")
    req = urllib.request.Request(f"https://{HOST}:{PORT}/login/?login_only=1", data=login_data)

    with opener.open(req, timeout=25) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        if res.get("status") != 1:
            raise RuntimeError(f"Login failed: {res}")
        sec_token = res.get("security_token")

    return opener, sec_token


def get_target_files():
    targets = set()
    
    # 1. All root-level web files
    for f in os.listdir(LOCAL_ROOT):
        full_p = os.path.join(LOCAL_ROOT, f)
        if os.path.isfile(full_p):
            if f.endswith((".html", ".css", ".js", ".json")) or f == "CNAME":
                if f not in EXCLUDE_FILES:
                    targets.add(f)

    # 2. Files changed across recent git commits (up to 10 back)
    try:
        git_cmd = ["git", "diff", "--name-only", "HEAD~10", "HEAD"]
        out = subprocess.check_output(git_cmd, cwd=LOCAL_ROOT).decode().strip().split("\n")
        for f in out:
            f = f.strip()
            if f and not f.endswith("deploy.py") and not f.startswith("."):
                targets.add(f)
    except Exception:
        pass

    # 3. Include all lib assets that were created or modified
    for root, dirs, files in os.walk(os.path.join(LOCAL_ROOT, "lib")):
        for f in files:
            if not f.startswith("."):
                rel = os.path.relpath(os.path.join(root, f), LOCAL_ROOT)
                # If it's a known background/newly added asset
                if any(k in f for k in ["hero_bg", "bg-pattern", "newbg", "levelup_buildathon"]):
                    targets.add(rel)

    # Filter out hidden or excluded files
    filtered = [
        t for t in targets
        if not os.path.basename(t).startswith(".")
        and os.path.basename(t) not in EXCLUDE_FILES
        and not any(part in EXCLUDE_DIRS for part in t.split(os.sep))
    ]
    return sorted(filtered)


def create_zip_bundle(zip_path):
    print("Preparing deployment bundle...")
    target_files = get_target_files()
    count = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for rel_path in target_files:
            full_path = os.path.join(LOCAL_ROOT, rel_path)
            if os.path.exists(full_path) and os.path.isfile(full_path):
                print(f"  + Packing: {rel_path}")
                zf.write(full_path, rel_path)
                count += 1
    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"\nCreated bundle: {count} files ({size_mb:.2f} MB)\n")
    return count


def upload_file(opener, sec_token, local_path, remote_dir):
    filename = os.path.basename(local_path)
    print(f"Uploading {filename} to {remote_dir} via secure HTTPS...")
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    with open(local_path, "rb") as f:
        file_bytes = f.read()

    body = bytearray()
    body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="dir"\r\n\r\n{remote_dir}\r\n'.encode())
    body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\n1\r\n'.encode())
    body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="file-1"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode())
    body.extend(file_bytes)
    body.extend(f"\r\n--{boundary}--\r\n".encode())

    upload_url = f"https://{HOST}:{PORT}{sec_token}/execute/Fileman/upload_files"
    upload_req = urllib.request.Request(
        upload_url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )

    with opener.open(upload_req, timeout=90) as r:
        upload_res = json.loads(r.read().decode("utf-8"))
        if upload_res.get("status") != 1:
            raise RuntimeError(f"Upload failed: {upload_res}")
    print(f"Upload complete!")


def extract_remote_zip(opener, sec_token, remote_dir, zip_filename):
    print(f"Extracting {zip_filename} inside {remote_dir}...")
    extract_params = urllib.parse.urlencode({
        "dir": remote_dir,
        "file": zip_filename,
        "overwrite": 1
    }).encode("utf-8")

    extract_url = f"https://{HOST}:{PORT}{sec_token}/execute/Fileman/extract_files"
    req = urllib.request.Request(extract_url, data=extract_params)

    with opener.open(req, timeout=60) as r:
        res = json.loads(r.read().decode("utf-8"))
        print(f"Extraction result: status={res.get('status')}")


def delete_remote_file(opener, sec_token, remote_dir, filename):
    try:
        del_params = urllib.parse.urlencode({
            "dir": remote_dir,
            "file": filename
        }).encode("utf-8")
        del_url = f"https://{HOST}:{PORT}{sec_token}/execute/Fileman/delete_files"
        req = urllib.request.Request(del_url, data=del_params)
        with opener.open(req, timeout=30) as r:
            pass
    except Exception:
        pass


def deploy():
    target_files = get_target_files()
    print(f"Connecting to {HOST}:{PORT} via cPanel...")
    opener, sec_token = get_session()
    print(f"Logged in successfully! Token: {sec_token}\n")

    print(f"Deploying {len(target_files)} target files...")
    for rel_path in target_files:
        local_path = os.path.join(LOCAL_ROOT, rel_path)
        if not os.path.exists(local_path) or not os.path.isfile(local_path):
            continue

        rel_dir = os.path.dirname(rel_path)
        remote_dir = f"{REMOTE_ROOT}/{rel_dir}".rstrip("/") if rel_dir else REMOTE_ROOT
        upload_file(opener, sec_token, local_path, remote_dir)

    print("\n=======================================================")
    print(f"🎉 WEBSITE DEPLOYED TO PRODUCTION SUCCESSFULLY!")
    print(f"   URL: https://{HOST}/")
    print(f"   Custom Domain: https://acmwsnu.acm.org/")
    print("=======================================================")


if __name__ == "__main__":
    deploy()



