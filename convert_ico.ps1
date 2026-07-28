Add-Type -AssemblyName System.Drawing
$pngPath = "C:\Users\Vasquez\.gemini\antigravity\scratch\spotify-floating-widget\icon.png"
$icoPath = "C:\Users\Vasquez\.gemini\antigravity\scratch\spotify-floating-widget\icon.ico"

$bmp = [System.Drawing.Bitmap]::FromFile($pngPath)
$resized = New-Object System.Drawing.Bitmap($bmp, 256, 256)
$hIcon = $resized.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$stream = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Close()
$bmp.Dispose()
$resized.Dispose()
Write-Host "Generated native GDI+ Windows icon.ico successfully!"
