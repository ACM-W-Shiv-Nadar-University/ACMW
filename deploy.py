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

HOST = "acmwsnu.hosting.acm.org"
PORT = 2083
USER = "acmwsnuhosting"
PASS = "8*PT%d0mSuk91c!&SwwUk#"
REMOTE_ROOT = "public_html"
LOCAL_ROOT = os.path.dirname(os.path.abspath(__file__))

EXCLUDE_DIRS = {".git", ".idea", ".vscode", "node_modules", "scratch"}
EXCLUDE_FILES = {".DS_Store", "deploy.py", "package-lock.json", "deploy_bundle.zip"}


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
    # Primary web files that drive the application
    core_files = ["index.html", "events.html", "team.html", "style.css", "index.js", "team.css", "CNAME"]
    
    # Get modified/added files from git
    try:
        git_cmd = ["git", "diff", "--name-only", "HEAD~1", "HEAD"]
        out = subprocess.check_output(git_cmd, cwd=LOCAL_ROOT).decode().strip().split("\n")
        git_files = [f.strip() for f in out if f.strip() and not f.strip().endswith("deploy.py")]
    except Exception:
        git_files = []

    # Combined set of files
    all_targets = set(core_files + git_files)
    
    # Ensure all new lib files are included
    for root, dirs, files in os.walk(os.path.join(LOCAL_ROOT, "lib")):
        for f in files:
            rel = os.path.relpath(os.path.join(root, f), LOCAL_ROOT)
            if "hero_bg" in f or "bg-pattern" in f:
                all_targets.add(rel)

    return sorted(list(all_targets))


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
    zip_path = os.path.join(LOCAL_ROOT, "deploy_bundle.zip")
    try:
        create_zip_bundle(zip_path)
        print(f"Connecting to {HOST}:{PORT} via cPanel...")
        opener, sec_token = get_session()
        print(f"Logged in successfully! Token: {sec_token}\n")

        upload_file(opener, sec_token, zip_path, REMOTE_ROOT)
        extract_remote_zip(opener, sec_token, REMOTE_ROOT, "deploy_bundle.zip")
        delete_remote_file(opener, sec_token, REMOTE_ROOT, "deploy_bundle.zip")
        print("\n=======================================================")
        print(f"🎉 WEBSITE DEPLOYED TO PRODUCTION SUCCESSFULLY!")
        print(f"   URL: https://{HOST}/")
        print("=======================================================")
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)


if __name__ == "__main__":
    deploy()



