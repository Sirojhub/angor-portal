$WScriptShell = New-Object -ComObject WScript.Shell
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "Angor Agro Star Portal.lnk"

$rootDir = (Resolve-Path "$PSScriptRoot\..").ProviderPath
$vbsLauncher = Join-Path $rootDir "scripts\launch_app.vbs"
$icoPath = Join-Path $rootDir "app.ico"

$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "C:\Windows\System32\wscript.exe"
$shortcut.Arguments = "`"$vbsLauncher`""
$shortcut.WorkingDirectory = $rootDir
$shortcut.IconLocation = "$icoPath, 0"
$shortcut.Description = "Angor Agro Star Enterprise Portal - Rabochiy Stol Ilovasi"
$shortcut.Save()

Write-Host "Desktop shortcut created successfully!"
Write-Host "Shortcut Location: $shortcutPath"
Write-Host "Icon Location: $icoPath"
