# Project Starlight 🌟

**Self-hosted AI IT Assistant** for small business infrastructure on **TA2026** (Fedora 44).

Focused on Aruba Instant On, Synology NAS, SonicWall firewalls/VPN, and general IT automation.

## Core Stack
- Ollama + Open WebUI
- SD.Next (Intel Arc)
- ComfyUI / AnimateDiff
- n8n workflows
- Docker Compose

## Quick Start
```bash
docker compose up -d

---

### Block 3: Create .gitignore

```bash
cat > .gitignore << 'EOF'
# Project Starlight .gitignore

# Secrets
.env
*.env
secrets/

# Large AI files
*.gguf
*.safetensors
*.ckpt
*.pth
models/
ollama-models/
comfyui/models/
cache/

# Docker
volumes/
data/
docker-compose.override.yml

# Temp / IDE
__pycache__/
*.pyc
.DS_Store
.vscode/
.idea/

# Logs
*.log
logs/
