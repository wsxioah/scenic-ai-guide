@echo off
set JAVA_HOME=C:\jdk17\jdk-17.0.19+10
set ANDROID_HOME=C:\android-sdk
set GRADLE_USER_HOME=C:\gradle
set PATH=%JAVA_HOME%\bin;%PATH%

echo === Build Start ===
echo JAVA_HOME=%JAVA_HOME%
echo ANDROID_HOME=%ANDROID_HOME%
echo NODE version:
node --version 2>&1
where node 2>&1

cd /d C:\scenic-app\mobile\android
C:\gradle\gradle-9.3.1\bin\gradle.bat assembleRelease --no-daemon --stacktrace
echo === Exit Code: %ERRORLEVEL% ===
