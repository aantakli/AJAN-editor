start cmd.exe /c startEditor.bat
start cmd.exe /c startReportService.bat
start cmd.exe /c startTestActionService.bat

echo Local IP:
ipconfig | findstr "IPv4"
echo Public IP:
nslookup myip.opendns.com resolver1.opendns.com
pause
