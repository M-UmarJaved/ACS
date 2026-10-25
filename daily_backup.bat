@echo off
echo ====================================
echo   ACS Database Backup - %date% %time%
echo ====================================
cd /d "%~dp0"
node src/scripts/backup_database.js
echo ====================================
echo   Backup Complete
echo ====================================
