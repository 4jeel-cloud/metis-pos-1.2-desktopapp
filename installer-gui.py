#!/usr/bin/env python3
"""
MetisPOS Cross-Platform Installer GUI
Automates: clone, npm install, PHP download, and build for Windows/Linux/Mac
"""

import subprocess
import sys
import os
import threading
import json
import webbrowser
import shutil

try:
    import tkinter as tk
    from tkinter import ttk, messagebox, scrolledtext
except ImportError:
    print("tkinter not found. Install it: apt-get install python3-tk (Linux) or use Python from python.org (Windows/Mac)")
    sys.exit(1)

class RedirectText:
    def __init__(self, widget):
        self.widget = widget

    def write(self, text):
        self.widget.insert(tk.END, text)
        self.widget.see(tk.END)
        self.widget.update()

    def flush(self):
        pass


class InstallerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("MetisPOS - Installer & Builder")
        self.root.geometry("800x650")

        # Try main logo first, fall back to build/icon.ico
        base_dir = os.path.dirname(__file__)
        main_logo = os.path.join(base_dir, "main logo.png")
        icon_ico = os.path.join(base_dir, "build", "icon.ico")
        icon_path = main_logo if os.path.exists(main_logo) else icon_ico
        if os.path.exists(icon_path):
            try:
                if icon_path.endswith('.ico'):
                    self.root.iconbitmap(icon_path)
                else:
                    from PIL import Image, ImageTk
                    img = Image.open(icon_path).resize((64, 64))
                    self.root.iconphoto(True, ImageTk.PhotoImage(img))
            except Exception:
                pass

        self.work_dir = tk.StringVar(value=os.path.dirname(os.path.abspath(__file__)))
        self.repo_url = tk.StringVar(value="https://github.com/4jeel-cloud/metis-pos-1.2-desktopapp.git")
        self.clone_var = tk.BooleanVar(value=False)
        self.build_win = tk.BooleanVar(value=sys.platform == "win32")
        self.build_linux = tk.BooleanVar(value=sys.platform.startswith("linux"))
        self.build_mac = tk.BooleanVar(value=sys.platform == "darwin")
        self.running = False
        self.logo_photo = None

        self.create_widgets()

    def load_logo_image(self, parent, max_height=80):
        base_dir = os.path.dirname(__file__)
        logo_candidates = [
            os.path.join(base_dir, "main logo.png"),
            os.path.join(base_dir, "public", "svg", "metis-pos-logo.png"),
            os.path.join(base_dir, "build", "icon.ico"),
        ]
        logo_path = next((p for p in logo_candidates if os.path.exists(p)), None)
        if not logo_path:
            return None

        try:
            from PIL import Image, ImageTk
            img = Image.open(logo_path)
            ratio = max_height / img.height
            img = img.resize((int(img.width * ratio), max_height), Image.Resampling.LANCZOS)
            self.logo_photo = ImageTk.PhotoImage(img)
            label = ttk.Label(parent, image=self.logo_photo)
            label.pack(pady=(0, 8))
            return label
        except Exception:
            try:
                self.logo_photo = tk.PhotoImage(file=logo_path)
                label = ttk.Label(parent, image=self.logo_photo)
                label.pack(pady=(0, 8))
                return label
            except Exception:
                return None

    def create_widgets(self):
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)

        header = ttk.Frame(main_frame)
        header.pack(fill=tk.X, pady=(0, 10))
        self.load_logo_image(header)
        title = ttk.Label(header, text="MetisPOS Setup & Build Wizard",
                         font=("Helvetica", 16, "bold"))
        title.pack()

        # Notebook for tabs
        notebook = ttk.Notebook(main_frame)
        notebook.pack(fill=tk.BOTH, expand=True, pady=5)

        # === Tab 1: Configuration ===
        config_frame = ttk.Frame(notebook, padding="10")
        notebook.add(config_frame, text="Configuration")

        row = 0
        ttk.Label(config_frame, text="Step 1: Source Code").grid(row=row, column=0, sticky=tk.W, pady=5)
        row += 1
        ttk.Checkbutton(config_frame, text="Clone repository from GitHub",
                       variable=self.clone_var).grid(row=row, column=0, sticky=tk.W, pady=2)
        row += 1
        ttk.Label(config_frame, text="Repository URL:").grid(row=row, column=0, sticky=tk.W, pady=2)
        row += 1
        ttk.Entry(config_frame, textvariable=self.repo_url, width=80).grid(row=row, column=0, sticky=tk.EW, pady=2)
        row += 1
        ttk.Label(config_frame, text="").grid(row=row, column=0, pady=5)
        row += 1

        ttk.Label(config_frame, text="Step 2: Target Platforms").grid(row=row, column=0, sticky=tk.W, pady=5)
        row += 1
        plat_frame = ttk.Frame(config_frame)
        plat_frame.grid(row=row, column=0, sticky=tk.W, pady=5)
        ttk.Checkbutton(plat_frame, text="Windows (.exe installer + portable)",
                       variable=self.build_win).pack(anchor=tk.W, pady=2)
        ttk.Checkbutton(plat_frame, text="Linux (AppImage + .deb)",
                       variable=self.build_linux).pack(anchor=tk.W, pady=2)
        ttk.Checkbutton(plat_frame, text="macOS (.dmg)",
                       variable=self.build_mac).pack(anchor=tk.W, pady=2)
        row += 1

        ttk.Label(config_frame, text="").grid(row=row, column=0, pady=5)
        row += 1
        ttk.Label(config_frame, text="Step 3: Working Directory").grid(row=row, column=0, sticky=tk.W, pady=5)
        row += 1
        dir_frame = ttk.Frame(config_frame)
        dir_frame.grid(row=row, column=0, sticky=tk.EW, pady=2)
        ttk.Entry(dir_frame, textvariable=self.work_dir, width=70).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(dir_frame, text="Browse", command=self.browse_dir).pack(side=tk.RIGHT, padx=5)
        config_frame.columnconfigure(0, weight=1)

        # === Tab 2: Output ===
        output_frame = ttk.Frame(notebook, padding="10")
        notebook.add(output_frame, text="Progress & Logs")

        self.output_text = scrolledtext.ScrolledText(output_frame, wrap=tk.WORD,
                                                      font=("Consolas", 9), height=25)
        self.output_text.pack(fill=tk.BOTH, expand=True)

        # === Action Buttons ===
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=10)

        self.status_label = ttk.Label(btn_frame, text="Ready", foreground="gray")
        self.status_label.pack(side=tk.LEFT, padx=5)

        self.build_btn = ttk.Button(btn_frame, text="Start Build", command=self.start_build, width=20)
        self.build_btn.pack(side=tk.RIGHT, padx=5)

        ttk.Button(btn_frame, text="Open Output Folder",
                  command=self.open_output_folder).pack(side=tk.RIGHT, padx=5)

    def browse_dir(self):
        from tkinter import filedialog
        d = filedialog.askdirectory(title="Select working directory",
                                    initialdir=self.work_dir.get())
        if d:
            self.work_dir.set(d)

    def open_output_folder(self):
        d = self.work_dir.get()
        if os.path.exists(d):
            webbrowser.open(d)

    def log(self, msg):
        self.output_text.insert(tk.END, msg + "\n")
        self.output_text.see(tk.END)
        self.root.update()

    def run_cmd(self, cmd, cwd=None, shell=True):
        self.log(f"> {' '.join(cmd) if isinstance(cmd, list) else cmd}")
        proc = subprocess.Popen(
            cmd if isinstance(cmd, list) else cmd,
            shell=shell,
            cwd=cwd or self.work_dir.get(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        for line in iter(proc.stdout.readline, ""):
            if not line:
                break
            self.log(line.rstrip())
        proc.wait()
        return proc.returncode

    def check_dep(self, name, cmd, install_hint=""):
        try:
            subprocess.run(cmd if isinstance(cmd, list) else cmd,
                         shell=True, capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.log(f"[WARN] {name} not found. {install_hint}")
            return False

    def build_task(self):
        try:
            self.build_btn.config(state=tk.DISABLED, text="Running...")
            self.status_label.config(text="Running", foreground="blue")
            base = self.work_dir.get()

            # Check dependencies
            self.log("=" * 60)
            self.log("CHECKING DEPENDENCIES")
            self.log("=" * 60)

            node_ok = self.check_dep("Node.js", "node --version",
                "Install from https://nodejs.org")
            npm_ok = self.check_dep("npm", "npm --version",
                "Comes with Node.js")
            git_ok = self.check_dep("git", "git --version",
                "Install from https://git-scm.com")
            python_ok = self.check_dep("Python 3", "python3 --version" if sys.platform != "win32" else "python --version",
                "Install from https://python.org")
            composer_ok = self.check_dep("Composer", "composer --version",
                "Install from https://getcomposer.org")

            if not node_ok or not npm_ok:
                self.log("\n[ERROR] Node.js and npm are required. Aborting.")
                return

            # Clone if needed
            if self.clone_var.get():
                self.log("\n" + "=" * 60)
                self.log("CLONING REPOSITORY")
                self.log("=" * 60)
                repo = self.repo_url.get().strip()
                repo_name = repo.rstrip("/").split("/")[-1].replace(".git", "")
                target = os.path.join(base, os.path.basename(repo_name))
                if os.path.exists(target):
                    self.log(f"[SKIP] {target} already exists")
                else:
                    code = self.run_cmd(f"git clone --depth 1 \"{repo}\"", cwd=base)
                    if code != 0:
                        self.log("[ERROR] Clone failed")
                        return
                self.work_dir.set(target)
                base = target

            # Run npm install
            self.log("\n" + "=" * 60)
            self.log("INSTALLING NPM DEPENDENCIES")
            self.log("=" * 60)
            code = self.run_cmd("npm install", cwd=base)
            if code != 0:
                self.log("[ERROR] npm install failed")
                return

            if composer_ok:
                self.log("\n" + "=" * 60)
                self.log("INSTALLING PHP DEPENDENCIES (COMPOSER)")
                self.log("=" * 60)
                code = self.run_cmd("composer install --no-scripts", cwd=base)
                if code != 0:
                    self.log("[WARN] composer install --no-scripts failed, retrying full install...")
                code = self.run_cmd("composer install", cwd=base)
                if code != 0:
                    self.log("[ERROR] composer install failed")
                    return
            else:
                if not os.path.isdir(os.path.join(base, "vendor")):
                    self.log("\n[ERROR] Composer not found and vendor/ is missing. Aborting.")
                    return
                self.log("\n[SKIP] Composer not found, using existing vendor/")

            self.log("\n" + "=" * 60)
            self.log("BUILDING FRONTEND ASSETS")
            self.log("=" * 60)
            code = self.run_cmd("npm run build", cwd=base)
            if code != 0:
                self.log("[ERROR] npm run build failed")
                return

            self.log("\n" + "=" * 60)
            self.log("GENERATING INSTALLER ICON")
            self.log("=" * 60)
            icon_script = os.path.join(base, "scripts", "gen-icon.mjs")
            main_logo = os.path.join(base, "main logo.png")
            if os.path.exists(icon_script) and os.path.exists(main_logo):
                code = self.run_cmd("node scripts/gen-icon.mjs", cwd=base)
                if code != 0:
                    self.log("[WARN] Icon generation failed, continuing with existing icon...")
                else:
                    self.log("[OK] Installer icon generated")
            elif os.path.exists(os.path.join(base, "build", "icon.ico")):
                self.log("[OK] Using existing build/icon.ico")
            else:
                self.log("[WARN] No icon source found; installer may use default icon")

            # Build for each selected platform
            platforms = []
            if self.build_win.get():
                platforms.append(("win", "dist:win"))
            if self.build_linux.get():
                platforms.append(("linux", "dist:linux"))
            if self.build_mac.get():
                platforms.append(("mac", "dist:mac"))

            if not platforms:
                self.log("[WARN] No platforms selected")
                return

            # Clean old installers before building
            dist_dir = os.path.join(base, 'dist-electron')
            if os.path.exists(dist_dir):
                self.log(f"\nCleaning old installers from {dist_dir}...")
                shutil.rmtree(dist_dir)
                self.log("[OK] Old installers removed")

            for plat_name, npm_cmd in platforms:
                self.log("\n" + "=" * 60)
                self.log(f"BUILDING FOR {plat_name.upper()}")
                self.log("=" * 60)
                # dist:* scripts already clean and download PHP; run without prebuild to avoid double-clean
                code = self.run_cmd(f"node scripts/download-php.mjs {plat_name}", cwd=base)
                if code != 0:
                    self.log(f"[ERROR] PHP download for {plat_name} failed")
                    return
                builder_flag = {"win": "--win", "linux": "--linux", "mac": "--mac"}[plat_name]
                code = self.run_cmd(f"npx electron-builder {builder_flag}", cwd=base)
                if code != 0:
                    self.log(f"[WARN] Build for {plat_name} failed, continuing...")
                else:
                    self.log(f"[OK] Build for {plat_name} completed!")

            self.log("\n" + "=" * 60)
            self.log("ALL DONE!")
            self.log("=" * 60)
            self.log(f"\nOutput folder: {os.path.join(base, 'dist-electron')}")
            self.status_label.config(text="Completed", foreground="green")

        except Exception as e:
            self.log(f"\n[ERROR] {str(e)}")
            self.status_label.config(text="Error", foreground="red")
        finally:
            self.build_btn.config(state=tk.NORMAL, text="Start Build")
            self.running = False

    def start_build(self):
        if self.running:
            return
        self.running = True
        self.output_text.delete(1.0, tk.END)
        self.status_label.config(text="Running...", foreground="blue")
        t = threading.Thread(target=self.build_task, daemon=True)
        t.start()


if __name__ == "__main__":
    root = tk.Tk()
    app = InstallerGUI(root)
    root.mainloop()
