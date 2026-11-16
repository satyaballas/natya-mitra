@echo off
REM Natya Mitra launcher - starts a small local web server and opens Microsoft Edge.
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  start "Natya Mitra server" /min python -m http.server 8000
) else (
  echo Python not found - trying Node's http-server instead...
  start "Natya Mitra server" /min npx --yes http-server -p 8000 -c-1
)
timeout /t 3 >nul
start msedge --start-fullscreen --autoplay-policy=no-user-gesture-required http://localhost:8000
