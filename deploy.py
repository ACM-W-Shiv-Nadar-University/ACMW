import os
import ftplib

FTP_HOST = "acmwsnu.hosting.acm.org"
FTP_USER = "acmwsnuhosting"
FTP_PASS = "8*PT%d0mSuk91c!&SwwUk#"
REMOTE_ROOT = "public_html"
LOCAL_ROOT = os.path.dirname(os.path.abspath(__file__))

EXCLUDE_DIRS = {".git", ".idea", ".vscode", "node_modules", "scratch"}
EXCLUDE_FILES = {".DS_Store", "deploy.py", "package-lock.json"}

def deploy():
    print(f"Connecting to {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST, timeout=30)
    ftp.login(FTP_USER, FTP_PASS)
    print("Connected successfully!\n")

    def ensure_remote_dir(path):
        parts = [p for p in path.split("/") if p]
        current = ""
        for part in parts:
            current += "/" + part
            try:
                ftp.cwd(current)
            except Exception:
                try:
                    ftp.mkd(current)
                except Exception:
                    pass

    uploaded_count = 0

    for root, dirs, files in os.walk(LOCAL_ROOT):
        # Filter excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]

        rel_dir = os.path.relpath(root, LOCAL_ROOT)
        remote_dir = REMOTE_ROOT if rel_dir == "." else f"{REMOTE_ROOT}/{rel_dir}"

        ensure_remote_dir(remote_dir)
        ftp.cwd("/" + remote_dir)

        for file in files:
            if file in EXCLUDE_FILES or file.startswith("."):
                continue

            local_file_path = os.path.join(root, file)
            print(f"Uploading: {rel_dir}/{file} -> {remote_dir}/{file}")
            with open(local_file_path, "rb") as f:
                ftp.storbinary(f"STOR {file}", f)
            uploaded_count += 1

    ftp.quit()
    print(f"\nDone! Successfully deployed {uploaded_count} files to {FTP_HOST}/{REMOTE_ROOT}")

if __name__ == "__main__":
    deploy()
