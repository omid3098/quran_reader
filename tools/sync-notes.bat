@echo off
title Quran Notes Sync
cd /d "d:\w\quran_reader"
echo Syncing Quran notes to GitHub...
echo.
bun run sync
if %errorlevel% neq 0 (
    echo.
    echo Sync failed! Press any key to close...
    pause >nul
) else (
    echo.
    echo Done! Closing in 3 seconds...
    timeout /t 3 >nul
)
