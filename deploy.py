import os
import json
import uuid
import ssl
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
EXCLUDE_FILES = {".DS_Store", "deploy.py", "package-lock.json"}


def deploy():
    print(f"Connecting to {HOST}:{PORT} via secure cPanel HTTPS...")
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

    with opener.open(req, timeout=15) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        if res.get("status") != 1:
            raise RuntimeError(f"Login failed: {res}")
        sec_token = res.get("security_token")

    print(f"Logged in successfully! Token: {sec_token}\n")

    uploaded_count = 0

    for root, dirs, files in os.walk(LOCAL_ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]

        rel_dir = os.path.relpath(root, LOCAL_ROOT)
        remote_dir = REMOTE_ROOT if rel_dir == "." else f"{REMOTE_ROOT}/{rel_dir}"

        for file in files:
            if file in EXCLUDE_FILES or file.startswith("."):
                continue

            local_file_path = os.path.join(root, file)
            print(f"Uploading: {rel_dir}/{file} -> {remote_dir}/{file}")

            boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
            with open(local_file_path, "rb") as f:
                file_bytes = f.read()

            body = bytearray()
            body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="dir"\r\n\r\n{remote_dir}\r\n'.encode())
            body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\n1\r\n'.encode())
            body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="file-1"; filename="{file}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode())
            body.extend(file_bytes)
            body.extend(f"\r\n--{boundary}--\r\n".encode())

            upload_url = f"https://{HOST}:{PORT}{sec_token}/execute/Fileman/upload_files"
            upload_req = urllib.request.Request(
                upload_url,
                data=body,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
            )

            with opener.open(upload_req, timeout=30) as r:
                upload_res = json.loads(r.read().decode("utf-8"))
                if upload_res.get("status") != 1:
                    print(f"  Warning: upload response for {file}: {upload_res}")

            uploaded_count += 1

    print(f"\nDone! Successfully deployed {uploaded_count} files to {HOST}/{REMOTE_ROOT} via HTTPS.")


if __name__ == "__main__":
    deploy()
