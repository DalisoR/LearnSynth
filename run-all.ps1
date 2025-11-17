# ---------------------------------------------------------
# RUN-ALL SCRIPT FOR REACT + NODE + NGROK (WINDOWS)
# ---------------------------------------------------------

Write-Host "Stopping old ngrok processes..." -ForegroundColor Yellow
taskkill /IM ngrok.exe /F 2>$null

Start-Sleep -Seconds 1

Write-Host "`nStarting Backend (port 4000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "cd 'C:\Users\PATRICIA\Desktop\learnsynth\backend'; npm run dev"

Write-Host "Starting Frontend (port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "cd 'C:\Users\PATRICIA\Desktop\learnsynth\frontend'; npm run dev"

Write-Host "`nWaiting 3 seconds for servers to initialize..."
Start-Sleep -Seconds 3

Write-Host "Starting NGROK tunnel for BACKEND (4000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "ngrok http 4000"

Write-Host "Starting NGROK tunnel for FRONTEND (5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "ngrok http 5173"

Write-Host "`nOpening Ngrok Dashboard (http://127.0.0.1:4040)" -ForegroundColor Magenta
Start-Process "http://127.0.0.1:4040"

Write-Host "`n✔ All services are running!"
Write-Host "-------------------------------------------"
Write-Host "BACKEND:  http://localhost:4000"
Write-Host "FRONTEND: http://localhost:5173"
Write-Host "NGROK Dashboard: http://127.0.0.1:4040"
Write-Host "-------------------------------------------" -ForegroundColor Yellow
