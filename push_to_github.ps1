# ==============================================================================
# ACS Enterprise DW & BI - Reliable Non-Hanging Git Push Script for Windows
# Root Cause Fix:
#   1. Multiple GitHub accounts in Windows Credential Manager (M-UmarJaved,
#      software-house-ai, umarjaved190) cause Git Credential Manager to hang
#      waiting for an account-picker dialog when no username is bound.
#   2. Binding `credential.https://github.com.username = M-UmarJaved` and using
#      `https://M-UmarJaved@github.com/M-UmarJaved/ACS.git` selects the cached
#      token automatically with zero interactive prompts.
#   3. Configures HTTP/1.1 & 500MB postBuffer to prevent OpenSSL stream stalls.
#   4. Verifies .env files are ignored and no secrets are staged.
# ==============================================================================
param(
    [string]$CommitMessage = "Update ACS Enterprise Data Warehouse, BI OLAP & ERP Suite",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "1. Configuring Git account binding & anti-hang network settings..." -ForegroundColor Cyan
git config credential.https://github.com.username M-UmarJaved
git config http.postBuffer 524288000
git config http.maxRequestBuffer 100M
git config http.version HTTP/1.1
git config core.compression 0
git config http.lowSpeedLimit 1000
git config http.lowSpeedTime 60

$remoteUrl = "https://M-UmarJaved@github.com/M-UmarJaved/ACS.git"
$existingRemotes = git remote
if ($existingRemotes -contains "origin") {
    git remote set-url origin $remoteUrl
} else {
    git remote add origin $remoteUrl
}

$env:GIT_TERMINAL_PROMPT = "0"
$env:GCM_INTERACTIVE = "never"

Write-Host "2. Staging project files (respecting .gitignore)..." -ForegroundColor Cyan
git add -A

# Ensure .env is never staged
$stagedFiles = git diff --cached --name-only
if ($stagedFiles -match "^\.env(\..+)?$" -and $stagedFiles -notmatch "^\.env\.example$") {
    git reset HEAD .env*
    throw "ABORTED: Attempted to stage a .env file!"
}

$status = git status --porcelain
if ($status) {
    Write-Host "3. Creating commit: $CommitMessage" -ForegroundColor Cyan
    git commit -m "$CommitMessage"
    if ($LASTEXITCODE -ne 0) { throw "git commit failed with exit code $LASTEXITCODE" }
} else {
    Write-Host "3. Working tree is clean (no new local changes to commit)." -ForegroundColor Yellow
}

Write-Host "4. Pushing to origin/main ($remoteUrl)..." -ForegroundColor Cyan
if ($Force) {
    git push -f -u origin main --porcelain
} else {
    git push -u origin main --porcelain
}
if ($LASTEXITCODE -ne 0) {
    throw "git push failed with exit code $LASTEXITCODE"
}

Write-Host "SUCCESS: All code pushed to https://github.com/M-UmarJaved/ACS.git" -ForegroundColor Green
