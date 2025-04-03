@echo off
echo Creating webapp directory in extension folder...
mkdir webapp 2>nul

echo Copying webapp files...
copy ..\webapp\index.html webapp\
copy ..\webapp\style.css webapp\
copy ..\webapp\script.js webapp\

echo Done!
pause 