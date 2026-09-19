$ErrorActionPreference = 'Stop'
$designRoot = $PSScriptRoot
$workspaceRoot = (Resolve-Path (Join-Path $designRoot '../../..')).Path
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path -LiteralPath $edgePath)) { throw 'Microsoft Edge executable was not found.' }
$profileRoot = Join-Path $workspaceRoot '.data/ui-design-render'
foreach ($number in 1..8) {
  $sourcePath = Join-Path $designRoot "boards/board-$number.html"
  $imagePath = Join-Path $designRoot "boards/board-$number.png"
  $sourceUri = ([System.Uri]$sourcePath).AbsoluteUri
  $arguments = @('--headless', '--disable-gpu', '--no-first-run', '--hide-scrollbars', "--user-data-dir=`"$profileRoot`"", "--screenshot=`"$imagePath`"", '--window-size=1320,2020', $sourceUri)
  $renderProcess = Start-Process -FilePath $edgePath -ArgumentList $arguments -WindowStyle Hidden -PassThru
  if (-not $renderProcess.WaitForExit(30000)) { throw "Rendering board $number exceeded 30 seconds. Process ID: $($renderProcess.Id)" }
  if (-not (Test-Path -LiteralPath $imagePath)) { throw "Board $number image is missing." }
  Write-Output "Rendered board-$number.png"
}
