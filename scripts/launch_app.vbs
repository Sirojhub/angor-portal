Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")

' Application root directory
strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strRootDir = objFSO.GetAbsolutePathName(strScriptDir & "\..")

' Function to check if server on port 3000 is listening
Function IsServerRunning()
    On Error Resume Next
    Set objHTTP = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    objHTTP.open "GET", "http://localhost:3000/api/health", False
    objHTTP.setTimeouts 1000, 1000, 1000, 1000
    objHTTP.send
    If Err.Number = 0 Then
        IsServerRunning = True
    Else
        Err.Clear
        objHTTP.open "GET", "http://localhost:3000", False
        objHTTP.setTimeouts 1000, 1000, 1000, 1000
        objHTTP.send
        If Err.Number = 0 Then
            IsServerRunning = True
        Else
            IsServerRunning = False
        End If
    End If
    On Error GoTo 0
End Function

' Start server if not running
If Not IsServerRunning() Then
    ' Start node server silently (WindowStyle = 0 hidden)
    strNodeCmd = "cmd /c cd /d """ & strRootDir & """ && set PATH=%PATH%;C:\Program Files\nodejs && node server/index.js"
    objShell.Run strNodeCmd, 0, False
    
    ' Wait up to 5 seconds for server to start
    For i = 1 To 10
        WScript.Sleep 500
        If IsServerRunning() Then Exit For
    Next
End If

' Locate MS Edge or Chrome executable
strBrowserExe = ""

strEdgeX86 = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
strEdgeX64 = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
strChromeX64 = "C:\Program Files\Google\Chrome\Application\chrome.exe"
strChromeX86 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

If objFSO.FileExists(strEdgeX86) Then
    strBrowserExe = strEdgeX86
ElseIf objFSO.FileExists(strEdgeX64) Then
    strBrowserExe = strEdgeX64
ElseIf objFSO.FileExists(strChromeX64) Then
    strBrowserExe = strChromeX64
ElseIf objFSO.FileExists(strChromeX86) Then
    strBrowserExe = strChromeX86
End If

If strBrowserExe <> "" Then
    ' Launch in standalone App Mode
    strAppCmd = """" & strBrowserExe & """ --app=http://localhost:3000"
    objShell.Run strAppCmd, 1, False
Else
    ' Fallback to default browser
    objShell.Run "http://localhost:3000", 1, False
End If
