@echo off
set "NODE_VERSION=node"
for /f "delims=" %%x in ('%NODE_VERSION% -v') do set "NODE_VERSION=%%x"

if "%NODE_VERSION%" == "node is not recognized as an internal or external command, operable program or batch file." (
    echo Node.js is not installed.
) else (
    if "%NODE_VERSION:~1,5%" == "8.6.0" (
      node npm\node_modules\ember-cli\bin\ember clean-tmp & node npm\node_modules\ember-cli\bin\ember serve
      echo Local IP:
      ipconfig | findstr "IPv4"
      echo Public IP:
      nslookup myip.opendns.com resolver1.opendns.com
      pause
    ) else (
        echo Node.js 8.6.0 is not installed. The current version is %NODE_VERSION%
    )
)



