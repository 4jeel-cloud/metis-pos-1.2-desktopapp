param (
    [string]$SourceImage = "..\main logo.png",
    [string]$OutputIco = "..\build\icon.ico",
    [int]$Size = 256
)

Add-Type -AssemblyName System.Drawing

$srcPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($PSScriptRoot, $SourceImage))
$outPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($PSScriptRoot, $OutputIco))
$outDir = [System.IO.Path]::GetDirectoryName($outPath)
if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

if (-not (Test-Path -LiteralPath $srcPath)) {
    Write-Host "Source image not found: $srcPath" -ForegroundColor Red
    exit 1
}

$src = [System.Drawing.Image]::FromFile($srcPath)
$bmp = New-Object System.Drawing.Bitmap($Size, $Size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, 0, 0, $Size, $Size)
$g.Dispose()
$src.Dispose()

$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()
$ms.Dispose()
$bmp.Dispose()

$fs = [System.IO.File]::Open($outPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]1)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([UInt16]1)
$bw.Write([UInt32]32)
$bw.Write([UInt32]$pngBytes.Length)
$bw.Write([UInt32]22)
$bw.Write($pngBytes)
$bw.Dispose()
$fs.Dispose()
Write-Host "Generated $Size`x$Size ICO at $outPath"
